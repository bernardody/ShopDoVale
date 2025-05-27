const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class Pedido {
  constructor(data = {}) {
    this.id = data.id;
    this.numero_pedido = data.numero_pedido;
    this.consumidor_id = data.consumidor_id;
    this.produtor_id = data.produtor_id;
    this.valor_total = data.valor_total;
    this.status_pedido = data.status_pedido || 'pendente';
    this.endereco_entrega_id = data.endereco_entrega_id;
    this.observacoes = data.observacoes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar pedido por ID com detalhes completos
  static async findById(id) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, p.numero_pedido, p.consumidor_id, p.produtor_id, p.valor_total,
          p.status_pedido, p.endereco_entrega_id, p.observacoes, p.created_at, p.updated_at,
          uc.nome_completo as consumidor_nome, uc.email as consumidor_email, uc.telefone as consumidor_telefone,
          up.nome_completo as produtor_nome, pr.nome_loja, pr.whatsapp as produtor_whatsapp,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado
        FROM pedidos p
        LEFT JOIN usuarios uc ON p.consumidor_id = uc.id
        LEFT JOIN usuarios up ON p.produtor_id = up.id
        LEFT JOIN produtores pr ON up.id = pr.usuario_id
        LEFT JOIN enderecos e ON p.endereco_entrega_id = e.id
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return Pedido.formatPedidoData(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar pedido por número
  static async findByNumero(numero_pedido) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, p.numero_pedido, p.consumidor_id, p.produtor_id, p.valor_total,
          p.status_pedido, p.endereco_entrega_id, p.observacoes, p.created_at, p.updated_at,
          uc.nome_completo as consumidor_nome, uc.email as consumidor_email,
          up.nome_completo as produtor_nome, pr.nome_loja
        FROM pedidos p
        LEFT JOIN usuarios uc ON p.consumidor_id = uc.id
        LEFT JOIN usuarios up ON p.produtor_id = up.id
        LEFT JOIN produtores pr ON up.id = pr.usuario_id
        WHERE p.numero_pedido = $1
      `, [numero_pedido]);

      if (result.rows.length === 0) {
        return null;
      }

      return Pedido.formatPedidoData(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar itens do pedido
  static async findItens(pedido_id) {
    try {
      const result = await pool.query(`
        SELECT 
          ip.id, ip.pedido_id, ip.produto_id, ip.nome_produto,
          ip.preco_unitario, ip.quantidade, ip.subtotal,
          p.imagem_principal
        FROM itens_pedido ip
        LEFT JOIN produtos p ON ip.produto_id = p.id
        WHERE ip.pedido_id = $1
        ORDER BY ip.nome_produto
      `, [pedido_id]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Listar pedidos com filtros
  static async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        consumidor_id,
        produtor_id,
        status_pedido,
        search,
        data_inicio,
        data_fim,
        orderBy = 'created_at',
        order = 'DESC'
      } = filters;

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

      if (search) {
        paramCount++;
        whereConditions.push(`(
          p.numero_pedido ILIKE $${paramCount} OR 
          uc.nome_completo ILIKE $${paramCount} OR
          pr.nome_loja ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      if (data_inicio) {
        paramCount++;
        whereConditions.push(`p.created_at >= $${paramCount}`);
        queryParams.push(data_inicio);
      }

      if (data_fim) {
        paramCount++;
        whereConditions.push(`p.created_at <= $${paramCount}`);
        queryParams.push(data_fim);
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
          p.id, p.numero_pedido, p.consumidor_id, p.produtor_id, p.valor_total,
          p.status_pedido, p.created_at, p.updated_at,
          uc.nome_completo as consumidor_nome, uc.email as consumidor_email,
          up.nome_completo as produtor_nome, pr.nome_loja,
          e.cidade, e.estado
        FROM pedidos p
        LEFT JOIN usuarios uc ON p.consumidor_id = uc.id
        LEFT JOIN usuarios up ON p.produtor_id = up.id
        LEFT JOIN produtores pr ON up.id = pr.usuario_id
        LEFT JOIN enderecos e ON p.endereco_entrega_id = e.id
        ${whereClause}
        ORDER BY p.${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM pedidos p
        LEFT JOIN usuarios uc ON p.consumidor_id = uc.id
        LEFT JOIN usuarios up ON p.produtor_id = up.id
        LEFT JOIN produtores pr ON up.id = pr.usuario_id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Formatar dados dos pedidos
      const pedidos = result.rows.map(row => Pedido.formatPedidoData(row));

      return {
        pedidos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      throw error;
    }
  }

  // Criar pedido a partir do carrinho
  static async createFromCarrinho(consumidor_id, endereco_entrega_id, observacoes = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar itens do carrinho agrupados por produtor
      const carrinhoResult = await client.query(`
        SELECT 
          c.produto_id, c.quantidade, c.preco_unitario,
          p.nome as nome_produto, p.produtor_id, p.quantidade_estoque
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        WHERE c.consumidor_id = $1 AND p.is_ativo = true
        ORDER BY p.produtor_id
      `, [consumidor_id]);

      if (carrinhoResult.rows.length === 0) {
        throw new Error('Carrinho vazio ou produtos inativos');
      }

      // Agrupar itens por produtor
      const itensPorProdutor = {};
      for (const item of carrinhoResult.rows) {
        if (!itensPorProdutor[item.produtor_id]) {
          itensPorProdutor[item.produtor_id] = [];
        }
        itensPorProdutor[item.produtor_id].push(item);
      }

      const pedidosCriados = [];

      // Criar um pedido para cada produtor
      for (const [produtor_id, itens] of Object.entries(itensPorProdutor)) {
        // Verificar estoque
        for (const item of itens) {
          if (item.quantidade > item.quantidade_estoque) {
            throw new Error(`Produto "${item.nome_produto}" não tem estoque suficiente`);
          }
        }

        // Gerar número do pedido
        const numeroResult = await client.query('SELECT gerar_numero_pedido() as numero');
        const numero_pedido = numeroResult.rows[0].numero;

        // Calcular valor total
        const valor_total = itens.reduce((total, item) => {
          return total + (parseFloat(item.preco_unitario) * item.quantidade);
        }, 0);

        // Criar pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (numero_pedido, consumidor_id, produtor_id, valor_total, endereco_entrega_id, observacoes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, numero_pedido, created_at
        `, [numero_pedido, consumidor_id, produtor_id, valor_total, endereco_entrega_id, observacoes]);

        const pedido = pedidoResult.rows[0];

        // Criar itens do pedido
        for (const item of itens) {
          const subtotal = parseFloat(item.preco_unitario) * item.quantidade;

          await client.query(`
            INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [pedido.id, item.produto_id, item.nome_produto, item.preco_unitario, item.quantidade, subtotal]);

          // Atualizar estoque
          await client.query(`
            UPDATE produtos 
            SET quantidade_estoque = quantidade_estoque - $1
            WHERE id = $2
          `, [item.quantidade, item.produto_id]);
        }

        pedidosCriados.push({
          id: pedido.id,
          numero_pedido: pedido.numero_pedido,
          produtor_id: produtor_id,
          valor_total: valor_total,
          itens_count: itens.length,
          created_at: pedido.created_at
        });
      }

      // Limpar carrinho
      await client.query('DELETE FROM carrinho WHERE consumidor_id = $1', [consumidor_id]);

      await client.query('COMMIT');
      return pedidosCriados;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Atualizar status do pedido
  async updateStatus(novoStatus) {
    try {
      const validStatus = ['pendente', 'confirmado', 'preparando', 'entregue', 'cancelado'];
      if (!validStatus.includes(novoStatus)) {
        throw new Error('Status inválido');
      }

      const result = await pool.query(`
        UPDATE pedidos 
        SET status_pedido = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING status_pedido, updated_at
      `, [novoStatus, this.id]);

      this.status_pedido = result.rows[0].status_pedido;
      this.updated_at = result.rows[0].updated_at;

      return this.status_pedido;
    } catch (error) {
      throw error;
    }
  }

  // Cancelar pedido
  async cancelar(motivo = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar se pode cancelar
      if (this.status_pedido === 'entregue') {
        throw new Error('Não é possível cancelar pedido já entregue');
      }

      if (this.status_pedido === 'cancelado') {
        throw new Error('Pedido já está cancelado');
      }

      // Buscar itens do pedido para devolver estoque
      const itensResult = await client.query(`
        SELECT produto_id, quantidade
        FROM itens_pedido
        WHERE pedido_id = $1
      `, [this.id]);

      // Devolver estoque
      for (const item of itensResult.rows) {
        await client.query(`
          UPDATE produtos 
          SET quantidade_estoque = quantidade_estoque + $1
          WHERE id = $2
        `, [item.quantidade, item.produto_id]);
      }

      // Atualizar status
      await client.query(`
        UPDATE pedidos 
        SET status_pedido = 'cancelado', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [this.id]);

      await client.query('COMMIT');
      
      this.status_pedido = 'cancelado';
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Estatísticas de pedidos
  static async getStats(filters = {}) {
    try {
      const { produtor_id, data_inicio, data_fim } = filters;
      
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
        queryParams.push(data_fim);
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
          COALESCE(SUM(valor_total) FILTER (WHERE status_pedido = 'entregue'), 0) as valor_vendas_concluidas,
          COALESCE(AVG(valor_total), 0) as ticket_medio,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as pedidos_ultima_semana,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as pedidos_ultimo_mes
        FROM pedidos
        ${whereClause}
      `, queryParams);

      const result = stats.rows[0];
      
      // Converter valores para números
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'string' && !isNaN(result[key])) {
          result[key] = parseFloat(result[key]);
        }
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Vendas por período
  static async getVendasPorPeriodo(filters = {}) {
    try {
      const { produtor_id, periodo = 'mes' } = filters;
      
      let dateFormat;
      switch (periodo) {
        case 'dia':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'semana':
          dateFormat = 'YYYY-"W"WW';
          break;
        case 'mes':
          dateFormat = 'YYYY-MM';
          break;
        default:
          dateFormat = 'YYYY-MM';
      }

      let whereClause = "WHERE status_pedido = 'entregue'";
      let queryParams = [];

      if (produtor_id) {
        whereClause += " AND produtor_id = $1";
        queryParams.push(produtor_id);
      }

      const result = await pool.query(`
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as periodo,
          COUNT(*) as total_pedidos,
          SUM(valor_total) as valor_total,
          AVG(valor_total) as ticket_medio
        FROM pedidos
        ${whereClause}
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY periodo DESC
        LIMIT 12
      `, queryParams);

      return result.rows.map(row => ({
        periodo: row.periodo,
        total_pedidos: parseInt(row.total_pedidos),
        valor_total: parseFloat(row.valor_total || 0),
        ticket_medio: parseFloat(row.ticket_medio || 0)
      }));

    } catch (error) {
      throw error;
    }
  }

  // Formatar dados do pedido para resposta
  static formatPedidoData(row) {
    const pedido = {
      id: row.id,
      numero_pedido: row.numero_pedido,
      consumidor_id: row.consumidor_id,
      produtor_id: row.produtor_id,
      valor_total: parseFloat(row.valor_total || 0),
      status_pedido: row.status_pedido,
      endereco_entrega_id: row.endereco_entrega_id,
      observacoes: row.observacoes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      consumidor: null,
      produtor: null,
      endereco_entrega: null
    };

    // Adicionar dados do consumidor
    if (row.consumidor_nome) {
      pedido.consumidor = {
        nome: row.consumidor_nome,
        email: row.consumidor_email,
        telefone: row.consumidor_telefone
      };
    }

    // Adicionar dados do produtor
    if (row.produtor_nome) {
      pedido.produtor = {
        nome: row.produtor_nome,
        nome_loja: row.nome_loja,
        whatsapp: row.produtor_whatsapp
      };
    }

    // Adicionar endereço de entrega
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
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      numero_pedido: this.numero_pedido,
      consumidor_id: this.consumidor_id,
      produtor_id: this.produtor_id,
      valor_total: parseFloat(this.valor_total || 0),
      status_pedido: this.status_pedido,
      endereco_entrega_id: this.endereco_entrega_id,
      observacoes: this.observacoes,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Pedido;