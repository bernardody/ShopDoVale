// database.js - Conexão com o banco de dados MySQL
const mysql = require('mysql2');

// Criar a conexão com o banco
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',           // Usuário padrão do MySQL
  password: '',           // Senha do seu MySQL (deixe vazio se não tiver)
  database: 'shop_do_vale'
});

// Conectar ao banco
connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no banco de dados:', err);
    return;
  }
  console.log('✅ Conectado ao banco de dados MySQL!');
});

// Exportar a conexão para usar em outros arquivos
module.exports = connection;