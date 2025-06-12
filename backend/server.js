// server.js - Servidor principal do Shop do Vale
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database.js');

// Criar o app Express
const app = express();
const PORT = 3000;

// Middlewares básicos
app.use(cors());                    // Permitir requisições do frontend
app.use(express.json());            // Para ler JSON no body das requisições
app.use(express.static('public'));  // Servir arquivos estáticos (HTML, CSS, JS)

// Rota de teste para verificar se o servidor está rodando
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor do Shop do Vale rodando!' });
});

// Rota de teste do banco de dados
app.get('/api/test-db', (req, res) => {
  db.query('SELECT 1 + 1 AS resultado', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro no banco de dados' });
      return;
    }
    res.json({ 
      message: 'Banco de dados funcionando!', 
      resultado: results[0].resultado 
    });
  });
});

// Importar e usar as rotas da API
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Frontend disponível em http://localhost:${PORT}/index.html`);
});