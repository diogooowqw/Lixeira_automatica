const express = require('express');
const cors = require('cors');
const router = require('./router');

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');

const PORT = 3000;
// Mount API router
app.use('/', router);

// Simple health check
app.get('/',(req, res) => {
  res.send('Servidor está funcionando');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
