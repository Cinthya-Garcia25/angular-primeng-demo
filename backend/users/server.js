require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes  = require('./src/routes/auth.routes');
const usersRoutes = require('./src/routes/users.routes');

const app  = express();
const PORT = process.env.USERS_PORT ?? 3001;

// ── Middlewares ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/users', usersRoutes);

// ── Health ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'users' }));

app.listen(PORT, () => {
  console.log(`Users service corriendo en http://localhost:${PORT}`);
});
