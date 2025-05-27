const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class Carrinho {
  constructor(data = {}) {
    this.id = data.id;
    this.consumidor_id = data.consumidor_id;
    this.produto_id = data.produto_id;
    this.quantidade = data.quantidade;
    this.preco_unitario = data.preco_unitario;
    this.created_at = data.created_at;
  }

  // Buscar carrinho completo do consumidor
  static async findByConsumidor(consumidor_id) {
    try {
      const result = await pool.query(`
        SELECT 
          c.id, c.consumidor_id, c.produto_id, c.quantidade, c.preco_unitario, c.created_at,
          p.nome as produto_nome,
          p.descricao as produto_descricao,
          p.imagem_principal,
          p.quantidade_estoque,
          p.is_ativo as produto_ativo,
          cat.nome as categoria_nome,
          u.nome_completo as produtor_nome,
          pr.nome_loja,
          pr.avaliacao_media,
          (c.quantidade * c.preco_unitario) as subtotal
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN categorias cat ON p.categoria_id = cat.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        WHERE c.consumidor_id = $1
          AND p.is_ativo = true
          AND u.is_ativo = true
          AND produto_esta_valido(p.id) = true
        ORDER BY c.created_at DESC
      `, [consumidor_id]);

      const itens = result.rows.map(row => ({
        id: row.id,
        produto_id: row.produto_id,
        produto: {
          nome: row.produto_nome,
          descricao: row.produto_descricao,
          imagem_principal: row.imagem_principal,
          quantidade_estoque: row.quantidade_estoque,
          categoria: row.categoria_nome,
          produtor: {
            nome: row.produtor_nome,
            loja: row.nome_loja,
            avaliacao: parseFloat(row.avaliacao_media || 0)
          }
        },
        quantidade: row.quantidade,
        preco_unitario: parseFloat(row.preco_unitario),
        subtotal: parseFloat(row.subtotal),
        created_at: row.created_at
      }));

      const valor_total = itens.reduce((total, item) => total + item.subtotal, 0);
      const total_itens = itens.reduce((total, item) => total + item.quantidade, 0);

      return {
        itens,
        resumo: {
          total_itens,
          valor_total: parseFloat(valor_total.toFixed(2)),
          total_produtos: itens.length
        }
      };

    } catch (error) {
      throw error;
    }
  }

  // Adicionar item ao carrinho
  static async addItem(consumidor_id, produto_id, quantidade) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar se produto existe e está válido
      const produtoResult = await client.query(`
        SELECT id, preco, quantidade_estoque, is_ativo
        FROM produtos 
        WHERE id = $1 AND produto_esta_valido(id) = true
      `, [produto_id]);

      if (produtoResult.rows.length === 0) {
        throw new Error('Produto não encontrado ou não está disponível');
      }

      const produto = produtoResult.rows[0];

      if (!produto.is_ativo) {
        throw new Error('Produto não está ativo');
      }

      if (produto.quantidade_estoque < quantidade) {
        throw new Error(`Estoque insuficiente. Disponível: ${produto.quantidade_estoque}`);
      }

      // Verificar se item já existe no carrinho
      const existingItem = await client.query(
        'SELECT id, quantidade FROM carrinho WHERE consumidor_id = $1 AND produto_id = $2',
        [consumidor_id, produto_id]
      );

      let result;

      if (existingItem.rows.length > 0) {
        // Atualizar quantidade existente
        const nova_quantidade = existingItem.rows[0].quantidade + quantidade;
        
        if (produto.quantidade_estoque < nova_quantidade) {
          throw new Error(`Estoque insuficiente. Disponível: ${produto.quantidade_estoque}, no carrinho: ${existingItem.rows[0].quantidade}`);
        }

        result = await client.query(`
          UPDATE carrinho 
          SET quantidade = $1, preco_unitario = $2
          WHERE consumidor_id = $3 AND produto_id = $4
          RETURNING *
        `, [nova_quantidade, produto.preco, consumidor_id, produto_id]);

      } else {
        // Inserir novo item
        result = await client.query(`
          INSERT INTO carrinho (consumidor_id, produto_id, quantidade, preco_unitario)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [consumidor_id, produto_id, quantidade, produto.preco]);
      }

      await client.query('COMMIT');
      return new Carrinho(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Atualizar quantidade de item no carrinho
  static async updateQuantidade(consumidor_id, produto_id, nova_quantidade) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar se item existe no carrinho
      const carrinhoItem = await client.query(
        'SELECT id FROM carrinho WHERE consumidor_id = $1 AND produto_id = $2',
        [consumidor_id, produto_id]
      );

      if (carrinhoItem.rows.length === 0) {
        throw new Error('Item não encontrado no carrinho');
      }

      // Verificar estoque disponível
      const produtoResult = await client.query(`
        SELECT preco, quantidade_estoque, is_ativo
        FROM produtos 
        WHERE id = $1 AND produto_esta_valido(id) = true
      `, [produto_id]);

      if (produtoResult.rows.length === 0 || !produtoResult.rows[0].is_ativo) {
        throw new Error('Produto não está mais disponível');
      }

      const produto = produtoResult.rows[0];

      if (produto.quantidade_estoque < nova_quantidade) {
        throw new Error(`Estoque insuficiente. Disponível: ${produto.quantidade_estoque}`);
      }

      // Atualizar quantidade
      const result = await client.query(`
        UPDATE carrinho 
        SET quantidade = $1, preco_unitario = $2
        WHERE consumidor_id = $3 AND produto_id = $4
        RETURNING *
      `, [nova_quantidade, produto.preco, consumidor_id, produto_id]);

      await client.query('COMMIT');
      return new Carrinho(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Remover item do carrinho
  static async removeItem(consumidor_id, produto_id) {
    try {
      const result = await pool.query(
        'DELETE FROM carrinho WHERE consumidor_id = $1 AND produto_id = $2 RETURNING *',
        [consumidor_id, produto_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Item não encontrado no carrinho');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Limpar carrinho do consumidor
  static async clearCarrinho(consumidor_id) {
    try {
      const result = await pool.query(
        'DELETE FROM carrinho WHERE consumidor_id = $1 RETURNING COUNT(*) as items_removidos',
        [consumidor_id]
      );

      return {
        success: true,
        items_removidos: result.rowCount
      };
    } catch (error) {
      throw error;
    }
  }

  // Validar carrinho antes do checkout
  static async validateCarrinho(consumidor_id) {
    try {
      const carrinho = await Carrinho.findByConsumidor(consumidor_id);
      
      if (carrinho.itens.length === 0) {
        throw new Error('Carrinho está vazio');
      }

      const erros = [];
      const client = await pool.connect();

      try {
        for (const item of carrinho.itens) {
          // Verificar se produto ainda existe e está válido
          const produtoResult = await client.query(`
            SELECT preco, quantidade_estoque, is_ativo
            FROM produtos 
            WHERE id = $1 AND produto_esta_valido(id) = true
          `, [item.produto_id]);

          if (produtoResult.rows.length === 0) {
            erros.push(`Produto "${item.produto.nome}" não está mais disponível`);
            continue;
          }

          const produto = produtoResult.rows[0];

          // Verificar se preço mudou
          if (parseFloat(produto.preco) !== item.preco_unitario) {
            erros.push(`Preço do produto "${item.produto.nome}" foi alterado`);
          }

          // Verificar estoque
          if (produto.quantidade_estoque < item.quantidade) {
            erros.push(`Estoque insuficiente para "${item.produto.nome}". Disponível: ${produto.quantidade_estoque}, solicitado: ${item.quantidade}`);
          }

          // Verificar se produto está ativo
          if (!produto.is_ativo) {
            erros.push(`Produto "${item.produto.nome}" não está mais ativo`);
          }
        }

      } finally {
        client.release();
      }

      return {
        valid: erros.length === 0,
        erros,
        carrinho
      };

    } catch (error) {
      throw error;
    }
  }

  // Agrupar itens do carrinho por produtor
  static async groupByProdutor(consumidor_id) {
    try {
      const result = await pool.query(`
        SELECT 
          p.produtor_id,
          u.nome_completo as produtor_nome,
          pr.nome_loja,
          pr.avaliacao_media,
          json_agg(
            json_build_object(
              'carrinho_id', c.id,
              'produto_id', c.produto_id,
              'produto_nome', p.nome,
              'quantidade', c.quantidade,
              'preco_unitario', c.preco_unitario,
              'subtotal', (c.quantidade * c.preco_unitario),
              'imagem_principal', p.imagem_principal
            ) ORDER BY c.created_at DESC
          ) as itens,
          SUM(c.quantidade * c.preco_unitario) as valor_total_produtor,
          COUNT(c.id) as total_itens_produtor
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        WHERE c.consumidor_id = $1
          AND p.is_ativo = true
          AND u.is_ativo = true
          AND produto_esta_valido(p.id) = true
        GROUP BY p.produtor_id, u.nome_completo, pr.nome_loja, pr.avaliacao_media
        ORDER BY valor_total_produtor DESC
      `, [consumidor_id]);

      const produtores = result.rows.map(row => ({
        produtor_id: row.produtor_id,
        produtor: {
          nome: row.produtor_nome,
          loja: row.nome_loja,
          avaliacao: parseFloat(row.avaliacao_media || 0)
        },
        itens: row.itens,
        resumo: {
          valor_total: parseFloat(row.valor_total_produtor),
          total_itens: parseInt(row.total_itens_produtor)
        }
      }));

      const resumo_geral = {
        total_produtores: produtores.length,
        valor_total_geral: produtores.reduce((total, p) => total + p.resumo.valor_total, 0),
        total_itens_geral: produtores.reduce((total, p) => total + p.resumo.total_itens, 0)
      };

      return {
        produtores,
        resumo_geral
      };

    } catch (error) {
      throw error;
    }
  }

  // Limpar itens inválidos do carrinho
  static async cleanInvalidItems(consumidor_id) {
    try {
      const result = await pool.query(`
        DELETE FROM carrinho 
        WHERE consumidor_id = $1 
          AND produto_id NOT IN (
            SELECT id FROM produtos 
            WHERE is_ativo = true 
              AND produto_esta_valido(id) = true
          )
        RETURNING COUNT(*) as items_removidos
      `, [consumidor_id]);

      return {
        success: true,
        items_removidos: result.rowCount
      };
    } catch (error) {
      throw error;
    }
  }

  // Contar itens no carrinho
  static async countItems(consumidor_id) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(c.id) as total_produtos,
          COALESCE(SUM(c.quantidade), 0) as total_itens,
          COALESCE(SUM(c.quantidade * c.preco_unitario), 0) as valor_total
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        WHERE c.consumidor_id = $1
          AND p.is_ativo = true
          AND produto_esta_valido(p.id) = true
      `, [consumidor_id]);

      return {
        total_produtos: parseInt(result.rows[0].total_produtos),
        total_itens: parseInt(result.rows[0].total_itens),
        valor_total: parseFloat(result.rows[0].valor_total)
      };
    } catch (error) {
      throw error;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      consumidor_id: this.consumidor_id,
      produto_id: this.produto_id,
      quantidade: this.quantidade,
      preco_unitario: parseFloat(this.preco_unitario),
      subtotal: parseFloat((this.quantidade * this.preco_unitario).toFixed(2)),
      created_at: this.created_at
    };
  }
}

module.exports = Carrinho;