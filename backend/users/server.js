require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes  = require('./src/routes/auth.routes');
const usersRoutes = require('./src/routes/users.routes');
const { logError } = require('./src/utils/logger');

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

// ── Error handler global ───────────────────────────────
app.use((err, req, res, _next) => {
  logError({
    servicio:    'users',
    metodo:      req.method,
    endpoint:    req.url,
    usuario_id:  req.user?.userId ?? null,
    ip:          req.ip,
    mensaje:     err.message,
    stack_trace: err.stack
  });
  res.status(500).json({ statusCode: 500, intOpCode: 'SxUS500', data: null, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Users service corriendo en http://localhost:${PORT}`);
});
