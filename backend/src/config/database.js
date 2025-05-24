const { Pool } = require('pg');

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shopdovale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo limite de conexão ociosa
  connectionTimeoutMillis: 2000, // Tempo limite para nova conexão
});

// Função para conectar ao banco
async function connectDatabase() {
  try {
    const client = await pool.connect();
    console.log('✓ Conexão com PostgreSQL estabelecida');
    
    // Teste básico de conexão
    const result = await client.query('SELECT NOW()');
    console.log('✓ Teste de conexão realizado:', result.rows[0].now);
    
    client.release();
    return true;
  } catch (error) {
    console.error('✗ Erro ao conectar com o banco de dados:', error.message);
    throw error;
  }
}

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Query executada:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Erro na query:', error.message);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

// Função para transações
async function getClient() {
  return await pool.connect();
}

// Função para executar transação
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Função para verificar se uma tabela existe
async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Erro ao verificar tabela ${tableName}:`, error.message);
    return false;
  }
}

// Função para verificar saúde do banco
async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: process.env.DB_NAME,
      result: result.rows[0]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// Função para renovação semanal automática
async function runWeeklyRenewal() {
  try {
    console.log('Iniciando renovação semanal...');
    const result = await query('SELECT renovar_produtos_semanais()');
    console.log('Renovação concluída:', result.rows[0].renovar_produtos_semanais);
    return result.rows[0];
  } catch (error) {
    console.error('Erro na renovação semanal:', error.message);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Fechando pool de conexões do banco...');
  await pool.end();
});

process.on('SIGTERM', async () => {
  console.log('Fechando pool de conexões do banco...');
  await pool.end();
});

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  connectDatabase,
  tableExists,
  healthCheck,
  runWeeklyRenewal
};