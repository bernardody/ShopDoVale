const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class ProdutoController {
  // Listar produtos com filtros e paginação
  async getProdutos(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        categoria_id,
        produtor_id,
        is_ativo,
        search,
        apenas_semana_atual = true,
        orderBy = 'created_at',
        order = 'DESC',
        preco_min,
        preco_max,
        cidade,
        estado
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtro por semana atual (padrão)
      if (apenas_semana_atual === 'true' || apenas_semana_atual === true) {
        whereConditions.push(`p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)`);
        whereConditions.push(`p.ano = EXTRACT(YEAR FROM CURRENT_DATE)`);
        whereConditions.push(`p.data_validade >= CURRENT_DATE`);
      }

      // Filtros básicos
      if (categoria_id) {
        paramCount++;
        whereConditions.push(`p.categoria_id = $${paramCount}`);
        queryParams.push(parseInt(categoria_id));
      }

      if (produtor_id) {
        paramCount++;
        whereConditions.push(`p.produtor_id = $${paramCount}`);
        queryParams.push(produtor_id);
      }

      if (is_ativo !== undefined) {
        paramCount++;
        whereConditions.push(`p.is_ativo = $${paramCount}`);
        queryParams.push(is_ativo === 'true');
      }

      // Filtro por preço
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

      // Filtro por localização
      if (cidade) {
        paramCount++;
        whereConditions.push(`e.cidade ILIKE $${paramCount}`);
        queryParams.push(`%${cidade}%`);
      }

      if (estado) {
        paramCount++;
        whereConditions.push(`e.estado ILIKE $${paramCount}`);
        queryParams.push(`%${estado}%`);
      }

      // Filtro de busca
      if (search) {
        paramCount++;
        whereConditions.push(`(
          p.nome ILIKE $${paramCount} OR 
          p.descricao ILIKE $${paramCount} OR
          c.nome ILIKE $${paramCount} OR
          u.nome_completo ILIKE $${paramCount} OR
          pr.nome_loja ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      // Apenas usuários ativos
      whereConditions.push(`u.is_ativo = true`);

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar campos de ordenação
      const validOrderFields = ['created_at', 'nome', 'preco', 'quantidade_estoque', 'data_validade'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Query principal
      const query = `
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.data_validade, p.created_at, p.updated_at,
          c.id as categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
          u.id as produtor_id, u.nome_completo as produtor_nome,
          pr.nome_loja, pr.avaliacao_media, pr.total_avaliacoes, pr.whatsapp,
          e.cidade as produtor_cidade, e.estado as produtor_estado,
          COALESCE(avg_aval.media_avaliacoes, 0) as produto_avaliacao_media,
          COALESCE(avg_aval.total_avaliacoes_produto, 0) as produto_total_avaliacoes
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN (
          SELECT 
            produto_id,
            AVG(nota::numeric) as media_avaliacoes,
            COUNT(*) as total_avaliacoes_produto
          FROM avaliacoes 
          GROUP BY produto_id
        ) avg_aval ON p.id = avg_aval.produto_id
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
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Formatar dados dos produtos
      const produtos = result.rows.map(row => ({
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
          loja: {
            nome_loja: row.nome_loja,
            avaliacao_media: parseFloat(row.avaliacao_media || 0),
            total_avaliacoes: row.total_avaliacoes || 0,
            whatsapp: row.whatsapp
          },
          endereco: {
            cidade: row.produtor_cidade,
            estado: row.produtor_estado
          }
        },
        avaliacoes: {
          media: parseFloat(row.produto_avaliacao_media || 0),
          total: parseInt(row.produto_total_avaliacoes || 0)
        }
      }));

      res.json({
        produtos,
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
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar produto por ID
  async getProdutoById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.semana_ano, p.ano, p.data_validade,
          p.created_at, p.updated_at,
          c.id as categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
          u.id as produtor_id, u.nome_completo as produtor_nome, u.telefone as produtor_telefone,
          pr.nome_loja, pr.descricao_loja, pr.logo_loja, pr.whatsapp, 
          pr.avaliacao_media, pr.total_avaliacoes,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado,
          COALESCE(avg_aval.media_avaliacoes, 0) as produto_avaliacao_media,
          COALESCE(avg_aval.total_avaliacoes_produto, 0) as produto_total_avaliacoes
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN (
          SELECT 
            produto_id,
            AVG(nota::numeric) as media_avaliacoes,
            COUNT(*) as total_avaliacoes_produto
          FROM avaliacoes 
          GROUP BY produto_id
        ) avg_aval ON p.id = avg_aval.produto_id
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const row = result.rows[0];
      const produto = {
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        preco: parseFloat(row.preco),
        quantidade_estoque: row.quantidade_estoque,
        imagem_principal: row.imagem_principal,
        is_ativo: row.is_ativo,
        semana_ano: row.semana_ano,
        ano: row.ano,
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
          telefone: row.produtor_telefone,
          loja: {
            nome_loja: row.nome_loja,
            descricao_loja: row.descricao_loja,
            logo_loja: row.logo_loja,
            whatsapp: row.whatsapp,
            avaliacao_media: parseFloat(row.avaliacao_media || 0),
            total_avaliacoes: row.total_avaliacoes || 0
          },
          endereco: {
            cep: row.cep,
            logradouro: row.logradouro,
            numero: row.numero,
            complemento: row.complemento,
            bairro: row.bairro,
            cidade: row.cidade,
            estado: row.estado
          }
        },
        avaliacoes: {
          media: parseFloat(row.produto_avaliacao_media || 0),
          total: parseInt(row.produto_total_avaliacoes || 0)
        }
      };

      // Buscar avaliações do produto
      const avaliacoesResult = await pool.query(`
        SELECT 
          a.id, a.nota, a.comentario, a.created_at,
          u.nome_completo as consumidor_nome
        FROM avaliacoes a
        INNER JOIN usuarios u ON a.consumidor_id = u.id
        WHERE a.produto_id = $1
        ORDER BY a.created_at DESC
        LIMIT 10
      `, [id]);

      produto.avaliacoes.comentarios = avaliacoesResult.rows.map(aval => ({
        id: aval.id,
        nota: aval.nota,
        comentario: aval.comentario,
        created_at: aval.created_at,
        consumidor_nome: aval.consumidor_nome
      }));

      res.json({ produto });

    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Criar produto
  async createProduto(req, res) {
    try {
      const {
        nome,
        descricao,
        preco,
        quantidade_estoque = 0,
        imagem_principal,
        categoria_id,
        produtor_id
      } = req.body;

      // Validações básicas
      if (!nome || !descricao || !preco || !categoria_id || !produtor_id) {
        return res.status(400).json({
          error: 'Nome, descrição, preço, categoria e produtor são obrigatórios'
        });
      }

      if (preco <= 0) {
        return res.status(400).json({
          error: 'Preço deve ser maior que zero'
        });
      }

      if (quantidade_estoque < 0) {
        return res.status(400).json({
          error: 'Quantidade em estoque não pode ser negativa'
        });
      }

      // Verificar se categoria existe
      const categoriaExists = await pool.query(
        'SELECT id FROM categorias WHERE id = $1 AND is_ativa = true',
        [categoria_id]
      );

      if (categoriaExists.rows.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada ou inativa' });
      }

      // Verificar se produtor existe e é do tipo produtor
      const produtorExists = await pool.query(
        'SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario = $2 AND is_ativo = true',
        [produtor_id, 'produtor']
      );

      if (produtorExists.rows.length === 0) {
        return res.status(404).json({ error: 'Produtor não encontrado ou inativo' });
      }

      // Verificar se já existe produto com mesmo nome do mesmo produtor na semana atual
      const produtoExists = await pool.query(`
        SELECT id FROM produtos 
        WHERE produtor_id = $1 AND nome = $2 
        AND semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
        AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
      `, [produtor_id, nome]);

      if (produtoExists.rows.length > 0) {
        return res.status(409).json({
          error: 'Já existe um produto com este nome para este produtor nesta semana'
        });
      }

      // Criar produto
      const result = await pool.query(`
        INSERT INTO produtos (
          nome, descricao, preco, quantidade_estoque, imagem_principal,
          categoria_id, produtor_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `, [
        nome.trim(),
        descricao.trim(),
        parseFloat(preco),
        parseInt(quantidade_estoque),
        imagem_principal || null,
        parseInt(categoria_id),
        produtor_id
      ]);

      const novoProduto = result.rows[0];

      // Buscar dados completos do produto criado
      const produtoCompleto = await pool.query(`
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.data_validade, p.created_at,
          c.nome as categoria_nome, c.slug as categoria_slug,
          pr.nome_loja
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        WHERE p.id = $1
      `, [novoProduto.id]);

      const produto = produtoCompleto.rows[0];

      res.status(201).json({
        message: 'Produto criado com sucesso',
        produto: {
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          preco: parseFloat(produto.preco),
          quantidade_estoque: produto.quantidade_estoque,
          imagem_principal: produto.imagem_principal,
          is_ativo: produto.is_ativo,
          data_validade: produto.data_validade,
          created_at: produto.created_at,
          categoria: {
            nome: produto.categoria_nome,
            slug: produto.categoria_slug
          },
          loja: {
            nome_loja: produto.nome_loja
          }
        }
      });

    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar produto
  async updateProduto(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        descricao,
        preco,
        quantidade_estoque,
        imagem_principal,
        categoria_id,
        is_ativo
      } = req.body;

      // Verificar se produto existe
      const produtoExists = await pool.query(
        'SELECT id, produtor_id, nome FROM produtos WHERE id = $1',
        [id]
      );

      if (produtoExists.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const produtoAtual = produtoExists.rows[0];

      // Validações
      if (preco !== undefined && preco <= 0) {
        return res.status(400).json({
          error: 'Preço deve ser maior que zero'
        });
      }

      if (quantidade_estoque !== undefined && quantidade_estoque < 0) {
        return res.status(400).json({
          error: 'Quantidade em estoque não pode ser negativa'
        });
      }

      // Verificar categoria se informada
      if (categoria_id) {
        const categoriaExists = await pool.query(
          'SELECT id FROM categorias WHERE id = $1 AND is_ativa = true',
          [categoria_id]
        );

        if (categoriaExists.rows.length === 0) {
          return res.status(404).json({ error: 'Categoria não encontrada ou inativa' });
        }
      }

      // Verificar nome duplicado se alterado
      if (nome && nome !== produtoAtual.nome) {
        const nomeExists = await pool.query(`
          SELECT id FROM produtos 
          WHERE produtor_id = $1 AND nome = $2 AND id != $3
          AND semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
        `, [produtoAtual.produtor_id, nome, id]);

        if (nomeExists.rows.length > 0) {
          return res.status(409).json({
            error: 'Já existe outro produto com este nome para este produtor nesta semana'
          });
        }
      }

      // Montar query de atualização
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (nome) {
        paramCount++;
        updateFields.push(`nome = $${paramCount}`);
        updateValues.push(nome.trim());
      }

      if (descricao) {
        paramCount++;
        updateFields.push(`descricao = $${paramCount}`);
        updateValues.push(descricao.trim());
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
        updateValues.push(parseInt(categoria_id));
      }

      if (is_ativo !== undefined) {
        paramCount++;
        updateFields.push(`is_ativo = $${paramCount}`);
        updateValues.push(is_ativo);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'Nenhum campo válido fornecido para atualização'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      paramCount++;
      updateValues.push(id);

      const updateQuery = `
        UPDATE produtos 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING updated_at
      `;

      await pool.query(updateQuery, updateValues);

      // Buscar dados atualizados
      const produtoAtualizado = await pool.query(`
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.updated_at,
          c.nome as categoria_nome
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = $1
      `, [id]);

      const produto = produtoAtualizado.rows[0];

      res.json({
        message: 'Produto atualizado com sucesso',
        produto: {
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          preco: parseFloat(produto.preco),
          quantidade_estoque: produto.quantidade_estoque,
          imagem_principal: produto.imagem_principal,
          is_ativo: produto.is_ativo,
          updated_at: produto.updated_at,
          categoria: {
            nome: produto.categoria_nome
          }
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar produto
  async deleteProduto(req, res) {
    try {
      const { id } = req.params;

      // Verificar se produto tem itens em pedidos
      const pedidosExist = await pool.query(
        'SELECT id FROM itens_pedido WHERE produto_id = $1 LIMIT 1',
        [id]
      );

      if (pedidosExist.rows.length > 0) {
        // Se tem pedidos, apenas desativa
        const result = await pool.query(
          'UPDATE produtos SET is_ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING nome',
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Produto não encontrado' });
        }

        return res.json({
          message: 'Produto desativado (possui histórico de pedidos)',
          action: 'deactivated'
        });
      }

      // Se não tem pedidos, pode deletar
      const result = await pool.query(
        'DELETE FROM produtos WHERE id = $1 RETURNING nome',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json({
        message: 'Produto deletado com sucesso',
        action: 'deleted'
      });

    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar estoque
  async updateEstoque(req, res) {
    try {
      const { id } = req.params;
      const { quantidade_estoque, operacao = 'set' } = req.body;

      if (quantidade_estoque === undefined || quantidade_estoque === null) {
        return res.status(400).json({
          error: 'Quantidade em estoque é obrigatória'
        });
      }

      const qtd = parseInt(quantidade_estoque);
      if (isNaN(qtd)) {
        return res.status(400).json({
          error: 'Quantidade deve ser um número válido'
        });
      }

      let updateQuery;
      let finalQuantity = qtd;

      if (operacao === 'add') {
        updateQuery = `
          UPDATE produtos 
          SET quantidade_estoque = quantidade_estoque + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND is_ativo = true
          RETURNING quantidade_estoque
        `;
      } else if (operacao === 'subtract') {
        updateQuery = `
          UPDATE produtos 
          SET quantidade_estoque = GREATEST(0, quantidade_estoque - $1), updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND is_ativo = true
          RETURNING quantidade_estoque
        `;
      } else {
        // operacao === 'set' (padrão)
        if (qtd < 0) {
          return res.status(400).json({
            error: 'Quantidade em estoque não pode ser negativa'
          });
        }
        updateQuery = `
          UPDATE produtos 
          SET quantidade_estoque = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND is_ativo = true
          RETURNING quantidade_estoque
        `;
      }

      const result = await pool.query(updateQuery, [qtd, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado ou inativo' });
      }

      res.json({
        message: 'Estoque atualizado com sucesso',
        quantidade_estoque: result.rows[0].quantidade_estoque,
        operacao
      });

    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Produtos da semana atual (view)
  async getProdutosSemanaAtual(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        categoria_id,
        cidade,
        estado,
        search,
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtros
      if (categoria_id) {
        paramCount++;
        whereConditions.push(`categoria_id = $${paramCount}`);
        queryParams.push(parseInt(categoria_id));
      }

      if (cidade) {
        paramCount++;
        whereConditions.push(`produtor_cidade ILIKE $${paramCount}`);
        queryParams.push(`%${cidade}%`);
      }

      if (estado) {
        paramCount++;
        whereConditions.push(`produtor_estado ILIKE $${paramCount}`);
        queryParams.push(`%${estado}%`);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          nome ILIKE $${paramCount} OR 
          descricao ILIKE $${paramCount} OR
          categoria_nome ILIKE $${paramCount} OR
          produtor_nome ILIKE $${paramCount} OR
          nome_loja ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar ordenação
      const validOrderFields = ['created_at', 'nome', 'preco', 'avaliacao_media', 'data_validade'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const query = `
        SELECT * FROM vw_produtos_semana_atual
        ${whereClause}
        ORDER BY ${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total FROM vw_produtos_semana_atual
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      const produtos = result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        preco: parseFloat(row.preco),
        quantidade_estoque: row.quantidade_estoque,
        imagem_principal: row.imagem_principal,
        data_validade: row.data_validade,
        categoria: {
          nome: row.categoria_nome
        },
        produtor: {
          nome: row.produtor_nome,
          loja: {
            nome_loja: row.nome_loja,
            avaliacao_media: parseFloat(row.avaliacao_media || 0)
          },
          endereco: {
            cidade: row.produtor_cidade,
            estado: row.produtor_estado
          }
        }
      }));

      res.json({
        produtos,
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
      console.error('Erro ao buscar produtos da semana:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Listar produtos por produtor
  async getProdutosPorProdutor(req, res) {
    try {
      const { produtor_id } = req.params;
      const {
        page = 1,
        limit = 10,
        is_ativo,
        categoria_id,
        search,
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [`p.produtor_id = $1`];
      let queryParams = [produtor_id];
      let paramCount = 1;

      // Filtros
      if (is_ativo !== undefined) {
        paramCount++;
        whereConditions.push(`p.is_ativo = $${paramCount}`);
        queryParams.push(is_ativo === 'true');
      }

      if (categoria_id) {
        paramCount++;
        whereConditions.push(`p.categoria_id = $${paramCount}`);
        queryParams.push(parseInt(categoria_id));
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          p.nome ILIKE $${paramCount} OR 
          p.descricao ILIKE $${paramCount} OR
          c.nome ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Validar ordenação
      const validOrderFields = ['created_at', 'nome', 'preco', 'quantidade_estoque', 'data_validade'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Query principal
      const query = `
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.is_ativo, p.data_validade, p.created_at, p.updated_at,
          c.id as categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
          COALESCE(avg_aval.media_avaliacoes, 0) as produto_avaliacao_media,
          COALESCE(avg_aval.total_avaliacoes_produto, 0) as produto_total_avaliacoes
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN (
          SELECT 
            produto_id,
            AVG(nota::numeric) as media_avaliacoes,
            COUNT(*) as total_avaliacoes_produto
          FROM avaliacoes 
          GROUP BY produto_id
        ) avg_aval ON p.id = avg_aval.produto_id
        ${whereClause}
        ORDER BY p.${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Formatar dados dos produtos
      const produtos = result.rows.map(row => ({
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
        avaliacoes: {
          media: parseFloat(row.produto_avaliacao_media || 0),
          total: parseInt(row.produto_total_avaliacoes || 0)
        }
      }));

      res.json({
        produtos,
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
      console.error('Erro ao buscar produtos do produtor:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar produtos em promoção ou com desconto
  async getProdutosPromocao(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        categoria_id,
        cidade,
        estado,
        desconto_min = 10
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [`p.is_ativo = true`];
      let queryParams = [];
      let paramCount = 0;

      // Filtro por categoria
      if (categoria_id) {
        paramCount++;
        whereConditions.push(`p.categoria_id = $${paramCount}`);
        queryParams.push(parseInt(categoria_id));
      }

      // Filtro por localização
      if (cidade) {
        paramCount++;
        whereConditions.push(`e.cidade ILIKE $${paramCount}`);
        queryParams.push(`%${cidade}%`);
      }

      if (estado) {
        paramCount++;
        whereConditions.push(`e.estado ILIKE $${paramCount}`);
        queryParams.push(`%${estado}%`);
      }

      // Filtro para produtos próximos do vencimento (possível promoção)
      whereConditions.push(`p.data_validade <= CURRENT_DATE + INTERVAL '2 days'`);
      whereConditions.push(`p.data_validade >= CURRENT_DATE`);
      
      // Apenas usuários ativos
      whereConditions.push(`u.is_ativo = true`);

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const query = `
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.data_validade, p.created_at,
          c.nome as categoria_nome,
          pr.nome_loja, pr.avaliacao_media,
          e.cidade as produtor_cidade, e.estado as produtor_estado,
          EXTRACT(EPOCH FROM (p.data_validade - CURRENT_DATE)) / 3600 as horas_restantes
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
        ORDER BY p.data_validade ASC, p.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      const produtos = result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        preco: parseFloat(row.preco),
        quantidade_estoque: row.quantidade_estoque,
        imagem_principal: row.imagem_principal,
        data_validade: row.data_validade,
        created_at: row.created_at,
        horas_restantes: Math.max(0, Math.floor(row.horas_restantes)),
        categoria: {
          nome: row.categoria_nome
        },
        produtor: {
          loja: {
            nome_loja: row.nome_loja,
            avaliacao_media: parseFloat(row.avaliacao_media || 0)
          },
          endereco: {
            cidade: row.produtor_cidade,
            estado: row.produtor_estado
          }
        }
      }));

      res.json({
        produtos,
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
      console.error('Erro ao buscar produtos em promoção:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar produtos relacionados/similares
  async getProdutosRelacionados(req, res) {
    try {
      const { id } = req.params;
      const { limit = 6 } = req.query;

      // Buscar produto atual para pegar categoria e produtor
      const produtoAtual = await pool.query(`
        SELECT categoria_id, produtor_id FROM produtos WHERE id = $1
      `, [id]);

      if (produtoAtual.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const { categoria_id, produtor_id } = produtoAtual.rows[0];

      const query = `
        SELECT 
          p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque,
          p.imagem_principal, p.data_validade,
          c.nome as categoria_nome,
          pr.nome_loja, pr.avaliacao_media,
          e.cidade as produtor_cidade, e.estado as produtor_estado,
          COALESCE(avg_aval.media_avaliacoes, 0) as produto_avaliacao_media,
          CASE 
            WHEN p.categoria_id = $2 AND p.produtor_id = $3 THEN 3
            WHEN p.categoria_id = $2 THEN 2
            WHEN p.produtor_id = $3 THEN 1
            ELSE 0
          END as relevancia
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        INNER JOIN usuarios u ON p.produtor_id = u.id
        INNER JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN (
          SELECT 
            produto_id,
            AVG(nota::numeric) as media_avaliacoes
          FROM avaliacoes 
          GROUP BY produto_id
        ) avg_aval ON p.id = avg_aval.produto_id
        WHERE p.id != $1 
          AND p.is_ativo = true 
          AND u.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.data_validade >= CURRENT_DATE
          AND (p.categoria_id = $2 OR p.produtor_id = $3)
        ORDER BY relevancia DESC, produto_avaliacao_media DESC, p.created_at DESC
        LIMIT $4
      `;

      const result = await pool.query(query, [id, categoria_id, produtor_id, parseInt(limit)]);

      const produtos = result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        preco: parseFloat(row.preco),
        quantidade_estoque: row.quantidade_estoque,
        imagem_principal: row.imagem_principal,
        data_validade: row.data_validade,
        categoria: {
          nome: row.categoria_nome
        },
        produtor: {
          loja: {
            nome_loja: row.nome_loja,
            avaliacao_media: parseFloat(row.avaliacao_media || 0)
          },
          endereco: {
            cidade: row.produtor_cidade,
            estado: row.produtor_estado
          }
        },
        avaliacoes: {
          media: parseFloat(row.produto_avaliacao_media || 0)
        }
      }));

      res.json({
        produtos_relacionados: produtos
      });

    } catch (error) {
      console.error('Erro ao buscar produtos relacionados:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Estatísticas de produtos para o produtor
  async getEstatisticasProdutos(req, res) {
    try {
      const { produtor_id } = req.params;

      // Verificar se é um produtor válido
      const produtorExists = await pool.query(
        'SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario = $2 AND is_ativo = true',
        [produtor_id, 'produtor']
      );

      if (produtorExists.rows.length === 0) {
        return res.status(404).json({ error: 'Produtor não encontrado ou inativo' });
      }

      // Estatísticas gerais
      const estatisticasGerais = await pool.query(`
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(CASE WHEN is_ativo = true THEN 1 END) as produtos_ativos,
          COUNT(CASE WHEN is_ativo = false THEN 1 END) as produtos_inativos,
          AVG(preco) as preco_medio,
          SUM(quantidade_estoque) as estoque_total,
          COUNT(CASE WHEN quantidade_estoque = 0 THEN 1 END) as produtos_sem_estoque
        FROM produtos 
        WHERE produtor_id = $1
      `, [produtor_id]);

      // Produtos mais vendidos (baseado em itens_pedido)
      const maisVendidos = await pool.query(`
        SELECT 
          p.id, p.nome, p.imagem_principal,
          SUM(ip.quantidade) as total_vendido,
          SUM(ip.subtotal) as total_faturado
        FROM produtos p
        INNER JOIN itens_pedido ip ON p.id = ip.produto_id
        INNER JOIN pedidos pd ON ip.pedido_id = pd.id
        WHERE p.produtor_id = $1
          AND pd.status_pedido IN ('confirmado', 'preparando', 'entregue')
        GROUP BY p.id, p.nome, p.imagem_principal
        ORDER BY total_vendido DESC
        LIMIT 5
      `, [produtor_id]);

      // Produtos por categoria
      const porCategoria = await pool.query(`
        SELECT 
          c.nome as categoria,
          COUNT(*) as quantidade_produtos,
          AVG(p.preco) as preco_medio_categoria
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        WHERE p.produtor_id = $1
        GROUP BY c.id, c.nome
        ORDER BY quantidade_produtos DESC
      `, [produtor_id]);

      // Produtos da semana atual
      const semanaAtual = await pool.query(`
        SELECT 
          COUNT(*) as produtos_semana_atual,
          COUNT(CASE WHEN data_validade < CURRENT_DATE + INTERVAL '1 day' THEN 1 END) as produtos_vencendo,
          COUNT(CASE WHEN quantidade_estoque > 0 THEN 1 END) as produtos_com_estoque
        FROM produtos 
        WHERE produtor_id = $1
          AND semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
          AND is_ativo = true
      `, [produtor_id]);

      const estatisticas = {
        geral: {
          total_produtos: parseInt(estatisticasGerais.rows[0].total_produtos),
          produtos_ativos: parseInt(estatisticasGerais.rows[0].produtos_ativos),
          produtos_inativos: parseInt(estatisticasGerais.rows[0].produtos_inativos),
          preco_medio: parseFloat(estatisticasGerais.rows[0].preco_medio || 0),
          estoque_total: parseInt(estatisticasGerais.rows[0].estoque_total || 0),
          produtos_sem_estoque: parseInt(estatisticasGerais.rows[0].produtos_sem_estoque)
        },
        semana_atual: {
          produtos_semana_atual: parseInt(semanaAtual.rows[0].produtos_semana_atual),
          produtos_vencendo: parseInt(semanaAtual.rows[0].produtos_vencendo),
          produtos_com_estoque: parseInt(semanaAtual.rows[0].produtos_com_estoque)
        },
        mais_vendidos: maisVendidos.rows.map(row => ({
          id: row.id,
          nome: row.nome,
          imagem_principal: row.imagem_principal,
          total_vendido: parseInt(row.total_vendido),
          total_faturado: parseFloat(row.total_faturado)
        })),
        por_categoria: porCategoria.rows.map(row => ({
          categoria: row.categoria,
          quantidade_produtos: parseInt(row.quantidade_produtos),
          preco_medio_categoria: parseFloat(row.preco_medio_categoria)
        }))
      };

      res.json({ estatisticas });

    } catch (error) {
      console.error('Erro ao buscar estatísticas de produtos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = ProdutoController;