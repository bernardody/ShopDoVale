// routes/api.js - Todas as rotas da API do Shop do Vale
const express = require('express');
const router = express.Router();
const db = require('../database');

// ===== AUTENTICAÇÃO =====

// POST /api/login - Login de usuário
router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  
  const query = 'SELECT id, nome, email, tipo FROM usuarios WHERE email = ? AND senha = ?';
  db.query(query, [email, senha], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro no servidor' });
      return;
    }
    
    if (results.length === 0) {
      res.status(401).json({ error: 'Email ou senha incorretos' });
      return;
    }
    
    // Login bem sucedido - retorna os dados do usuário
    res.json({ success: true, user: results[0] });
  });
});

// POST /api/registro - Cadastro de novo usuário
router.post('/registro', (req, res) => {
  const { nome, email, senha, tipo, telefone, endereco } = req.body;
  
  const query = 'INSERT INTO usuarios (nome, email, senha, tipo, telefone, endereco) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [nome, email, senha, tipo, telefone, endereco], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Email já cadastrado' });
        return;
      }
      res.status(500).json({ error: 'Erro ao cadastrar' });
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'Usuário cadastrado com sucesso',
      userId: result.insertId 
    });
  });
});

// ===== PRODUTOS =====

// GET /api/produtos - Listar todos os produtos ativos (com ou sem estoque)
router.get('/produtos', (req, res) => {
  const query = `
    SELECT p.*, u.nome as nome_produtor 
    FROM produtos p 
    JOIN usuarios u ON p.produtor_id = u.id 
    WHERE p.ativo = true
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar produtos' });
      return;
    }
    res.json(results);
  });
});

// GET /api/produtos/produtor/:id - Listar produtos de um produtor específico
router.get('/produtos/produtor/:id', (req, res) => {
  const produtorId = req.params.id;
  
  // Busca TODOS os produtos do produtor (ativos e inativos)
  const query = 'SELECT * FROM produtos WHERE produtor_id = ? ORDER BY ativo DESC, nome ASC';
  db.query(query, [produtorId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar produtos' });
      return;
    }
    res.json(results);
  });
});

// POST /api/produtos - Adicionar novo produto (produtor)
router.post('/produtos', (req, res) => {
  const { nome, descricao, preco, unidade, quantidade_disponivel, categoria, produtor_id } = req.body;
  
  const query = `
    INSERT INTO produtos (nome, descricao, preco, unidade, quantidade_disponivel, categoria, produtor_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [nome, descricao, preco, unidade, quantidade_disponivel, categoria, produtor_id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao adicionar produto' });
      return;
    }
    res.json({ 
      success: true, 
      message: 'Produto adicionado com sucesso',
      produtoId: result.insertId 
    });
  });
});

// GET /api/produtos/:id - Buscar um produto específico
router.get('/produtos/:id', (req, res) => {
  const produtoId = req.params.id;
  
  const query = 'SELECT * FROM produtos WHERE id = ?';
  db.query(query, [produtoId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar produto' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json(results[0]);
  });
});

// PUT /api/produtos/:id - Atualizar produto
router.put('/produtos/:id', (req, res) => {
  const produtoId = req.params.id;
  const { nome, descricao, preco, unidade, quantidade_disponivel, categoria } = req.body;
  
  const query = `
    UPDATE produtos 
    SET nome = ?, descricao = ?, preco = ?, unidade = ?, 
        quantidade_disponivel = ?, categoria = ?
    WHERE id = ?
  `;
  
  db.query(query, [nome, descricao, preco, unidade, quantidade_disponivel, categoria, produtoId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao atualizar produto' });
      return;
    }
    res.json({ success: true, message: 'Produto atualizado com sucesso' });
  });
});

// DELETE /api/produtos/:id - Deletar produto completamente
router.delete('/produtos/:id', (req, res) => {
  const produtoId = req.params.id;
  
  // Primeiro, verificar se existem pedidos com este produto
  db.query('SELECT COUNT(*) as count FROM itens_pedido WHERE produto_id = ?', [produtoId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao verificar pedidos' });
      return;
    }
    
    if (results[0].count > 0) {
      // Se há pedidos, apenas desativar o produto ao invés de deletar
      db.query('UPDATE produtos SET ativo = false WHERE id = ?', [produtoId], (err) => {
        if (err) {
          res.status(500).json({ error: 'Erro ao desativar produto' });
          return;
        }
        
        // Remover dos carrinhos ativos
        db.query('DELETE FROM carrinho WHERE produto_id = ?', [produtoId], (err) => {
          if (err) {
            console.error('Erro ao limpar carrinho:', err);
          }
          res.json({ success: true, message: 'Produto removido do marketplace' });
        });
      });
    } else {
      // Se não há pedidos, pode deletar completamente
      // Primeiro remove dos carrinhos
      db.query('DELETE FROM carrinho WHERE produto_id = ?', [produtoId], (err) => {
        if (err) {
          res.status(500).json({ error: 'Erro ao remover produto dos carrinhos' });
          return;
        }
        
        // Agora deleta o produto
        db.query('DELETE FROM produtos WHERE id = ?', [produtoId], (err, result) => {
          if (err) {
            console.error('Erro ao deletar produto:', err);
            res.status(500).json({ error: 'Erro ao deletar produto. Detalhes: ' + err.message });
            return;
          }
          res.json({ success: true, message: 'Produto removido permanentemente' });
        });
      });
    }
  });
});

// PUT /api/produtos/:id/reativar - Reativar produto
router.put('/produtos/:id/reativar', (req, res) => {
  const produtoId = req.params.id;
  
  const query = 'UPDATE produtos SET ativo = true WHERE id = ?';
  db.query(query, [produtoId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao reativar produto' });
      return;
    }
    res.json({ success: true, message: 'Produto reativado com sucesso' });
  });
});

// ===== CARRINHO =====

// GET /api/carrinho/:userId - Listar itens do carrinho
router.get('/carrinho/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const query = `
    SELECT c.*, p.nome, p.preco, p.unidade, p.imagem_url, p.quantidade_disponivel 
    FROM carrinho c 
    JOIN produtos p ON c.produto_id = p.id 
    WHERE c.usuario_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar carrinho' });
      return;
    }
    res.json(results);
  });
});

// POST /api/carrinho - Adicionar item ao carrinho
router.post('/carrinho', (req, res) => {
  const { usuario_id, produto_id, quantidade } = req.body;
  
  // Verificar se produto tem estoque disponível
  db.query('SELECT quantidade_disponivel FROM produtos WHERE id = ?', [produto_id], (err, results) => {
    if (err || results.length === 0) {
      res.status(500).json({ error: 'Erro ao verificar produto' });
      return;
    }
    
    if (results[0].quantidade_disponivel < quantidade) {
      res.status(400).json({ error: 'Quantidade solicitada maior que o estoque disponível' });
      return;
    }
    
    const query = 'INSERT INTO carrinho (usuario_id, produto_id, quantidade) VALUES (?, ?, ?)';
    db.query(query, [usuario_id, produto_id, quantidade], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // Se já existe, atualiza a quantidade
          const updateQuery = 'UPDATE carrinho SET quantidade = quantidade + ? WHERE usuario_id = ? AND produto_id = ?';
          db.query(updateQuery, [quantidade, usuario_id, produto_id], (updateErr) => {
            if (updateErr) {
              res.status(500).json({ error: 'Erro ao atualizar carrinho' });
              return;
            }
            res.json({ success: true, message: 'Quantidade atualizada no carrinho' });
          });
          return;
        }
        res.status(500).json({ error: 'Erro ao adicionar ao carrinho' });
        return;
      }
      res.json({ success: true, message: 'Produto adicionado ao carrinho' });
    });
  });
});

// PUT /api/carrinho - Atualizar quantidade no carrinho
router.put('/carrinho', (req, res) => {
  const { usuario_id, produto_id, quantidade } = req.body;
  
  // Verificar se produto tem estoque disponível
  db.query('SELECT quantidade_disponivel FROM produtos WHERE id = ?', [produto_id], (err, results) => {
    if (err || results.length === 0) {
      res.status(500).json({ error: 'Erro ao verificar produto' });
      return;
    }
    
    if (results[0].quantidade_disponivel < quantidade) {
      res.status(400).json({ error: 'Quantidade solicitada maior que o estoque disponível' });
      return;
    }
    
    const query = 'UPDATE carrinho SET quantidade = ? WHERE usuario_id = ? AND produto_id = ?';
    db.query(query, [quantidade, usuario_id, produto_id], (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Erro ao atualizar quantidade' });
        return;
      }
      res.json({ success: true, message: 'Quantidade atualizada' });
    });
  });
});

// DELETE /api/carrinho/:userId/:produtoId - Remover item do carrinho
router.delete('/carrinho/:userId/:produtoId', (req, res) => {
  const { userId, produtoId } = req.params;
  
  const query = 'DELETE FROM carrinho WHERE usuario_id = ? AND produto_id = ?';
  db.query(query, [userId, produtoId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao remover do carrinho' });
      return;
    }
    res.json({ success: true, message: 'Produto removido do carrinho' });
  });
});

// ===== PEDIDOS =====

// POST /api/pedidos - Finalizar compra (converter carrinho em pedido)
router.post('/pedidos', (req, res) => {
  const { usuario_id } = req.body;
  
  // Buscar itens do carrinho com informações completas
  const carrinhoQuery = `
    SELECT c.*, p.preco, p.produtor_id, p.quantidade_disponivel 
    FROM carrinho c 
    JOIN produtos p ON c.produto_id = p.id 
    WHERE c.usuario_id = ?
  `;
  
  db.query(carrinhoQuery, [usuario_id], (err, itensCarrinho) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar carrinho' });
      return;
    }
    
    if (itensCarrinho.length === 0) {
      res.status(400).json({ error: 'Carrinho vazio' });
      return;
    }
    
    // Verificar se todos os produtos têm estoque suficiente
    for (let item of itensCarrinho) {
      if (item.quantidade > item.quantidade_disponivel) {
        res.status(400).json({ 
          error: `Produto "${item.nome}" não tem estoque suficiente. Disponível: ${item.quantidade_disponivel}` 
        });
        return;
      }
    }
    
    // Calcular total
    const total = itensCarrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    
    // Criar pedido
    db.query('INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)', [usuario_id, total], (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Erro ao criar pedido' });
        return;
      }
      
      const pedidoId = result.insertId;
      
      // Inserir itens do pedido
      const itensValues = itensCarrinho.map(item => [
        pedidoId,
        item.produto_id,
        item.produtor_id,
        item.quantidade,
        item.preco,
        item.preco * item.quantidade
      ]);
      
      const itensQuery = `
        INSERT INTO itens_pedido (pedido_id, produto_id, produtor_id, quantidade, preco_unitario, subtotal) 
        VALUES ?
      `;
      
      db.query(itensQuery, [itensValues], (err) => {
        if (err) {
          res.status(500).json({ error: 'Erro ao salvar itens do pedido' });
          return;
        }
        
        // Atualizar o estoque dos produtos
        const updatePromises = itensCarrinho.map(item => {
          return new Promise((resolve, reject) => {
            const updateQuery = `
              UPDATE produtos 
              SET quantidade_disponivel = quantidade_disponivel - ? 
              WHERE id = ?
            `;
            db.query(updateQuery, [item.quantidade, item.produto_id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
        
        Promise.all(updatePromises)
          .then(() => {
            // Limpar carrinho
            db.query('DELETE FROM carrinho WHERE usuario_id = ?', [usuario_id], (err) => {
              if (err) {
                console.error('Erro ao limpar carrinho:', err);
              }
              
              res.json({ 
                success: true, 
                message: 'Pedido realizado com sucesso!',
                pedidoId: pedidoId 
              });
            });
          })
          .catch(err => {
            console.error('Erro ao atualizar estoque:', err);
            res.status(500).json({ error: 'Erro ao atualizar estoque dos produtos' });
          });
      });
    });
  });
});

// GET /api/pedidos/consumidor/:userId - Listar compras do consumidor
router.get('/pedidos/consumidor/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const query = `
    SELECT p.*, 
           COUNT(ip.id) as total_itens,
           GROUP_CONCAT(DISTINCT pr.nome) as produtos
    FROM pedidos p
    LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
    LEFT JOIN produtos pr ON ip.produto_id = pr.id
    WHERE p.usuario_id = ?
    GROUP BY p.id
    ORDER BY p.data_pedido DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar pedidos' });
      return;
    }
    res.json(results);
  });
});

// GET /api/pedidos/produtor/:produtorId - Listar vendas do produtor
router.get('/pedidos/produtor/:produtorId', (req, res) => {
  const produtorId = req.params.produtorId;
  
  const query = `
    SELECT ip.*, p.data_pedido, pr.nome as nome_produto, u.nome as nome_cliente
    FROM itens_pedido ip
    JOIN pedidos p ON ip.pedido_id = p.id
    JOIN produtos pr ON ip.produto_id = pr.id
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE ip.produtor_id = ?
    ORDER BY p.data_pedido DESC
  `;
  
  db.query(query, [produtorId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao buscar vendas' });
      return;
    }
    res.json(results);
  });
});

module.exports = router;