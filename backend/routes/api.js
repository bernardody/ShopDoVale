const express = require('express');
const router = express.Router();
const db = require('../database');

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

// GET /api/produtos - Listar todos os produtos ativos
router.get('/produtos', (req, res) => {
  const query = `
    SELECT p.*, u.nome as nome_produtor 
    FROM produtos p 
    JOIN usuarios u ON p.produtor_id = u.id 
    WHERE p.ativo = true AND p.quantidade_disponivel > 0
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
  
  const query = 'SELECT * FROM produtos WHERE produtor_id = ?';
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

// PUT /api/produtos/:id - Atualizar produto
router.put('/produtos/:id', (req, res) => {
  const produtoId = req.params.id;
  const { nome, descricao, preco, unidade, quantidade_disponivel, categoria, ativo } = req.body;
  
  const query = `
    UPDATE produtos 
    SET nome = ?, descricao = ?, preco = ?, unidade = ?, 
        quantidade_disponivel = ?, categoria = ?, ativo = ?
    WHERE id = ?
  `;
  
  db.query(query, [nome, descricao, preco, unidade, quantidade_disponivel, categoria, ativo, produtoId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao atualizar produto' });
      return;
    }
    res.json({ success: true, message: 'Produto atualizado com sucesso' });
  });
});

// DELETE /api/produtos/:id - Deletar produto (apenas desativa)
router.delete('/produtos/:id', (req, res) => {
  const produtoId = req.params.id;
  
  const query = 'UPDATE produtos SET ativo = false WHERE id = ?';
  db.query(query, [produtoId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao deletar produto' });
      return;
    }
    res.json({ success: true, message: 'Produto removido com sucesso' });
  });
});

// GET /api/carrinho/:userId - Listar itens do carrinho
router.get('/carrinho/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const query = `
    SELECT c.*, p.nome, p.preco, p.unidade, p.imagem_url 
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

// PUT /api/carrinho - Atualizar quantidade no carrinho
router.put('/carrinho', (req, res) => {
  const { usuario_id, produto_id, quantidade } = req.body;
  
  const query = 'UPDATE carrinho SET quantidade = ? WHERE usuario_id = ? AND produto_id = ?';
  db.query(query, [quantidade, usuario_id, produto_id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao atualizar quantidade' });
      return;
    }
    res.json({ success: true, message: 'Quantidade atualizada' });
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

module.exports = router;