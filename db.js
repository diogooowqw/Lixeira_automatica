// Small wrapper for mysql2/promise pool configuration
const mysql = require('mysql2');

// Use environment variables when available, otherwise sensible defaults
const conexao = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lixo',
});

conexao.connect((erro) => {
  if (erro) {
    console.error('Erro ao conectar ao banco de dados:', erro);
    return;
  }
  console.log('Conexão ao banco de dados estabelecida com sucesso.');
});
module.exports = conexao;
