const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class PedidoController {
  // Criar pedido a partir do carrinho
  async createOrder(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { consumidor_id, endereco_entrega, observacoes } = req.body;

      if (!consumidor_id) {
        return res.status(400).json({ error: 'ID do consumidor é obrigatório' });
      }

      // Verificar se consumidor existe e está ativo
      const consumidorExists = await client.query(
        'SELECT id, tipo_usuario, is_ativo FROM usuarios WHERE id = $1',
        [consumidor_id]
      );

      if (consumidorExists.rows.length === 0) {
        return res.status(404).json({ error: 'Consumidor não encontrado' });
      }

      const consumidor = consumidorExists.rows[0];
      if (!consumidor.is_ativo) {
        return res.status(403).json({ error: 'Consumidor inativo' });
      }

      if (consumidor.tipo_usuario !== 'consumidor') {
        return res.status(403).json({ error: 'Usuário deve ser do tipo consumidor' });
      }

      // Buscar itens do carrinho
      const carrinhoResult = await client.query(`
        SELECT 
          c.produto_id, c.quantidade, c.preco_unitario,
          p.nome, p.preco, p.quantidade_estoque, p.produtor_id, p.is_ativo,
          u.nome_completo as produtor_nome, u.is_ativo as produtor_ativo
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN usuarios u ON p.produtor_id = u.id
        WHERE c.consumidor_id = $1
        ORDER BY p.produtor_id
      `, [consumidor_id]);

      if (carrinhoResult.rows.length === 0) {
        return res.status(400).json({ error: 'Carrinho vazio' });
      }

      // Validar produtos e estoque
      const itensInvalidos = [];
      const carrinhoItens = carrinhoResult.rows;

      for (const item of carrinhoItens) {
        if (!item.is_ativo || !item.produtor_ativo) {
          itensInvalidos.push({
            produto: item.nome,
            motivo: 'Produto ou produtor inativo'
          });
        }

        if (item.quantidade > item.quantidade_estoque) {
          itensInvalidos.push({
            produto: item.nome,
            motivo: `Estoque insuficiente. Disponível: ${item.quantidade_estoque}`
          });
        }

        // Verificar se o preço não mudou significativamente
        const diferencaPreco = Math.abs(item.preco_unitario - item.preco);
        if (diferencaPreco > 0.01) {
          itensInvalidos.push({
            produto: item.nome,
            motivo: 'Preço do produto foi alterado'
          });
        }
      }

      if (itensInvalidos.length > 0) {
        return res.status(400).json({
          error: 'Alguns itens do carrinho são inválidos',
          itens_invalidos: itensInvalidos
        });
      }

      // Criar endereço de entrega se fornecido
      let endereco_entrega_id = null;
      if (endereco_entrega) {
        const enderecoResult = await client.query(`
          INSERT INTO enderecos (cep, logradouro, numero, complemento, bairro, cidade, estado)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          endereco_entrega.cep,
          endereco_entrega.logradouro,
          endereco_entrega.numero,
          endereco_entrega.complemento || null,
          endereco_entrega.bairro,
          endereco_entrega.cidade,
          endereco_entrega.estado
        ]);
        endereco_entrega_id = enderecoResult.rows[0].id;
      }

      // Agrupar itens por produtor
      const pedidosPorProdutor = {};
      carrinhoItens.forEach(item => {
        if (!pedidosPorProdutor[item.produtor_id]) {
          pedidosPorProdutor[item.produtor_id] = {
            produtor_id: item.produtor_id,
            produtor_nome: item.produtor_nome,
            itens: [],
            valor_total: 0
          };
        }
        
        const subtotal = item.quantidade * item.preco;
        pedidosPorProdutor[item.produtor_id].itens.push({
          produto_id: item.produto_id,
          nome_produto: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          subtotal: subtotal
        });
        pedidosPorProdutor[item.produtor_id].valor_total += subtotal;
      });

      const pedidosCriados = [];

      // Criar um pedido para cada produtor
      for (const pedidoData of Object.values(pedidosPorProdutor)) {
        // Gerar número do pedido
        const numeroResult = await client.query('SELECT gerar_numero_pedido() as numero');
        const numero_pedido = numeroResult.rows[0].numero;

        // Criar pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (
            numero_pedido, consumidor_id, produtor_id, valor_total,
            endereco_entrega_id, observacoes
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, created_at
        `, [
          numero_pedido,
          consumidor_id,
          pedidoData.produtor_id,
          pedidoData.valor_total,
          endereco_entrega_id,
          observacoes || null
        ]);

        const pedido_id = pedidoResult.rows[0].id;

        // Criar itens do pedido
        for (const item of pedidoData.itens) {
          await client.query(`
            INSERT INTO itens_pedido (
              pedido_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            pedido_id,
            item.produto_id,
            item.nome_produto,
            item.preco_unitario,
            item.quantidade,
            item.subtotal
          ]);

          // Atualizar estoque
          await client.query(
            'UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2',
            [item.quantidade, item.produto_id]
          );
        }

        pedidosCriados.push({
          id: pedido_id,
          numero_pedido: numero_pedido,
          produtor_nome: pedidoData.produtor_nome,
          valor_total: pedidoData.valor_total,
          created_at: pedidoResult.rows[0].created_at
        });
      }

      // Limpar carrinho
      await client.query('DELETE FROM carrinho WHERE consumidor_id = $1', [consumidor_id]);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Pedidos criados com sucesso',
        pedidos: pedidosCriados
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      client.release();
    }
  }

  // Listar pedidos com filtros
  async getOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        consumidor_id,
        produtor_id,
        status_pedido,
        data_inicio,
        data_fim,
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtros
      if (consumidor_id) {
        paramCount++;
        whereConditions.push(`p.consumidor_id = $${paramCount}`);
        queryParams.push(consumidor_id);
      }

      if (produtor_id) {
        paramCount++;
        whereConditions.push(`p.produtor_id = $${paramCount}`);
        queryParams.push(produtor_id);
      }

      if (status_pedido) {
        paramCount++;
        whereConditions.push(`p.status_pedido = $${paramCount}`);
        queryParams.push(status_pedido);
      }

      if (data_inicio) {
        paramCount++;
        whereConditions.push(`p.created_at >= $${paramCount}`);
        queryParams.push(data_inicio);
      }

      if (data_fim) {
        paramCount++;
        whereConditions.push(`p.created_at <= $${paramCount}`);
        queryParams.push(data_fim + ' 23:59:59');
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar campos de ordenação
      const validOrderFields = ['created_at', 'numero_pedido', 'valor_total', 'status_pedido'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Query principal
      const query = `
        SELECT 
          p.id, p.numero_pedido, p.valor_total, p.status_pedido,
          p.observacoes, p.created_at, p.updated_at,
          uc.nome_completo as consumidor_nome, uc.email as consumidor_email,
          up.nome_completo as produtor_nome, up.email as produtor_email,
          pr.nome_loja,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado
        FROM pedidos p
        JOIN usuarios uc ON p.consumidor_id = uc.id
        JOIN usuarios up ON p.produtor_id = up.id
        JOIN produtores pr ON up.id = pr.usuario_id
        LEFT JOIN enderecos e ON p.endereco_entrega_id = e.id
        ${whereClause}
        ORDER BY p.${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM pedidos p
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Buscar itens dos pedidos
      const pedidosIds = result.rows.map(row => row.id);
      let itens = [];

      if (pedidosIds.length > 0) {
        const itensQuery = `
          SELECT 
            ip.pedido_id, ip.produto_id, ip.nome_produto,
            ip.preco_unitario, ip.quantidade, ip.subtotal
          FROM itens_pedido ip
          WHERE ip.pedido_id = ANY($1)
          ORDER BY ip.nome_produto
        `;
        
        const itensResult = await pool.query(itensQuery, [pedidosIds]);
        itens = itensResult.rows;
      }

      // Organizar dados
      const pedidos = result.rows.map(row => {
        const pedido = {
          id: row.id,
          numero_pedido: row.numero_pedido,
          valor_total: parseFloat(row.valor_total),
          status_pedido: row.status_pedido,
          observacoes: row.observacoes,
          created_at: row.created_at,
          updated_at: row.updated_at,
          consumidor: {
            nome: row.consumidor_nome,
            email: row.consumidor_email
          },
          produtor: {
            nome: row.produtor_nome,
            email: row.produtor_email,
            nome_loja: row.nome_loja
          },
          endereco_entrega: null,
          itens: itens.filter(item => item.pedido_id === row.id)
        };

        // Adicionar endereço se existir
        if (row.cep) {
          pedido.endereco_entrega = {
            cep: row.cep,
            logradouro: row.logradouro,
            numero: row.numero,
            complemento: row.complemento,
            bairro: row.bairro,
            cidade: row.cidade,
            estado: row.estado
          };
        }

        return pedido;
      });

      res.json({
        pedidos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar pedido por ID
  async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT 
          p.id, p.numero_pedido, p.valor_total, p.status_pedido,
          p.observacoes, p.created_at, p.updated_at,
          p.consumidor_id, p.produtor_id,
          uc.nome_completo as consumidor_nome, uc.email as consumidor_email,
          uc.telefone as consumidor_telefone,
          up.nome_completo as produtor_nome, up.email as produtor_email,
          up.telefone as produtor_telefone,
          pr.nome_loja, pr.whatsapp as produtor_whatsapp,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado
        FROM pedidos p
        JOIN usuarios uc ON p.consumidor_id = uc.id
        JOIN usuarios up ON p.produtor_id = up.id
        JOIN produtores pr ON up.id = pr.usuario_id
        LEFT JOIN enderecos e ON p.endereco_entrega_id = e.id
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Buscar itens do pedido
      const itensResult = await pool.query(`
        SELECT 
          ip.produto_id, ip.nome_produto, ip.preco_unitario,
          ip.quantidade, ip.subtotal
        FROM itens_pedido ip
        WHERE ip.pedido_id = $1
        ORDER BY ip.nome_produto
      `, [id]);

      const row = result.rows[0];
      const pedido = {
        id: row.id,
        numero_pedido: row.numero_pedido,
        valor_total: parseFloat(row.valor_total),
        status_pedido: row.status_pedido,
        observacoes: row.observacoes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        consumidor: {
          id: row.consumidor_id,
          nome: row.consumidor_nome,
          email: row.consumidor_email,
          telefone: row.consumidor_telefone
        },
        produtor: {
          id: row.produtor_id,
          nome: row.produtor_nome,
          email: row.produtor_email,
          telefone: row.produtor_telefone,
          nome_loja: row.nome_loja,
          whatsapp: row.produtor_whatsapp
        },
        endereco_entrega: null,
        itens: itensResult.rows.map(item => ({
          produto_id: item.produto_id,
          nome_produto: item.nome_produto,
          preco_unitario: parseFloat(item.preco_unitario),
          quantidade: item.quantidade,
          subtotal: parseFloat(item.subtotal)
        }))
      };

      // Adicionar endereço se existir
      if (row.cep) {
        pedido.endereco_entrega = {
          cep: row.cep,
          logradouro: row.logradouro,
          numero: row.numero,
          complemento: row.complemento,
          bairro: row.bairro,
          cidade: row.cidade,
          estado: row.estado
        };
      }

      res.json({ pedido });

    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar status do pedido
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status_pedido } = req.body;

      const validStatus = ['pendente', 'confirmado', 'preparando', 'entregue', 'cancelado'];
      if (!validStatus.includes(status_pedido)) {
        return res.status(400).json({
          error: 'Status inválido',
          valid_status: validStatus
        });
      }

      // Verificar se pedido existe
      const pedidoExists = await pool.query(
        'SELECT status_pedido FROM pedidos WHERE id = $1',
        [id]
      );

      if (pedidoExists.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const statusAtual = pedidoExists.rows[0].status_pedido;

      // Validar transições de status
      const transicoesValidas = {
        'pendente': ['confirmado', 'cancelado'],
        'confirmado': ['preparando', 'cancelado'],
        'preparando': ['entregue', 'cancelado'],
        'entregue': [],
        'cancelado': []
      };

      if (!transicoesValidas[statusAtual].includes(status_pedido)) {
        return res.status(400).json({
          error: `Não é possível alterar status de '${statusAtual}' para '${status_pedido}'`,
          status_atual: statusAtual,
          transicoes_validas: transicoesValidas[statusAtual]
        });
      }

      // Se cancelando, devolver produtos ao estoque
      if (status_pedido === 'cancelado') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Buscar itens do pedido
          const itensResult = await client.query(
            'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1',
            [id]
          );

          // Devolver ao estoque
          for (const item of itensResult.rows) {
            await client.query(
              'UPDATE produtos SET quantidade_estoque = quantidade_estoque + $1 WHERE id = $2',
              [item.quantidade, item.produto_id]
            );
          }

          // Atualizar status
          await client.query(
            'UPDATE pedidos SET status_pedido = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status_pedido, id]
          );

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } else {
        // Atualizar status normalmente
        await pool.query(
          'UPDATE pedidos SET status_pedido = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [status_pedido, id]
        );
      }

      res.json({
        message: 'Status do pedido atualizado com sucesso',
        status_anterior: statusAtual,
        status_atual: status_pedido
      });

    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Cancelar pedido
  async cancelOrder(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { motivo } = req.body;

      // Verificar se pedido existe e pode ser cancelado
      const pedidoResult = await client.query(
        'SELECT status_pedido FROM pedidos WHERE id = $1',
        [id]
      );

      if (pedidoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const statusAtual = pedidoResult.rows[0].status_pedido;
      const statusCancelaveis = ['pendente', 'confirmado', 'preparando'];

      if (!statusCancelaveis.includes(statusAtual)) {
        return res.status(400).json({
          error: `Pedido com status '${statusAtual}' não pode ser cancelado`
        });
      }

      // Buscar itens do pedido para devolver ao estoque
      const itensResult = await client.query(
        'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1',
        [id]
      );

      // Devolver produtos ao estoque
      for (const item of itensResult.rows) {
        await client.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque + $1 WHERE id = $2',
          [item.quantidade, item.produto_id]
        );
      }

      // Cancelar pedido
      const observacoes_cancelamento = motivo 
        ? `CANCELADO: ${motivo}`
        : 'CANCELADO';

      await client.query(`
        UPDATE pedidos 
        SET status_pedido = 'cancelado', 
            observacoes = CASE 
              WHEN observacoes IS NULL THEN $1
              ELSE observacoes || ' | ' || $1
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [observacoes_cancelamento, id]);

      await client.query('COMMIT');

      res.json({
        message: 'Pedido cancelado com sucesso',
        status_anterior: statusAtual
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao cancelar pedido:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      client.release();
    }
  }

  // Estatísticas de pedidos
  async getOrderStats(req, res) {
    try {
      const { produtor_id, data_inicio, data_fim } = req.query;
      
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (produtor_id) {
        paramCount++;
        whereConditions.push(`produtor_id = $${paramCount}`);
        queryParams.push(produtor_id);
      }

      if (data_inicio) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(data_inicio);
      }

      if (data_fim) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(data_fim + ' 23:59:59');
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_pedidos,
          COUNT(*) FILTER (WHERE status_pedido = 'pendente') as pedidos_pendentes,
          COUNT(*) FILTER (WHERE status_pedido = 'confirmado') as pedidos_confirmados,
          COUNT(*) FILTER (WHERE status_pedido = 'preparando') as pedidos_preparando,
          COUNT(*) FILTER (WHERE status_pedido = 'entregue') as pedidos_entregues,
          COUNT(*) FILTER (WHERE status_pedido = 'cancelado') as pedidos_cancelados,
          COALESCE(SUM(valor_total), 0) as valor_total_pedidos,
          COALESCE(SUM(valor_total) FILTER (WHERE status_pedido = 'entregue'), 0) as receita_entregue,
          COALESCE(AVG(valor_total), 0) as ticket_medio,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as pedidos_semana,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as pedidos_mes
        FROM pedidos
        ${whereClause}
      `, queryParams);

      const row = stats.rows[0];
      
      res.json({
        stats: {
          total_pedidos: parseInt(row.total_pedidos),
          pedidos_pendentes: parseInt(row.pedidos_pendentes),
          pedidos_confirmados: parseInt(row.pedidos_confirmados),
          pedidos_preparando: parseInt(row.pedidos_preparando),
          pedidos_entregues: parseInt(row.pedidos_entregues),
          pedidos_cancelados: parseInt(row.pedidos_cancelados),
          valor_total_pedidos: parseFloat(row.valor_total_pedidos),
          receita_entregue: parseFloat(row.receita_entregue),
          ticket_medio: parseFloat(row.ticket_medio),
          pedidos_semana: parseInt(row.pedidos_semana),
          pedidos_mes: parseInt(row.pedidos_mes)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Relatório de vendas por período
  async getSalesReport(req, res) {
    try {
      const { 
        data_inicio, 
        data_fim, 
        produtor_id, 
        agrupar_por = 'dia' // dia, semana, mes
      } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({
          error: 'data_inicio e data_fim são obrigatórios'
        });
      }

      let whereConditions = ["status_pedido = 'entregue'"];
      let queryParams = [];
      let paramCount = 0;

      paramCount++;
      whereConditions.push(`created_at >= $${paramCount}`);
      queryParams.push(data_inicio);

      paramCount++;
      whereConditions.push(`created_at <= $${paramCount}`);
      queryParams.push(data_fim + ' 23:59:59');

      if (produtor_id) {
        paramCount++;
        whereConditions.push(`produtor_id = $${paramCount}`);
        queryParams.push(produtor_id);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Definir agrupamento
      let dateFormat;
      switch (agrupar_por) {
        case 'semana':
          dateFormat = "TO_CHAR(created_at, 'YYYY-WW')";
          break;
        case 'mes':
          dateFormat = "TO_CHAR(created_at, 'YYYY-MM')";
          break;
        default:
          dateFormat = "DATE(created_at)";
      }

      const query = `
        SELECT 
          ${dateFormat} as periodo,
          COUNT(*) as total_pedidos,
          SUM(valor_total) as receita_total,
          AVG(valor_total) as ticket_medio
        FROM pedidos
        ${whereClause}
        GROUP BY ${dateFormat}
        ORDER BY periodo
      `;

      const result = await pool.query(query, queryParams);

      const relatorio = result.rows.map(row => ({
        periodo: row.periodo,
        total_pedidos: parseInt(row.total_pedidos),
        receita_total: parseFloat(row.receita_total),
        ticket_medio: parseFloat(row.ticket_medio)
      }));

      res.json({
        relatorio,
        resumo: {
          total_periodos: relatorio.length,
          receita_total: relatorio.reduce((sum, r) => sum + r.receita_total, 0),
          pedidos_total: relatorio.reduce((sum, r) => sum + r.total_pedidos, 0)
        }
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new PedidoController();