const express = require('express');
const router = express.Router();
const db = require('./db');

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
 */
router.post('/api/inserir-coleta', (req, res) => {
  const { tipo, data, horario } = req.body;

  if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
    return res.status(400).json({ erro: 'Tipo de material é obrigatório' });
  }

  const dataSql = formatDateToSql(data) || formatDateToSql(new Date());
  const horarioSql = formatTimeToSql(horario) || formatTimeToSql(new Date());

  const query = 'INSERT INTO lixocoletado (`data`, `horario`, `tipo`) VALUES (?, ?, ?)';
  
  db.query(query, [dataSql, horarioSql, tipo.trim()], (erro, resultado) => {
    if (erro) {
      console.error('POST /api/inserir-coleta error:', erro);
      return res.status(500).json({ erro: erro.message });
    }
    res.status(201).json({ sucesso: true, id: resultado.insertId });
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

/**
 * GET /api/coletas/:tipo
 * Recupera coletas de um tipo específico
 */
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

/**
 * GET /api/coletas/data/:data
 * Recupera coletas de uma data específica
 */
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

/**
 * GET /api/coletas/today
 * Recupera todas as coletas do dia atual (independente do tipo)
 */
// GET /api/coletas/today/count
// Retorna a contagem total de coletas do dia atual
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

/**
 * GET /api/estatisticas
 * Obtém estatísticas de coleta agrupadas por tipo
 */
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

/**
 * GET /api/ultima-coleta
 * Obtém a última coleta registrada
 */
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

/**
 * PUT /api/coleta/:id
 * Atualiza um registro de coleta
 */
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

/**
 * DELETE /api/coleta/:id
 * Deleta um registro de coleta
 */
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
