import express from 'express';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const app = express();
app.use(express.json());

// Configuración de conexión a la base de datos PostgreSQL de Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Requerido por Render
});

// Inicializar Tablas automáticamente
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        dni VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        aporte NUMERIC DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        receptor_dni VARCHAR(20) REFERENCES users(dni) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        months INTEGER NOT NULL,
        start_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'activo'
      );
    `);
    console.log("Tablas de base de datos verificadas/creadas.");
  } catch (err) {
    console.error("Error inicializando DB:", err);
  } finally {
    client.release();
  }
}
initDB();

// --- RUTAS DE LA API ---

// Obtener usuarios
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crear usuario
app.post('/api/users', async (req, res) => {
  const { dni, name, role, aporte } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (dni, name, role, aporte) VALUES ($1, $2, $3, $4) RETURNING *',
      [dni, name, role, aporte]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Eliminar usuario
app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Obtener préstamos
app.get('/api/loans', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM loans');
    // Transformar nombres de columnas de snake_case a camelCase para React
    const formatted = rows.map(r => ({
      ...r, receptorDni: r.receptor_dni, startDate: r.start_date
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crear préstamo
app.post('/api/loans', async (req, res) => {
  const { receptorDni, amount, rate, months, startDate } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO loans (receptor_dni, amount, rate, months, start_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [receptorDni, amount, rate, months, startDate]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Actualizar estado de préstamo
app.put('/api/loans/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE loans SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVIR LA WEB EN PRODUCCIÓN ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sirve los archivos generados por Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Cualquier otra ruta la maneja React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor de la Cooperativa corriendo en el puerto ${port}`);
});