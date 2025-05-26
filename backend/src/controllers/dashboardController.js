const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class DashboardController {
  // Dashboard geral - visão administrativa
  async getGeneralDashboard(req, res) {
    try {
      const { periodo = '30' } = req.query; // dias
      const diasPeriodo = parseInt(periodo);

      // Estatísticas gerais
      const statsQuery = `
        SELECT 
          -- Usuários
          COUNT(DISTINCT u.id) as total_usuarios,
          COUNT(DISTINCT u.id) FILTER (WHERE u.tipo_usuario = 'consumidor') as total_consumidores,
          COUNT(DISTINCT u.id) FILTER (WHERE u.tipo_usuario = 'produtor') as total_produtores,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_ativo = true) as usuarios_ativos,
          COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days') as novos_usuarios_periodo,
          
          -- Produtos
          COUNT(DISTINCT p.id) as total_produtos_semana,
          COUNT(DISTINCT p.id) FILTER (WHERE p.is_ativo = true) as produtos_ativos,
          COUNT(DISTINCT p.categoria_id) as categorias_ativas,
          AVG(p.preco) as preco_medio_produtos,
          
          -- Pedidos
          COUNT(DISTINCT ped.id) as total_pedidos,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days') as pedidos_periodo,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'entregue') as pedidos_entregues,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'pendente') as pedidos_pendentes,
          SUM(ped.valor_total) FILTER (WHERE ped.status_pedido = 'entregue') as receita_total,
          SUM(ped.valor_total) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days' AND ped.status_pedido = 'entregue') as receita_periodo,
          AVG(ped.valor_total) as ticket_medio
          
        FROM usuarios u
        LEFT JOIN produtos p ON u.id = p.produtor_id 
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN pedidos ped ON u.id = ped.consumidor_id OR u.id = ped.produtor_id
      `;

      const statsResult = await pool.query(statsQuery);
      const stats = statsResult.rows[0];

      // Vendas por dia nos últimos 30 dias
      const vendasDiariaQuery = `
        SELECT 
          DATE(created_at) as data,
          COUNT(*) as total_pedidos,
          SUM(valor_total) as receita_dia,
          COUNT(DISTINCT consumidor_id) as consumidores_unicos
        FROM pedidos 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND status_pedido IN ('confirmado', 'preparando', 'entregue')
        GROUP BY DATE(created_at)
        ORDER BY data DESC
        LIMIT 30
      `;

      const vendasResult = await pool.query(vendasDiariaQuery);

      // Top categorias
      const topCategoriasQuery = `
        SELECT 
          c.nome as categoria,
          COUNT(DISTINCT p.id) as total_produtos,
          COUNT(DISTINCT ip.id) as total_vendas,
          SUM(ip.subtotal) as receita_categoria
        FROM categorias c
        LEFT JOIN produtos p ON c.id = p.categoria_id
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        WHERE c.is_ativa = true
        GROUP BY c.id, c.nome
        ORDER BY receita_categoria DESC NULLS LAST
        LIMIT 10
      `;

      const categoriasResult = await pool.query(topCategoriasQuery);

      // Top produtores
      const topProdutoresQuery = `
        SELECT 
          u.nome_completo,
          pr.nome_loja,
          pr.avaliacao_media,
          COUNT(DISTINCT p.id) as produtos_ativos,
          COUNT(DISTINCT ped.id) as total_pedidos,
          SUM(ped.valor_total) FILTER (WHERE ped.status_pedido IN ('confirmado', 'preparando', 'entregue')) as receita_total,
          e.cidade, e.estado
        FROM usuarios u
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN produtos p ON u.id = p.produtor_id
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN pedidos ped ON u.id = ped.produtor_id
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE u.is_ativo = true
        GROUP BY u.id, u.nome_completo, pr.nome_loja, pr.avaliacao_media, e.cidade, e.estado
        ORDER BY receita_total DESC NULLS LAST
        LIMIT 10
      `;

      const produtoresResult = await pool.query(topProdutoresQuery);

      // Status dos pedidos
      const statusPedidosQuery = `
        SELECT 
          status_pedido,
          COUNT(*) as quantidade,
          SUM(valor_total) as valor_total
        FROM pedidos
        WHERE created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        GROUP BY status_pedido
        ORDER BY quantidade DESC
      `;

      const statusResult = await pool.query(statusPedidosQuery);

      res.json({
        periodo: diasPeriodo,
        estatisticas_gerais: {
          usuarios: {
            total: parseInt(stats.total_usuarios || 0),
            consumidores: parseInt(stats.total_consumidores || 0),
            produtores: parseInt(stats.total_produtores || 0),
            ativos: parseInt(stats.usuarios_ativos || 0),
            novos_periodo: parseInt(stats.novos_usuarios_periodo || 0)
          },
          produtos: {
            total_semana_atual: parseInt(stats.total_produtos_semana || 0),
            ativos: parseInt(stats.produtos_ativos || 0),
            categorias_ativas: parseInt(stats.categorias_ativas || 0),
            preco_medio: parseFloat(stats.preco_medio_produtos || 0).toFixed(2)
          },
          pedidos: {
            total: parseInt(stats.total_pedidos || 0),
            periodo: parseInt(stats.pedidos_periodo || 0),
            entregues: parseInt(stats.pedidos_entregues || 0),
            pendentes: parseInt(stats.pedidos_pendentes || 0),
            ticket_medio: parseFloat(stats.ticket_medio || 0).toFixed(2)
          },
          financeiro: {
            receita_total: parseFloat(stats.receita_total || 0).toFixed(2),
            receita_periodo: parseFloat(stats.receita_periodo || 0).toFixed(2)
          }
        },
        vendas_diarias: vendasResult.rows.map(row => ({
          data: row.data,
          pedidos: parseInt(row.total_pedidos),
          receita: parseFloat(row.receita_dia || 0).toFixed(2),
          consumidores_unicos: parseInt(row.consumidores_unicos)
        })),
        top_categorias: categoriasResult.rows.map(row => ({
          categoria: row.categoria,
          produtos: parseInt(row.total_produtos || 0),
          vendas: parseInt(row.total_vendas || 0),
          receita: parseFloat(row.receita_categoria || 0).toFixed(2)
        })),
        top_produtores: produtoresResult.rows.map(row => ({
          nome: row.nome_completo,
          loja: row.nome_loja,
          avaliacao: parseFloat(row.avaliacao_media || 0).toFixed(2),
          produtos_ativos: parseInt(row.produtos_ativos || 0),
          pedidos: parseInt(row.total_pedidos || 0),
          receita: parseFloat(row.receita_total || 0).toFixed(2),
          localizacao: row.cidade && row.estado ? `${row.cidade}/${row.estado}` : null
        })),
        status_pedidos: statusResult.rows.map(row => ({
          status: row.status_pedido,
          quantidade: parseInt(row.quantidade),
          valor_total: parseFloat(row.valor_total).toFixed(2)
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar dashboard geral:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Dashboard do produtor
  async getProducerDashboard(req, res) {
    try {
      const { produtor_id } = req.params;
      const { periodo = '30' } = req.query;
      const diasPeriodo = parseInt(periodo);

      // Verificar se é produtor
      const produtorCheck = await pool.query(
        'SELECT u.id FROM usuarios u WHERE u.id = $1 AND u.tipo_usuario = $2 AND u.is_ativo = true',
        [produtor_id, 'produtor']
      );

      if (produtorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Produtor não encontrado' });
      }

      // Estatísticas do produtor
      const statsQuery = `
        SELECT 
          -- Produtos
          COUNT(DISTINCT p.id) as produtos_ativos,
          AVG(p.preco) as preco_medio,
          SUM(p.quantidade_estoque) as estoque_total,
          
          -- Pedidos
          COUNT(DISTINCT ped.id) as total_pedidos,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days') as pedidos_periodo,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'pendente') as pedidos_pendentes,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'entregue') as pedidos_entregues,
          
          -- Financeiro
          SUM(ped.valor_total) FILTER (WHERE ped.status_pedido = 'entregue') as receita_total,
          SUM(ped.valor_total) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days' AND ped.status_pedido = 'entregue') as receita_periodo,
          AVG(ped.valor_total) as ticket_medio,
          
          -- Clientes
          COUNT(DISTINCT ped.consumidor_id) as clientes_unicos,
          COUNT(DISTINCT ped.consumidor_id) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days') as novos_clientes_periodo
          
        FROM produtos p
        LEFT JOIN pedidos ped ON p.produtor_id = ped.produtor_id
        WHERE p.produtor_id = $1
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
      `;

      const statsResult = await pool.query(statsQuery, [produtor_id]);
      const stats = statsResult.rows[0];

      // Produtos mais vendidos
      const produtosMaisVendidosQuery = `
        SELECT 
          p.nome,
          p.preco,
          p.quantidade_estoque,
          COUNT(ip.id) as total_vendas,
          SUM(ip.quantidade) as quantidade_vendida,
          SUM(ip.subtotal) as receita_produto,
          c.nome as categoria
        FROM produtos p
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.produtor_id = $1
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY p.id, p.nome, p.preco, p.quantidade_estoque, c.nome
        ORDER BY quantidade_vendida DESC NULLS LAST
        LIMIT 10
      `;

      const produtosResult = await pool.query(produtosMaisVendidosQuery, [produtor_id]);

      // Pedidos recentes
      const pedidosRecentesQuery = `
        SELECT 
          ped.id,
          ped.numero_pedido,
          ped.valor_total,
          ped.status_pedido,
          ped.created_at,
          u.nome_completo as cliente_nome,
          COUNT(ip.id) as total_itens
        FROM pedidos ped
        JOIN usuarios u ON ped.consumidor_id = u.id
        LEFT JOIN itens_pedido ip ON ped.id = ip.pedido_id
        WHERE ped.produtor_id = $1
        GROUP BY ped.id, ped.numero_pedido, ped.valor_total, ped.status_pedido, ped.created_at, u.nome_completo
        ORDER BY ped.created_at DESC
        LIMIT 10
      `;

      const pedidosResult = await pool.query(pedidosRecentesQuery, [produtor_id]);

      // Vendas por categoria
      const vendasCategoriaQuery = `
        SELECT 
          c.nome as categoria,
          COUNT(DISTINCT p.id) as produtos_categoria,
          COUNT(ip.id) as vendas_categoria,
          SUM(ip.subtotal) as receita_categoria
        FROM categorias c
        LEFT JOIN produtos p ON c.id = p.categoria_id
          AND p.produtor_id = $1
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
        WHERE c.is_ativa = true
        GROUP BY c.id, c.nome
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY receita_categoria DESC NULLS LAST
      `;

      const categoriasResult = await pool.query(vendasCategoriaQuery, [produtor_id]);

      // Avaliações recentes
      const avaliacoesQuery = `
        SELECT 
          a.nota,
          a.comentario,
          a.created_at,
          u.nome_completo as cliente_nome,
          p.nome as produto_nome
        FROM avaliacoes a
        JOIN usuarios u ON a.consumidor_id = u.id
        JOIN produtos p ON a.produto_id = p.id
        WHERE p.produtor_id = $1
        ORDER BY a.created_at DESC
        LIMIT 5
      `;

      const avaliacoesResult = await pool.query(avaliacoesQuery, [produtor_id]);

      res.json({
        produtor_id,
        periodo: diasPeriodo,
        estatisticas: {
          produtos: {
            ativos: parseInt(stats.produtos_ativos || 0),
            preco_medio: parseFloat(stats.preco_medio || 0).toFixed(2),
            estoque_total: parseInt(stats.estoque_total || 0)
          },
          pedidos: {
            total: parseInt(stats.total_pedidos || 0),
            periodo: parseInt(stats.pedidos_periodo || 0),
            pendentes: parseInt(stats.pedidos_pendentes || 0),
            entregues: parseInt(stats.pedidos_entregues || 0),
            ticket_medio: parseFloat(stats.ticket_medio || 0).toFixed(2)
          },
          financeiro: {
            receita_total: parseFloat(stats.receita_total || 0).toFixed(2),
            receita_periodo: parseFloat(stats.receita_periodo || 0).toFixed(2)
          },
          clientes: {
            unicos: parseInt(stats.clientes_unicos || 0),
            novos_periodo: parseInt(stats.novos_clientes_periodo || 0)
          }
        },
        produtos_mais_vendidos: produtosResult.rows.map(row => ({
          nome: row.nome,
          preco: parseFloat(row.preco).toFixed(2),
          estoque: parseInt(row.quantidade_estoque),
          vendas: parseInt(row.total_vendas || 0),
          quantidade_vendida: parseInt(row.quantidade_vendida || 0),
          receita: parseFloat(row.receita_produto || 0).toFixed(2),
          categoria: row.categoria
        })),
        pedidos_recentes: pedidosResult.rows.map(row => ({
          id: row.id,
          numero: row.numero_pedido,
          valor: parseFloat(row.valor_total).toFixed(2),
          status: row.status_pedido,
          data: row.created_at,
          cliente: row.cliente_nome,
          itens: parseInt(row.total_itens)
        })),
        vendas_por_categoria: categoriasResult.rows.map(row => ({
          categoria: row.categoria,
          produtos: parseInt(row.produtos_categoria || 0),
          vendas: parseInt(row.vendas_categoria || 0),
          receita: parseFloat(row.receita_categoria || 0).toFixed(2)
        })),
        avaliacoes_recentes: avaliacoesResult.rows.map(row => ({
          nota: parseInt(row.nota),
          comentario: row.comentario,
          data: row.created_at,
          cliente: row.cliente_nome,
          produto: row.produto_nome
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar dashboard do produtor:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Dashboard do consumidor
  async getConsumerDashboard(req, res) {
    try {
      const { consumidor_id } = req.params;
      const { periodo = '90' } = req.query;
      const diasPeriodo = parseInt(periodo);

      // Verificar se é consumidor
      const consumidorCheck = await pool.query(
        'SELECT u.id FROM usuarios u WHERE u.id = $1 AND u.tipo_usuario = $2 AND u.is_ativo = true',
        [consumidor_id, 'consumidor']
      );

      if (consumidorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Consumidor não encontrado' });
      }

      // Estatísticas do consumidor
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT ped.id) as total_pedidos,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days') as pedidos_periodo,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'entregue') as pedidos_entregues,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'pendente') as pedidos_pendentes,
          SUM(ped.valor_total) as gasto_total,
          SUM(ped.valor_total) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days') as gasto_periodo,
          AVG(ped.valor_total) as ticket_medio,
          COUNT(DISTINCT ped.produtor_id) as produtores_diferentes,
          COUNT(DISTINCT ip.produto_id) as produtos_diferentes
        FROM pedidos ped
        LEFT JOIN itens_pedido ip ON ped.id = ip.pedido_id
        WHERE ped.consumidor_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [consumidor_id]);
      const stats = statsResult.rows[0];

      // Histórico de pedidos
      const pedidosQuery = `
        SELECT 
          ped.id,
          ped.numero_pedido,
          ped.valor_total,
          ped.status_pedido,
          ped.created_at,
          pr.nome_loja,
          u.nome_completo as produtor_nome,
          COUNT(ip.id) as total_itens
        FROM pedidos ped
        JOIN usuarios u ON ped.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN itens_pedido ip ON ped.id = ip.pedido_id
        WHERE ped.consumidor_id = $1
        GROUP BY ped.id, ped.numero_pedido, ped.valor_total, ped.status_pedido, ped.created_at, pr.nome_loja, u.nome_completo
        ORDER BY ped.created_at DESC
        LIMIT 10
      `;

      const pedidosResult = await pool.query(pedidosQuery, [consumidor_id]);

      // Produtos favoritos (mais comprados)
      const produtosFavoritosQuery = `
        SELECT 
          p.nome,
          p.preco,
          c.nome as categoria,
          pr.nome_loja,
          u.nome_completo as produtor_nome,
          COUNT(ip.id) as vezes_comprado,
          SUM(ip.quantidade) as quantidade_total,
          SUM(ip.subtotal) as valor_gasto
        FROM itens_pedido ip
        JOIN produtos p ON ip.produto_id = p.id
        JOIN pedidos ped ON ip.pedido_id = ped.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE ped.consumidor_id = $1
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        GROUP BY p.id, p.nome, p.preco, c.nome, pr.nome_loja, u.nome_completo
        ORDER BY vezes_comprado DESC, quantidade_total DESC
        LIMIT 10
      `;

      const produtosResult = await pool.query(produtosFavoritosQuery, [consumidor_id]);

      // Produtores favoritos
      const produtoresFavoritosQuery = `
        SELECT 
          u.nome_completo as produtor_nome,
          pr.nome_loja,
          pr.avaliacao_media,
          e.cidade, e.estado,
          COUNT(DISTINCT ped.id) as pedidos_realizados,
          SUM(ped.valor_total) as valor_gasto,
          AVG(ped.valor_total) as ticket_medio_produtor
        FROM pedidos ped
        JOIN usuarios u ON ped.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE ped.consumidor_id = $1
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        GROUP BY u.id, u.nome_completo, pr.nome_loja, pr.avaliacao_media, e.cidade, e.estado
        ORDER BY pedidos_realizados DESC, valor_gasto DESC
        LIMIT 5
      `;

      const produtoresResult = await pool.query(produtoresFavoritosQuery, [consumidor_id]);

      // Gastos por categoria
      const gastosCategoriaQuery = `
        SELECT 
          c.nome as categoria,
          COUNT(DISTINCT ip.id) as itens_comprados,
          SUM(ip.subtotal) as valor_gasto,
          AVG(ip.preco_unitario) as preco_medio
        FROM itens_pedido ip
        JOIN produtos p ON ip.produto_id = p.id
        JOIN categorias c ON p.categoria_id = c.id
        JOIN pedidos ped ON ip.pedido_id = ped.id
        WHERE ped.consumidor_id = $1
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        GROUP BY c.id, c.nome
        ORDER BY valor_gasto DESC
      `;

      const categoriasResult = await pool.query(gastosCategoriaQuery, [consumidor_id]);

      // Itens no carrinho atual
      const carrinhoQuery = `
        SELECT 
          c.quantidade,
          c.preco_unitario,
          p.nome as produto_nome,
          p.preco as preco_atual,
          pr.nome_loja,
          cat.nome as categoria
        FROM carrinho c
        JOIN produtos p ON c.produto_id = p.id
        JOIN usuarios u ON p.produtor_id = u.id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN categorias cat ON p.categoria_id = cat.id
        WHERE c.consumidor_id = $1
          AND p.is_ativo = true
          AND produto_esta_valido(p.id) = true
        ORDER BY c.created_at DESC
      `;

      const carrinhoResult = await pool.query(carrinhoQuery, [consumidor_id]);

      res.json({
        consumidor_id,
        periodo: diasPeriodo,
        estatisticas: {
          pedidos: {
            total: parseInt(stats.total_pedidos || 0),
            periodo: parseInt(stats.pedidos_periodo || 0),
            entregues: parseInt(stats.pedidos_entregues || 0),
            pendentes: parseInt(stats.pedidos_pendentes || 0),
            ticket_medio: parseFloat(stats.ticket_medio || 0).toFixed(2)
          },
          gastos: {
            total: parseFloat(stats.gasto_total || 0).toFixed(2),
            periodo: parseFloat(stats.gasto_periodo || 0).toFixed(2)
          },
          diversidade: {
            produtores_diferentes: parseInt(stats.produtores_diferentes || 0),
            produtos_diferentes: parseInt(stats.produtos_diferentes || 0)
          }
        },
        historico_pedidos: pedidosResult.rows.map(row => ({
          id: row.id,
          numero: row.numero_pedido,
          valor: parseFloat(row.valor_total).toFixed(2),
          status: row.status_pedido,
          data: row.created_at,
          loja: row.nome_loja,
          produtor: row.produtor_nome,
          itens: parseInt(row.total_itens)
        })),
        produtos_favoritos: produtosResult.rows.map(row => ({
          nome: row.nome,
          preco: parseFloat(row.preco).toFixed(2),
          categoria: row.categoria,
          loja: row.nome_loja,
          produtor: row.produtor_nome,
          vezes_comprado: parseInt(row.vezes_comprado),
          quantidade_total: parseInt(row.quantidade_total),
          valor_gasto: parseFloat(row.valor_gasto).toFixed(2)
        })),
        produtores_favoritos: produtoresResult.rows.map(row => ({
          nome: row.produtor_nome,
          loja: row.nome_loja,
          avaliacao: parseFloat(row.avaliacao_media || 0).toFixed(2),
          localizacao: row.cidade && row.estado ? `${row.cidade}/${row.estado}` : null,
          pedidos: parseInt(row.pedidos_realizados),
          valor_gasto: parseFloat(row.valor_gasto).toFixed(2),
          ticket_medio: parseFloat(row.ticket_medio_produtor).toFixed(2)
        })),
        gastos_por_categoria: categoriasResult.rows.map(row => ({
          categoria: row.categoria,
          itens: parseInt(row.itens_comprados),
          valor_gasto: parseFloat(row.valor_gasto).toFixed(2),
          preco_medio: parseFloat(row.preco_medio).toFixed(2)
        })),
        carrinho_atual: {
          itens: carrinhoResult.rows.map(row => ({
            produto: row.produto_nome,
            quantidade: parseInt(row.quantidade),
            preco_carrinho: parseFloat(row.preco_unitario).toFixed(2),
            preco_atual: parseFloat(row.preco_atual).toFixed(2),
            loja: row.nome_loja,
            categoria: row.categoria
          })),
          valor_total: carrinhoResult.rows.reduce((total, row) => 
            total + (parseFloat(row.preco_unitario) * parseInt(row.quantidade)), 0
          ).toFixed(2),
          total_itens: carrinhoResult.rows.reduce((total, row) => 
            total + parseInt(row.quantidade), 0
          )
        }
      });

    } catch (error) {
      console.error('Erro ao buscar dashboard do consumidor:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Dashboard de análise de vendas por período
  async getSalesAnalytics(req, res) {
    try {
      const { produtor_id } = req.params;
      const { periodo = '30', agrupamento = 'dia' } = req.query;
      const diasPeriodo = parseInt(periodo);

      // Verificar se é produtor válido
      const produtorCheck = await pool.query(
        'SELECT u.id FROM usuarios u WHERE u.id = $1 AND u.tipo_usuario = $2 AND u.is_ativo = true',
        [produtor_id, 'produtor']
      );

      if (produtorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Produtor não encontrado' });
      }

      let groupByClause = '';
      let selectClause = '';
      
      switch (agrupamento) {
        case 'hora':
          groupByClause = 'DATE_TRUNC(\'hour\', ped.created_at)';
          selectClause = 'DATE_TRUNC(\'hour\', ped.created_at) as periodo';
          break;
        case 'dia':
          groupByClause = 'DATE(ped.created_at)';
          selectClause = 'DATE(ped.created_at) as periodo';
          break;
        case 'semana':
          groupByClause = 'DATE_TRUNC(\'week\', ped.created_at)';
          selectClause = 'DATE_TRUNC(\'week\', ped.created_at) as periodo';
          break;
        case 'mes':
          groupByClause = 'DATE_TRUNC(\'month\', ped.created_at)';
          selectClause = 'DATE_TRUNC(\'month\', ped.created_at) as periodo';
          break;
        default:
          groupByClause = 'DATE(ped.created_at)';
          selectClause = 'DATE(ped.created_at) as periodo';
      }

      // Análise de vendas por período
      const vendasAnalyticsQuery = `
        SELECT 
          ${selectClause},
          COUNT(DISTINCT ped.id) as total_pedidos,
          COUNT(DISTINCT ped.consumidor_id) as clientes_unicos,
          SUM(ped.valor_total) as receita_total,
          AVG(ped.valor_total) as ticket_medio,
          COUNT(DISTINCT ip.produto_id) as produtos_vendidos,
          SUM(ip.quantidade) as quantidade_itens
        FROM pedidos ped
        LEFT JOIN itens_pedido ip ON ped.id = ip.pedido_id
        WHERE ped.produtor_id = $1
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
        GROUP BY ${groupByClause}
        ORDER BY periodo DESC
      `;

      const analyticsResult = await pool.query(vendasAnalyticsQuery, [produtor_id]);

      // Produtos com melhor performance
      const produtosPerformanceQuery = `
        SELECT 
          p.nome,
          c.nome as categoria,
          COUNT(ip.id) as vendas,
          SUM(ip.quantidade) as quantidade_vendida,
          SUM(ip.subtotal) as receita_produto,
          AVG(ip.preco_unitario) as preco_medio,
          (SUM(ip.subtotal) / COUNT(ip.id)) as receita_por_venda,
          COUNT(DISTINCT ped.consumidor_id) as compradores_unicos
        FROM produtos p
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.produtor_id = $1
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
        GROUP BY p.id, p.nome, c.nome
        HAVING COUNT(ip.id) > 0
        ORDER BY receita_produto DESC
        LIMIT 15
      `;

      const performanceResult = await pool.query(produtosPerformanceQuery, [produtor_id]);

      // Análise de clientes
      const clientesAnalyticsQuery = `
        SELECT 
          u.nome_completo,
          e.cidade, e.estado,
          COUNT(DISTINCT ped.id) as pedidos_realizados,
          SUM(ped.valor_total) as valor_gasto,
          AVG(ped.valor_total) as ticket_medio_cliente,
          MIN(ped.created_at) as primeira_compra,
          MAX(ped.created_at) as ultima_compra,
          COUNT(DISTINCT ip.produto_id) as produtos_diferentes
        FROM pedidos ped
        JOIN usuarios u ON ped.consumidor_id = u.id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN itens_pedido ip ON ped.id = ip.pedido_id
        WHERE ped.produtor_id = $1
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
        GROUP BY u.id, u.nome_completo, e.cidade, e.estado
        ORDER BY valor_gasto DESC
        LIMIT 10
      `;

      const clientesResult = await pool.query(clientesAnalyticsQuery, [produtor_id]);

      res.json({
        produtor_id,
        periodo: diasPeriodo,
        agrupamento,
        vendas_por_periodo: analyticsResult.rows.map(row => ({
          periodo: row.periodo,
          pedidos: parseInt(row.total_pedidos || 0),
          clientes_unicos: parseInt(row.clientes_unicos || 0),
          receita: parseFloat(row.receita_total || 0).toFixed(2),
          ticket_medio: parseFloat(row.ticket_medio || 0).toFixed(2),
          produtos_vendidos: parseInt(row.produtos_vendidos || 0),
          quantidade_itens: parseInt(row.quantidade_itens || 0)
        })),
        produtos_performance: performanceResult.rows.map(row => ({
          nome: row.nome,
          categoria: row.categoria,
          vendas: parseInt(row.vendas),
          quantidade_vendida: parseInt(row.quantidade_vendida),
          receita: parseFloat(row.receita_produto).toFixed(2),
          preco_medio: parseFloat(row.preco_medio).toFixed(2),
          receita_por_venda: parseFloat(row.receita_por_venda).toFixed(2),
          compradores_unicos: parseInt(row.compradores_unicos)
        })),
        clientes_analytics: clientesResult.rows.map(row => ({
          nome: row.nome_completo,
          localizacao: row.cidade && row.estado ? `${row.cidade}/${row.estado}` : null,
          pedidos: parseInt(row.pedidos_realizados),
          valor_gasto: parseFloat(row.valor_gasto).toFixed(2),
          ticket_medio: parseFloat(row.ticket_medio_cliente).toFixed(2),
          primeira_compra: row.primeira_compra,
          ultima_compra: row.ultima_compra,
          produtos_diferentes: parseInt(row.produtos_diferentes || 0)
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar análise de vendas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Dashboard comparativo de produtores (para admins)
  async getProducersComparison(req, res) {
    try {
      const { periodo = '30', limite = '10' } = req.query;
      const diasPeriodo = parseInt(periodo);
      const limiteProdutores = parseInt(limite);

      // Comparação entre produtores
      const comparacaoQuery = `
        SELECT 
          u.id as produtor_id,
          u.nome_completo,
          pr.nome_loja,
          pr.avaliacao_media,
          e.cidade, e.estado,
          COUNT(DISTINCT p.id) as produtos_ativos,
          COUNT(DISTINCT ped.id) as pedidos_periodo,
          COUNT(DISTINCT ped.consumidor_id) as clientes_unicos,
          SUM(ped.valor_total) FILTER (WHERE ped.status_pedido IN ('confirmado', 'preparando', 'entregue')) as receita_periodo,
          AVG(ped.valor_total) as ticket_medio,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'entregue') as pedidos_entregues,
          COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'cancelado') as pedidos_cancelados,
          (COUNT(DISTINCT ped.id) FILTER (WHERE ped.status_pedido = 'entregue')::FLOAT / 
           NULLIF(COUNT(DISTINCT ped.id), 0) * 100) as taxa_sucesso
        FROM usuarios u
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN produtos p ON u.id = p.produtor_id
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN pedidos ped ON u.id = ped.produtor_id
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        WHERE u.tipo_usuario = 'produtor' AND u.is_ativo = true
        GROUP BY u.id, u.nome_completo, pr.nome_loja, pr.avaliacao_media, e.cidade, e.estado
        ORDER BY receita_periodo DESC NULLS LAST
        LIMIT ${limiteProdutores}
      `;

      const comparacaoResult = await pool.query(comparacaoQuery);

      // Ranking por categorias
      const categoriasRankingQuery = `
        SELECT 
          c.nome as categoria,
          COUNT(DISTINCT p.produtor_id) as produtores_categoria,
          COUNT(DISTINCT p.id) as produtos_categoria,
          COUNT(DISTINCT ped.id) as pedidos_categoria,
          SUM(ped.valor_total) FILTER (WHERE ped.status_pedido IN ('confirmado', 'preparando', 'entregue')) as receita_categoria,
          AVG(p.preco) as preco_medio_categoria
        FROM categorias c
        LEFT JOIN produtos p ON c.id = p.categoria_id
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        WHERE c.is_ativa = true
        GROUP BY c.id, c.nome
        ORDER BY receita_categoria DESC NULLS LAST
      `;

      const categoriasResult = await pool.query(categoriasRankingQuery);

      // Métricas regionais
      const regionaisQuery = `
        SELECT 
          e.cidade,
          e.estado,
          COUNT(DISTINCT u.id) as produtores_regiao,
          COUNT(DISTINCT p.id) as produtos_regiao,
          COUNT(DISTINCT ped.consumidor_id) as consumidores_regiao,
          SUM(ped.valor_total) FILTER (WHERE ped.status_pedido IN ('confirmado', 'preparando', 'entregue')) as receita_regiao,
          AVG(pr.avaliacao_media) as avaliacao_media_regiao
        FROM enderecos e
        JOIN usuarios u ON e.id = u.endereco_id
        JOIN produtores pr ON u.id = pr.usuario_id
        LEFT JOIN produtos p ON u.id = p.produtor_id
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        LEFT JOIN pedidos ped ON u.id = ped.produtor_id
          AND ped.created_at >= CURRENT_DATE - INTERVAL '${diasPeriodo} days'
        WHERE u.tipo_usuario = 'produtor' AND u.is_ativo = true
        GROUP BY e.cidade, e.estado
        HAVING COUNT(DISTINCT u.id) > 0
        ORDER BY receita_regiao DESC NULLS LAST
        LIMIT 15
      `;

      const regionaisResult = await pool.query(regionaisQuery);

      res.json({
        periodo: diasPeriodo,
        limite_produtores: limiteProdutores,
        comparacao_produtores: comparacaoResult.rows.map(row => ({
          produtor_id: row.produtor_id,
          nome: row.nome_completo,
          loja: row.nome_loja,
          avaliacao: parseFloat(row.avaliacao_media || 0).toFixed(2),
          localizacao: row.cidade && row.estado ? `${row.cidade}/${row.estado}` : null,
          produtos_ativos: parseInt(row.produtos_ativos || 0),
          pedidos_periodo: parseInt(row.pedidos_periodo || 0),
          clientes_unicos: parseInt(row.clientes_unicos || 0),
          receita_periodo: parseFloat(row.receita_periodo || 0).toFixed(2),
          ticket_medio: parseFloat(row.ticket_medio || 0).toFixed(2),
          pedidos_entregues: parseInt(row.pedidos_entregues || 0),
          pedidos_cancelados: parseInt(row.pedidos_cancelados || 0),
          taxa_sucesso: parseFloat(row.taxa_sucesso || 0).toFixed(2)
        })),
        ranking_categorias: categoriasResult.rows.map(row => ({
          categoria: row.categoria,
          produtores: parseInt(row.produtores_categoria || 0),
          produtos: parseInt(row.produtos_categoria || 0),
          pedidos: parseInt(row.pedidos_categoria || 0),
          receita: parseFloat(row.receita_categoria || 0).toFixed(2),
          preco_medio: parseFloat(row.preco_medio_categoria || 0).toFixed(2)
        })),
        metricas_regionais: regionaisResult.rows.map(row => ({
          cidade: row.cidade,
          estado: row.estado,
          produtores: parseInt(row.produtores_regiao),
          produtos: parseInt(row.produtos_regiao || 0),
          consumidores: parseInt(row.consumidores_regiao || 0),
          receita: parseFloat(row.receita_regiao || 0).toFixed(2),
          avaliacao_media: parseFloat(row.avaliacao_media_regiao || 0).toFixed(2)
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar comparação de produtores:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Dashboard de produtos em estoque baixo
  async getLowStockProducts(req, res) {
    try {
      const { produtor_id } = req.params;
      const { limite_estoque = '5' } = req.query;
      const limiteEstoque = parseInt(limite_estoque);

      // Verificar se é produtor válido
      const produtorCheck = await pool.query(
        'SELECT u.id FROM usuarios u WHERE u.id = $1 AND u.tipo_usuario = $2 AND u.is_ativo = true',
        [produtor_id, 'produtor']
      );

      if (produtorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Produtor não encontrado' });
      }

      // Produtos com estoque baixo
      const estoqueQuery = `
        SELECT 
          p.id,
          p.nome,
          p.preco,
          p.quantidade_estoque,
          p.data_validade,
          c.nome as categoria,
          COUNT(ip.id) as vendas_historicas,
          SUM(ip.quantidade) as quantidade_vendida_historica,
          AVG(ip.quantidade) as media_vendas_por_pedido
        FROM produtos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
          AND ped.created_at >= CURRENT_DATE - INTERVAL '30 days'
        WHERE p.produtor_id = $1
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.quantidade_estoque <= $2
        GROUP BY p.id, p.nome, p.preco, p.quantidade_estoque, p.data_validade, c.nome
        ORDER BY p.quantidade_estoque ASC, quantidade_vendida_historica DESC NULLS LAST
      `;

      const estoqueResult = await pool.query(estoqueQuery, [produtor_id, limiteEstoque]);

      // Produtos que estão se esgotando rapidamente
      const estoqueRapidoQuery = `
        SELECT 
          p.id,
          p.nome,
          p.preco,
          p.quantidade_estoque,
          p.data_validade,
          c.nome as categoria,
          COUNT(ip.id) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '7 days') as vendas_ultima_semana,
          SUM(ip.quantidade) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '7 days') as quantidade_vendida_semana,
          (p.quantidade_estoque::FLOAT / NULLIF(
            SUM(ip.quantidade) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0
          ) * 7) as dias_estimados_restantes
        FROM produtos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
        LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.status_pedido IN ('confirmado', 'preparando', 'entregue')
        WHERE p.produtor_id = $1
          AND p.is_ativo = true
          AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
          AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.quantidade_estoque > 0
        GROUP BY p.id, p.nome, p.preco, p.quantidade_estoque, p.data_validade, c.nome
        HAVING SUM(ip.quantidade) FILTER (WHERE ped.created_at >= CURRENT_DATE - INTERVAL '7 days') > 0
        ORDER BY dias_estimados_restantes ASC NULLS LAST
        LIMIT 10
      `;

      const rapidoResult = await pool.query(estoqueRapidoQuery, [produtor_id]);

      res.json({
        produtor_id,
        limite_estoque: limiteEstoque,
        produtos_estoque_baixo: estoqueResult.rows.map(row => ({
          id: row.id,
          nome: row.nome,
          preco: parseFloat(row.preco).toFixed(2),
          estoque_atual: parseInt(row.quantidade_estoque),
          data_validade: row.data_validade,
          categoria: row.categoria,
          vendas_historicas: parseInt(row.vendas_historicas || 0),
          quantidade_vendida: parseInt(row.quantidade_vendida_historica || 0),
          media_por_pedido: parseFloat(row.media_vendas_por_pedido || 0).toFixed(1)
        })),
        produtos_esgotando_rapido: rapidoResult.rows.map(row => ({
          id: row.id,
          nome: row.nome,
          preco: parseFloat(row.preco).toFixed(2),
          estoque_atual: parseInt(row.quantidade_estoque),
          data_validade: row.data_validade,
          categoria: row.categoria,
          vendas_ultima_semana: parseInt(row.vendas_ultima_semana || 0),
          quantidade_vendida_semana: parseInt(row.quantidade_vendida_semana || 0),
          dias_estimados_restantes: row.dias_estimados_restantes ? 
            parseFloat(row.dias_estimados_restantes).toFixed(1) : null
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar produtos com estoque baixo:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = DashboardController;