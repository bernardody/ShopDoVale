const app = require('./src/app');
const { connectDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Conectar ao banco de dados
    await connectDatabase();
    console.log('Banco de dados conectado com sucesso');

    // Iniciar o servidor
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`API disponível em: http://localhost:${PORT}`);
      console.log(`Documentação: http://localhost:${PORT}/api-docs`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

startServer();