const express = require('express');
const router = express.Router();
const db = require('./db');

// Mapeamento de números para tipos de material
function mapearNumeroParaMaterial(numero) {
  const mapa = {
    '1': 'metal',
    '2': 'vidro',
    '3': 'papel',
    '4': 'plastico',
    '5': 'vazio',
    'metal': 'metal',
    'vidro': 'vidro',
    'papel': 'papel',
    'plastico': 'plastico',
    'plástico': 'plastico',
    'vazio': 'vazio'
  };
  return mapa[String(numero).trim().toLowerCase()] || null;
}

// Helper: formata Date/string para SQL (YYYY-MM-DD / HH:MM:SS)
function formatDateToSql(d) {
  if (!d) return null;
  const date = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeToSql(d) {
  if (!d) return null;
  const date = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * POST /api/inserir-coleta
 * Insere uma nova coleta de resíduo
 * Aceita tipo como número (1=metal, 2=vidro, 3=papel, 4=plastico, 5=vazio) ou como string
 */
router.post('/api/inserir-coleta', (req, res) => {
  let { tipo, data, horario } = req.body;

  if (!tipo) {
    return res.status(400).json({ erro: 'Tipo de material é obrigatório' });
  }

  // Converte número em nome de material se necessário
  const tipoConvertido = mapearNumeroParaMaterial(tipo);
  
  if (tipoConvertido === null) {
    return res.status(400).json({ erro: 'Tipo de material inválido' });
  }

  // Se for vazio, não inserir
  if (tipoConvertido === 'vazio') {
    return res.status(400).json({ erro: 'Nenhum material detectado' });
  }

  const dataSql = formatDateToSql(data) || formatDateToSql(new Date());
  const horarioSql = formatTimeToSql(horario) || formatTimeToSql(new Date());

  const query = 'INSERT INTO lixocoletado (`data`, `horario`, `tipo`) VALUES (?, ?, ?)';
  
  db.query(query, [dataSql, horarioSql, tipoConvertido], (erro, resultado) => {
    if (erro) {
      console.error('POST /api/inserir-coleta error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(201).json({ sucesso: true, id: resultado.insertId, tipo: tipoConvertido });
  });
});

/**
 * POST /api/inserir-coleta-ia
 * Insere coleta com o número da IA (1-5)
 * Simples: apenas recebe o número e converte
 */
router.post('/api/inserir-coleta-ia', (req, res) => {
  const { numero } = req.body;

  if (!numero) {
    return res.status(400).json({ erro: 'Número de material é obrigatório' });
  }

  // Converte número em nome de material
  const tipo = mapearNumeroParaMaterial(numero);
  
  if (tipo === null) {
    return res.status(400).json({ erro: 'Número de material inválido (deve ser 1-5)' });
  }

  // Se for vazio, retorna sem inserir
  if (tipo === 'vazio') {
    return res.status(200).json({ sucesso: false, mensagem: 'Nenhum material detectado' });
  }

  const dataSql = formatDateToSql(new Date());
  const horarioSql = formatTimeToSql(new Date());

  const query = 'INSERT INTO lixocoletado (`data`, `horario`, `tipo`) VALUES (?, ?, ?)';
  
  db.query(query, [dataSql, horarioSql, tipo], (erro, resultado) => {
    if (erro) {
      console.error('POST /api/inserir-coleta-ia error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    console.log(`✅ Material detectado: ${tipo} (ID: ${resultado.insertId})`);
    res.status(201).json({ sucesso: true, id: resultado.insertId, tipo: tipo, numero: numero });
  });
});

/**
 * GET /api/coletas
 * Recupera todas as coletas
 */
router.get('/api/coletas', (req, res) => {
  const query = 'SELECT * FROM lixocoletado ORDER BY id DESC';
  
  db.query(query, (erro, rows) => {
    if (erro) {
      console.error('GET /api/coletas error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(200).json(rows);
  });
});


router.get('/api/coletas/:tipo', (req, res) => {
  const { tipo } = req.params;
  const query = 'SELECT * FROM lixocoletado WHERE tipo = ? ORDER BY id DESC';
  
  db.query(query, [tipo], (erro, rows) => {
    if (erro) {
      console.error('GET /api/coletas/:tipo error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(200).json(rows);
  });
});


router.get('/api/coletas/data/:data', (req, res) => {
  const { data } = req.params;
  const dataSql = formatDateToSql(data);
  
  if (!dataSql) {
    return res.status(400).json({ erro: 'Formato de data inválido (esperado YYYY-MM-DD)' });
  }

  const query = 'SELECT * FROM lixocoletado WHERE `data` = ? ORDER BY id DESC';
  
  db.query(query, [dataSql], (erro, rows) => {
    if (erro) {
      console.error('GET /api/coletas/data/:data error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(200).json(rows);
  });
});


router.get('/api/coletas/today/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS total_itens FROM lixocoletado WHERE DATE(`data`) = CURDATE()';
  db.query(query, (erro, rows) => {
    if (erro) {
      console.error('GET /api/coletas/today/count error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    const total = (rows && rows[0] && rows[0].total_itens) ? Number(rows[0].total_itens) : 0;
    res.status(200).json({ total_itens: total });
  });
});


router.get('/api/estatisticas', (req, res) => {
  const { tipo } = req.query;

  let query = 'SELECT tipo, COUNT(*) AS total FROM lixocoletado';
  let params = [];

  if (tipo) {
    query += ' WHERE tipo = ?';
    params.push(tipo);
  }

  query += ' GROUP BY tipo ORDER BY total DESC';

  db.query(query, params, (erro, rows) => {
    if (erro) {
      console.error('GET /api/estatisticas error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(200).json(rows);
  });
});


router.get('/api/ultima-coleta', (req, res) => {
  const query = 'SELECT * FROM lixocoletado ORDER BY id DESC LIMIT 1';
  
  db.query(query, (erro, rows) => {
    if (erro) {
      console.error('GET /api/ultima-coleta error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(200).json(rows[0] || null);
  });
});


router.put('/api/coleta/:id', (req, res) => {
  const { id } = req.params;
  const { tipo, data, horario } = req.body;

  const updates = [];
  const values = [];
  
  if (data !== undefined) {
    const d = formatDateToSql(data);
    if (!d) return res.status(400).json({ erro: 'data inválida' });
    updates.push('`data` = ?');
    values.push(d);
  }
  
  if (horario !== undefined) {
    const h = formatTimeToSql(horario);
    if (!h) return res.status(400).json({ erro: 'horario inválido' });
    updates.push('`horario` = ?');
    values.push(h);
  }
  
  if (tipo !== undefined) {
    updates.push('`tipo` = ?');
    values.push(tipo);
  }

  if (updates.length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo válido para atualizar' });
  }

  values.push(id);
  const query = `UPDATE lixocoletado SET ${updates.join(', ')} WHERE id = ?`;
  
  db.query(query, values, (erro, resultado) => {
    if (erro) {
      console.error('PUT /api/coleta/:id error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(200).json({ sucesso: true, affectedRows: resultado.affectedRows });
  });
});


router.delete('/api/coleta/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM lixocoletado WHERE id = ?';
  
  db.query(query, [id], (erro, resultado) => {
    if (erro) {
      console.error('DELETE /api/coleta/:id error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }
    
    res.status(200).json({ sucesso: true, mensagem: 'Coleta deletada com sucesso' });
  });
});

module.exports = router;
