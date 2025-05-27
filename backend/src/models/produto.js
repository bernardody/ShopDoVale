const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class Produto {
  constructor(data = {}) {
    this.id = data.id;
    this.nome = data.nome;
    this.descricao = data.descricao;
    this.preco = data.preco;
    this.quantidade_estoque = data.quantidade_estoque;
    this.imagem_principal = data.imagem_principal;
    this.is_ativo = data.is_ativo !== undefined ? data.is_ativo : true;
    this.produtor_id = data.produtor_id;
    this.categoria_id = data.categoria_id;
    this.semana_ano = data.semana_ano;
    this.ano = data.ano;
    this.data_validade = data.data_validade;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar produto por ID
  static async findById(id) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.produtor_id, p.categoria_id,
          p.semana_ano, p.ano, p.data_validade, p.created_at, p.updated_at,
          c.nome as categoria_nome, c.slug as categoria_slug,
          u.nome_completo as produtor_nome,
          pr.nome_loja, pr.avaliacao_media, pr.total_avaliacoes,
          e.cidade as produtor_cidade, e.estado as produtor_estado
        FROM produtos p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return Produto.formatProdutoData(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar produtos com filtros e paginação
  static async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 12,
        categoria_id,
        produtor_id,
        is_ativo = true,
        search,
        preco_min,
        preco_max,
        cidade,
        semana_atual = true,
        orderBy = 'created_at',
        order = 'DESC'
      } = filters;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtros básicos
      if (is_ativo !== undefined) {
        paramCount++;
        whereConditions.push(`p.is_ativo = $${paramCount}`);
        queryParams.push(is_ativo === 'true' || is_ativo === true);
      }

      if (categoria_id) {
        paramCount++;
        whereConditions.push(`p.categoria_id = $${paramCount}`);
        queryParams.push(categoria_id);
      }

      if (produtor_id) {
        paramCount++;
        whereConditions.push(`p.produtor_id = $${paramCount}`);
        queryParams.push(produtor_id);
      }

      // Filtro de semana atual (padrão)
      if (semana_atual) {
        whereConditions.push(`p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)`);
        whereConditions.push(`p.ano = EXTRACT(YEAR FROM CURRENT_DATE)`);
        whereConditions.push(`p.data_validade >= CURRENT_DATE`);
      }

      // Busca por texto
      if (search) {
        paramCount++;
        whereConditions.push(`(
          p.nome ILIKE $${paramCount} OR 
          p.descricao ILIKE $${paramCount} OR
          c.nome ILIKE $${paramCount} OR
          pr.nome_loja ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      // Filtros de preço
      if (preco_min) {
        paramCount++;
        whereConditions.push(`p.preco >= $${paramCount}`);
        queryParams.push(parseFloat(preco_min));
      }

      if (preco_max) {
        paramCount++;
        whereConditions.push(`p.preco <= $${paramCount}`);
        queryParams.push(parseFloat(preco_max));
      }

      // Filtro por cidade
      if (cidade) {
        paramCount++;
        whereConditions.push(`e.cidade ILIKE $${paramCount}`);
        queryParams.push(`%${cidade}%`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar campos de ordenação
      const validOrderFields = ['created_at', 'nome', 'preco', 'quantidade_estoque'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Query principal
      const query = `
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.data_validade, p.created_at,
          c.nome as categoria_nome, c.slug as categoria_slug,
          u.nome_completo as produtor_nome,
          pr.nome_loja, pr.avaliacao_media,
          e.cidade as produtor_cidade, e.estado as produtor_estado
        FROM produtos p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
        ORDER BY p.${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM produtos p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Formatar dados dos produtos
      const produtos = result.rows.map(row => Produto.formatProdutoData(row));

      return {
        produtos,
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

  // Buscar produtos por produtor
  static async findByProdutor(produtorId, filters = {}) {
    try {
      const newFilters = { ...filters, produtor_id: produtorId };
      return await Produto.findAll(newFilters);
    } catch (error) {
      throw error;
    }
  }

  // Buscar produtos por categoria
  static async findByCategoria(categoriaId, filters = {}) {
    try {
      const newFilters = { ...filters, categoria_id: categoriaId };
      return await Produto.findAll(newFilters);
    } catch (error) {
      throw error;
    }
  }

  // Criar produto
  static async create(produtoData) {
    try {
      const {
        nome,
        descricao,
        preco,
        quantidade_estoque,
        imagem_principal,
        produtor_id,
        categoria_id
      } = produtoData;

      // Definir semana e ano atuais
      const semana_ano = `EXTRACT(WEEK FROM CURRENT_DATE)`;
      const ano = `EXTRACT(YEAR FROM CURRENT_DATE)`;
      const data_validade = `(CURRENT_DATE + INTERVAL '6 days')`;

      const result = await pool.query(`
        INSERT INTO produtos (
          nome, descricao, preco, quantidade_estoque, imagem_principal,
          produtor_id, categoria_id, semana_ano, ano, data_validade
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, ${semana_ano}, ${ano}, ${data_validade})
        RETURNING id, nome, preco, quantidade_estoque, created_at, semana_ano, ano, data_validade
      `, [
        nome,
        descricao,
        parseFloat(preco),
        parseInt(quantidade_estoque),
        imagem_principal || null,
        produtor_id,
        categoria_id
      ]);

      const produto = result.rows[0];
      return new Produto(produto);

    } catch (error) {
      throw error;
    }
  }

  // Atualizar produto
  async update(updateData) {
    try {
      const {
        nome,
        descricao,
        preco,
        quantidade_estoque,
        imagem_principal,
        categoria_id
      } = updateData;

      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (nome) {
        paramCount++;
        updateFields.push(`nome = $${paramCount}`);
        updateValues.push(nome);
      }

      if (descricao) {
        paramCount++;
        updateFields.push(`descricao = $${paramCount}`);
        updateValues.push(descricao);
      }

      if (preco !== undefined) {
        paramCount++;
        updateFields.push(`preco = $${paramCount}`);
        updateValues.push(parseFloat(preco));
      }

      if (quantidade_estoque !== undefined) {
        paramCount++;
        updateFields.push(`quantidade_estoque = $${paramCount}`);
        updateValues.push(parseInt(quantidade_estoque));
      }

      if (imagem_principal !== undefined) {
        paramCount++;
        updateFields.push(`imagem_principal = $${paramCount}`);
        updateValues.push(imagem_principal || null);
      }

      if (categoria_id) {
        paramCount++;
        updateFields.push(`categoria_id = $${paramCount}`);
        updateValues.push(categoria_id);
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo fornecido para atualização');
      }

      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(this.id);

      const updateQuery = `
        UPDATE produtos 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id
      `;

      await pool.query(updateQuery, updateValues);

      // Buscar dados atualizados
      const updatedProduto = await Produto.findById(this.id);
      return updatedProduto;

    } catch (error) {
      throw error;
    }
  }

  // Atualizar estoque
  async updateEstoque(novaQuantidade) {
    try {
      const result = await pool.query(
        'UPDATE produtos SET quantidade_estoque = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade_estoque',
        [parseInt(novaQuantidade), this.id]
      );

      this.quantidade_estoque = result.rows[0].quantidade_estoque;
      return this.quantidade_estoque;
    } catch (error) {
      throw error;
    }
  }

  // Reduzir estoque (para pedidos)
  async reduzirEstoque(quantidade) {
    try {
      const result = await pool.query(`
        UPDATE produtos 
        SET quantidade_estoque = quantidade_estoque - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 AND quantidade_estoque >= $1
        RETURNING quantidade_estoque
      `, [parseInt(quantidade), this.id]);

      if (result.rows.length === 0) {
        throw new Error('Estoque insuficiente');
      }

      this.quantidade_estoque = result.rows[0].quantidade_estoque;
      return this.quantidade_estoque;
    } catch (error) {
      throw error;
    }
  }

  // Alterar status ativo/inativo
  async toggleStatus(isAtivo) {
    try {
      const result = await pool.query(
        'UPDATE produtos SET is_ativo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING is_ativo',
        [isAtivo, this.id]
      );

      this.is_ativo = result.rows[0].is_ativo;
      return this.is_ativo;
    } catch (error) {
      throw error;
    }
  }

  // Deletar produto
  async delete() {
    try {
      // Verificar se produto está em pedidos
      const pedidosExist = await pool.query(
        'SELECT id FROM itens_pedido WHERE produto_id = $1 LIMIT 1',
        [this.id]
      );

      if (pedidosExist.rows.length > 0) {
        // Se tem pedidos, apenas desativa (soft delete)
        await this.toggleStatus(false);
        return { action: 'deactivated' };
      }

      // Se não tem pedidos, pode deletar (hard delete)
      await pool.query('DELETE FROM produtos WHERE id = $1', [this.id]);
      return { action: 'deleted' };

    } catch (error) {
      throw error;
    }
  }

  // Verificar se produto está válido (semana atual e ativo)
  async isValid() {
    try {
      const result = await pool.query(
        'SELECT produto_esta_valido($1) as valido',
        [this.id]
      );

      return result.rows[0].valido;
    } catch (error) {
      throw error;
    }
  }

  // Estatísticas de produtos
  static async getStats() {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(*) FILTER (WHERE is_ativo = true) as produtos_ativos,
          COUNT(*) FILTER (WHERE is_ativo = false) as produtos_inativos,
          COUNT(*) FILTER (WHERE quantidade_estoque = 0) as produtos_sem_estoque,
          COUNT(*) FILTER (WHERE semana_ano = EXTRACT(WEEK FROM CURRENT_DATE) 
                          AND ano = EXTRACT(YEAR FROM CURRENT_DATE)) as produtos_semana_atual,
          AVG(preco) as preco_medio,
          SUM(quantidade_estoque) as estoque_total
        FROM produtos
      `);

      const result = stats.rows[0];
      return {
        ...result,
        preco_medio: parseFloat(result.preco_medio || 0),
        estoque_total: parseInt(result.estoque_total || 0)
      };
    } catch (error) {
      throw error;
    }
  }

  // Produtos mais vendidos
  static async getMaisVendidos(limit = 10) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, p.nome, p.preco, p.imagem_principal,
          pr.nome_loja,
          COUNT(ip.produto_id) as total_vendas,
          SUM(ip.quantidade) as quantidade_vendida
        FROM produtos p
        JOIN itens_pedido ip ON p.id = ip.produto_id
        JOIN pedidos pe ON ip.pedido_id = pe.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        WHERE pe.status_pedido IN ('confirmado', 'preparando', 'entregue')
        GROUP BY p.id, p.nome, p.preco, p.imagem_principal, pr.nome_loja
        ORDER BY quantidade_vendida DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        ...row,
        total_vendas: parseInt(row.total_vendas),
        quantidade_vendida: parseInt(row.quantidade_vendida),
        preco: parseFloat(row.preco)
      }));
    } catch (error) {
      throw error;
    }
  }

  // Formatar dados do produto para resposta
  static formatProdutoData(row) {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      preco: parseFloat(row.preco),
      quantidade_estoque: row.quantidade_estoque,
      imagem_principal: row.imagem_principal,
      is_ativo: row.is_ativo,
      data_validade: row.data_validade,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categoria: {
        id: row.categoria_id,
        nome: row.categoria_nome,
        slug: row.categoria_slug
      },
      produtor: {
        id: row.produtor_id,
        nome: row.produtor_nome,
        nome_loja: row.nome_loja,
        avaliacao_media: parseFloat(row.avaliacao_media || 0),
        total_avaliacoes: row.total_avaliacoes || 0,
        cidade: row.produtor_cidade,
        estado: row.produtor_estado
      }
    };
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      preco: parseFloat(this.preco),
      quantidade_estoque: this.quantidade_estoque,
      imagem_principal: this.imagem_principal,
      is_ativo: this.is_ativo,
      data_validade: this.data_validade,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Produto;