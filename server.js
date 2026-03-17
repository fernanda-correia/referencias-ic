require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database ────────────────────────────────────────────────────────────────

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS referencias (
                id          TEXT        PRIMARY KEY,
                autor       TEXT        NOT NULL,
                titulo      TEXT        NOT NULL,
                subtitulo   TEXT        DEFAULT '',
                editora     TEXT        DEFAULT '',
                edicao      TEXT        DEFAULT '',
                data        TEXT        DEFAULT '',
                local       TEXT        DEFAULT '',
                link        TEXT        DEFAULT '',
                pdf_data    TEXT        DEFAULT '',
                labels      TEXT[]      DEFAULT '{}',
                fichamento  JSONB       DEFAULT '{}',
                created_at  TIMESTAMPTZ DEFAULT now()
            );
        `);
        console.log('✅ Tabela "referencias" pronta.');
    } finally {
        client.release();
    }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '20mb' })); // PDFs em base64 podem ser grandes
app.use(express.static(path.join(__dirname)));

// ─── Helper: mapeia linha do banco → objeto JS do frontend ───────────────────

function rowToRef(row) {
    return {
        id:         row.id,
        autor:      row.autor,
        titulo:     row.titulo,
        subtitulo:  row.subtitulo  || '',
        editora:    row.editora    || '',
        edicao:     row.edicao     || '',
        data:       row.data       || '',
        local:      row.local      || '',
        link:       row.link       || '',
        pdf_data:   row.pdf_data   || '',
        labels:     row.labels     || [],
        fichamento: row.fichamento || {},
        created_at: row.created_at,
    };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
    }
});

// GET all references
app.get('/api/references', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM referencias ORDER BY created_at DESC'
        );
        res.json(result.rows.map(rowToRef));
    } catch (err) {
        console.error('GET /api/references:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST create reference
app.post('/api/references', async (req, res) => {
    const r = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO referencias
                (id, autor, titulo, subtitulo, editora, edicao, data, local, link, pdf_data, labels, fichamento, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                r.id,
                r.autor,
                r.titulo,
                r.subtitulo  || '',
                r.editora    || '',
                r.edicao     || '',
                r.data       || '',
                r.local      || '',
                r.link       || '',
                r.pdf_data   || '',
                r.labels     || [],
                JSON.stringify(r.fichamento || {}),
                r.created_at || new Date().toISOString(),
            ]
        );
        res.status(201).json(rowToRef(result.rows[0]));
    } catch (err) {
        console.error('POST /api/references:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT update reference
app.put('/api/references/:id', async (req, res) => {
    const { id } = req.params;
    const r = req.body;
    try {
        const result = await pool.query(
            `UPDATE referencias SET
                autor      = $1,
                titulo     = $2,
                subtitulo  = $3,
                editora    = $4,
                edicao     = $5,
                data       = $6,
                local      = $7,
                link       = $8,
                pdf_data   = $9,
                labels     = $10,
                fichamento = $11
             WHERE id = $12
             RETURNING *`,
            [
                r.autor,
                r.titulo,
                r.subtitulo  || '',
                r.editora    || '',
                r.edicao     || '',
                r.data       || '',
                r.local      || '',
                r.link       || '',
                r.pdf_data   || '',
                r.labels     || [],
                JSON.stringify(r.fichamento || {}),
                id,
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Referência não encontrada' });
        }
        res.json(rowToRef(result.rows[0]));
    } catch (err) {
        console.error('PUT /api/references/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH update fichamento only (called by card's save button)
app.patch('/api/references/:id/fichamento', async (req, res) => {
    const { id } = req.params;
    const { fichamento } = req.body;
    try {
        const result = await pool.query(
            `UPDATE referencias SET fichamento = $1 WHERE id = $2 RETURNING *`,
            [JSON.stringify(fichamento || {}), id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Referência não encontrada' });
        }
        res.json(rowToRef(result.rows[0]));
    } catch (err) {
        console.error('PATCH fichamento:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE reference
app.delete('/api/references/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM referencias WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/references/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

// Inicializa a tabela no banco (rodará no cold start do Vercel)
initDB().catch(err => {
    console.error('❌ Falha ao inicializar banco: Verifique a conexão (DATABASE_URL)');
});

// Apenas inicia o servidor se for executado diretamente (ex: node server.js)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor local rodando em http://localhost:${PORT}`);
        console.log(`   API: http://localhost:${PORT}/api/health\n`);
    });
}

// Exporta o app para ambientes Serverless (como a Vercel)
module.exports = app;
