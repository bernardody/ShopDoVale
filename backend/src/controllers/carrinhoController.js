const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class CarrinhoController {
  // Listar itens do carrinho do usuário
  async getCarrinho(req, res) {
    try {
      const { consumidor_id } = req.params;

      const result = await pool.query(`
        SELECT 
          c.id,
          c.quantidade,
          c.preco_unitario,
          c.created_at,
          p.id as produto_id,
          p.nome as produto_nome,
          p.descricao as produto_descricao,
          p.preco as produto_preco_atual,
          p.quantidade_estoque,
          p.imagem_principal,
          p.data_validade,
          cat.nome as categoria_nome,
          u.nome_completo as produtor_nome,
          pr.nome_loja,
          pr.whatsapp as produtor_whatsapp,
          e.cidade as produtor_cidade,
          e.estado as produtor_estado
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN categorias cat ON p.categoria_id = cat.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE c.consumidor_id = $1
          AND p.is_ativo = true
          AND u.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.data_validade >= CURRENT_DATE
        ORDER BY c.created_at DESC
      `, [consumidor_id]);

      // Calcular totais
      let total_itens = 0;
      let valor_total = 0;
      let total_produtos_diferentes = result.rows.length;

      const itens = result.rows.map(row => {
        const subtotal = parseFloat(row.preco_unitario) * row.quantidade;
        total_itens += row.quantidade;
        valor_total += subtotal;

        return {
          id: row.id,
          quantidade: row.quantidade,
          preco_unitario: parseFloat(row.preco_unitario),
          subtotal: subtotal,
          created_at: row.created_at,
          produto: {
            id: row.produto_id,
            nome: row.produto_nome,
            descricao: row.produto_descricao,
            preco_atual: parseFloat(row.produto_preco_atual),
            quantidade_estoque: row.quantidade_estoque,
            imagem_principal: row.imagem_principal,
            data_validade: row.data_validade,
            categoria_nome: row.categoria_nome,
            produtor: {
              nome: row.produtor_nome,
              nome_loja: row.nome_loja,
              whatsapp: row.produtor_whatsapp,
              cidade: row.produtor_cidade,
              estado: row.produtor_estado
            }
          }
        };
      });

      res.json({
        carrinho: {
          itens,
          resumo: {
            total_itens,
            total_produtos_diferentes,
            valor_total: parseFloat(valor_total.toFixed(2))
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar carrinho:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Adicionar item ao carrinho
  async addItem(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { consumidor_id } = req.params;
      const { produto_id, quantidade = 1 } = req.body;

      if (!produto_id) {
        return res.status(400).json({ error: 'ID do produto é obrigatório' });
      }

      if (quantidade <= 0) {
        return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
      }

      // Verificar se o consumidor existe e é ativo
      const consumidorExists = await client.query(
        'SELECT id, tipo_usuario, is_ativo FROM usuarios WHERE id = $1',
        [consumidor_id]
      );

      if (consumidorExists.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const consumidor = consumidorExists.rows[0];
      
      if (consumidor.tipo_usuario !== 'consumidor') {
        return res.status(403).json({ error: 'Apenas consumidores podem adicionar itens ao carrinho' });
      }

      if (!consumidor.is_ativo) {
        return res.status(403).json({ error: 'Usuário inativo' });
      }

      // Verificar se o produto existe, está ativo e é da semana atual
      const produtoResult = await client.query(`
        SELECT 
          p.id, p.nome, p.preco, p.quantidade_estoque, p.is_ativo,
          p.semana_ano, p.ano, p.data_validade,
          u.is_ativo as produtor_ativo
        FROM produtos p
        JOIN usuarios u ON p.produtor_id = u.id
        WHERE p.id = $1
      `, [produto_id]);

      if (produtoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const produto = produtoResult.rows[0];

      if (!produto.is_ativo || !produto.produtor_ativo) {
        return res.status(400).json({ error: 'Produto não está disponível' });
      }

      // Verificar se é produto da semana atual
      const semanaAtual = new Date().getWeek();
      const anoAtual = new Date().getFullYear();
      
      if (produto.semana_ano !== semanaAtual || produto.ano !== anoAtual) {
        return res.status(400).json({ error: 'Produto não é da semana atual' });
      }

      if (new Date(produto.data_validade) < new Date()) {
        return res.status(400).json({ error: 'Produto fora da validade' });
      }

      if (produto.quantidade_estoque < quantidade) {
        return res.status(400).json({ 
          error: 'Estoque insuficiente',
          estoque_disponivel: produto.quantidade_estoque
        });
      }

      // Verificar se item já existe no carrinho
      const itemExistente = await client.query(
        'SELECT id, quantidade FROM carrinho WHERE consumidor_id = $1 AND produto_id = $2',
        [consumidor_id, produto_id]
      );

      let result;

      if (itemExistente.rows.length > 0) {
        // Atualizar quantidade do item existente
        const novaQuantidade = itemExistente.rows[0].quantidade + quantidade;

        if (produto.quantidade_estoque < novaQuantidade) {
          return res.status(400).json({ 
            error: 'Estoque insuficiente para a quantidade total',
            quantidade_atual_carrinho: itemExistente.rows[0].quantidade,
            quantidade_solicitada: quantidade,
            estoque_disponivel: produto.quantidade_estoque
          });
        }

        result = await client.query(`
          UPDATE carrinho 
          SET quantidade = $1, preco_unitario = $2
          WHERE consumidor_id = $3 AND produto_id = $4
          RETURNING id, quantidade, preco_unitario
        `, [novaQuantidade, produto.preco, consumidor_id, produto_id]);

      } else {
        // Criar novo item no carrinho
        result = await client.query(`
          INSERT INTO carrinho (consumidor_id, produto_id, quantidade, preco_unitario)
          VALUES ($1, $2, $3, $4)
          RETURNING id, quantidade, preco_unitario
        `, [consumidor_id, produto_id, quantidade, produto.preco]);
      }

      await client.query('COMMIT');

      const item = result.rows[0];
      
      res.status(201).json({
        message: 'Item adicionado ao carrinho com sucesso',
        item: {
          id: item.id,
          produto_id,
          produto_nome: produto.nome,
          quantidade: item.quantidade,
          preco_unitario: parseFloat(item.preco_unitario),
          subtotal: parseFloat(item.preco_unitario) * item.quantidade
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao adicionar item ao carrinho:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      client.release();
    }
  }

  // Atualizar quantidade de um item
  async updateItem(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { consumidor_id, item_id } = req.params;
      const { quantidade } = req.body;

      if (!quantidade || quantidade <= 0) {
        return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
      }

      // Verificar se o item pertence ao consumidor
      const itemResult = await client.query(`
        SELECT 
          c.id, c.produto_id, c.quantidade as quantidade_atual,
          p.nome, p.preco, p.quantidade_estoque, p.is_ativo,
          u.is_ativo as produtor_ativo
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN usuarios u ON p.produtor_id = u.id
        WHERE c.id = $1 AND c.consumidor_id = $2
      `, [item_id, consumidor_id]);

      if (itemResult.rows.length === 0) {
        return res.status(404).json({ error: 'Item não encontrado no carrinho' });
      }

      const item = itemResult.rows[0];

      // Verificar se produto ainda está disponível
      if (!item.is_ativo || !item.produtor_ativo) {
        return res.status(400).json({ error: 'Produto não está mais disponível' });
      }

      if (item.quantidade_estoque < quantidade) {
        return res.status(400).json({ 
          error: 'Estoque insuficiente',
          estoque_disponivel: item.quantidade_estoque
        });
      }

      // Atualizar quantidade
      const result = await client.query(`
        UPDATE carrinho 
        SET quantidade = $1, preco_unitario = $2
        WHERE id = $3
        RETURNING id, quantidade, preco_unitario
      `, [quantidade, item.preco, item_id]);

      await client.query('COMMIT');

      const updatedItem = result.rows[0];

      res.json({
        message: 'Item atualizado com sucesso',
        item: {
          id: updatedItem.id,
          produto_id: item.produto_id,
          produto_nome: item.nome,
          quantidade: updatedItem.quantidade,
          preco_unitario: parseFloat(updatedItem.preco_unitario),
          subtotal: parseFloat(updatedItem.preco_unitario) * updatedItem.quantidade
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar item do carrinho:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      client.release();
    }
  }

  // Remover item do carrinho
  async removeItem(req, res) {
    try {
      const { consumidor_id, item_id } = req.params;

      const result = await pool.query(
        'DELETE FROM carrinho WHERE id = $1 AND consumidor_id = $2 RETURNING id',
        [item_id, consumidor_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item não encontrado no carrinho' });
      }

      res.json({ message: 'Item removido do carrinho com sucesso' });

    } catch (error) {
      console.error('Erro ao remover item do carrinho:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Limpar carrinho
  async clearCarrinho(req, res) {
    try {
      const { consumidor_id } = req.params;

      const result = await pool.query(
        'DELETE FROM carrinho WHERE consumidor_id = $1',
        [consumidor_id]
      );

      res.json({ 
        message: 'Carrinho limpo com sucesso',
        itens_removidos: result.rowCount
      });

    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Validar carrinho (verificar disponibilidade e preços)
  async validateCarrinho(req, res) {
    try {
      const { consumidor_id } = req.params;

      const result = await pool.query(`
        SELECT 
          c.id,
          c.quantidade,
          c.preco_unitario as preco_carrinho,
          p.id as produto_id,
          p.nome,
          p.preco as preco_atual,
          p.quantidade_estoque,
          p.is_ativo,
          p.data_validade,
          u.is_ativo as produtor_ativo,
          CASE 
            WHEN p.is_ativo = false OR u.is_ativo = false THEN 'produto_inativo'
            WHEN p.data_validade < CURRENT_DATE THEN 'produto_vencido'
            WHEN p.quantidade_estoque < c.quantidade THEN 'estoque_insuficiente'
            WHEN p.preco != c.preco_unitario THEN 'preco_alterado'
            ELSE 'ok'
          END as status_item
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN usuarios u ON p.produtor_id = u.id
        WHERE c.consumidor_id = $1
        ORDER BY c.created_at
      `, [consumidor_id]);

      const itens_validos = [];
      const itens_com_problema = [];
      let valor_total = 0;

      result.rows.forEach(row => {
        const item = {
          id: row.id,
          produto_id: row.produto_id,
          nome: row.nome,
          quantidade: row.quantidade,
          preco_carrinho: parseFloat(row.preco_carrinho),
          preco_atual: parseFloat(row.preco_atual),
          quantidade_estoque: row.quantidade_estoque,
          status: row.status_item
        };

        if (row.status_item === 'ok') {
          item.subtotal = row.quantidade * parseFloat(row.preco_carrinho);
          valor_total += item.subtotal;
          itens_validos.push(item);
        } else {
          // Adicionar informações específicas do problema
          switch (row.status_item) {
            case 'produto_inativo':
              item.motivo = 'Produto não está mais disponível';
              break;
            case 'produto_vencido':
              item.motivo = 'Produto fora da validade';
              break;
            case 'estoque_insuficiente':
              item.motivo = `Estoque insuficiente (disponível: ${row.quantidade_estoque})`;
              break;
            case 'preco_alterado':
              item.motivo = 'Preço foi alterado';
              break;
          }
          itens_com_problema.push(item);
        }
      });

      const carrinho_valido = itens_com_problema.length === 0;

      res.json({
        carrinho_valido,
        itens_validos,
        itens_com_problema,
        resumo: {
          total_itens_validos: itens_validos.length,
          total_itens_problemas: itens_com_problema.length,
          valor_total: parseFloat(valor_total.toFixed(2))
        }
      });

    } catch (error) {
      console.error('Erro ao validar carrinho:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Agrupar itens do carrinho por produtor
  async getCarrinhoPorProdutor(req, res) {
    try {
      const { consumidor_id } = req.params;

      const result = await pool.query(`
        SELECT 
          c.id,
          c.quantidade,
          c.preco_unitario,
          p.id as produto_id,
          p.nome as produto_nome,
          p.imagem_principal,
          u.id as produtor_id,
          u.nome_completo as produtor_nome,
          pr.nome_loja,
          pr.whatsapp,
          e.cidade,
          e.estado
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE c.consumidor_id = $1
          AND p.is_ativo = true
          AND u.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.data_validade >= CURRENT_DATE
        ORDER BY pr.nome_loja, p.nome
      `, [consumidor_id]);

      // Agrupar por produtor
      const produtores = {};
      let valor_total_geral = 0;

      result.rows.forEach(row => {
        const produtorId = row.produtor_id;
        const subtotal = parseFloat(row.preco_unitario) * row.quantidade;
        
        if (!produtores[produtorId]) {
          produtores[produtorId] = {
            produtor_id: produtorId,
            produtor_nome: row.produtor_nome,
            nome_loja: row.nome_loja,
            whatsapp: row.whatsapp,
            cidade: row.cidade,
            estado: row.estado,
            itens: [],
            total_itens: 0,
            valor_total: 0
          };
        }

        produtores[produtorId].itens.push({
          id: row.id,
          produto_id: row.produto_id,
          produto_nome: row.produto_nome,
          imagem_principal: row.imagem_principal,
          quantidade: row.quantidade,
          preco_unitario: parseFloat(row.preco_unitario),
          subtotal
        });

        produtores[produtorId].total_itens += row.quantidade;
        produtores[produtorId].valor_total += subtotal;
        valor_total_geral += subtotal;
      });

      // Converter objeto em array
      const produtores_array = Object.values(produtores).map(produtor => ({
        ...produtor,
        valor_total: parseFloat(produtor.valor_total.toFixed(2))
      }));

      res.json({
        produtores: produtores_array,
        resumo_geral: {
          total_produtores: produtores_array.length,
          valor_total_geral: parseFloat(valor_total_geral.toFixed(2))
        }
      });

    } catch (error) {
      console.error('Erro ao agrupar carrinho por produtor:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

// Extensão para calcular semana do ano
Date.prototype.getWeek = function() {
  const oneJan = new Date(this.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil((((this - oneJan) / millisecsInDay) + oneJan.getDay() + 1) / 7);
};

module.exports = new CarrinhoController();