require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const groupsRoutes      = require('./src/routes/groups.routes');
const permissionsRoutes = require('./src/routes/permissions.routes');

const app  = express();
const PORT = process.env.GROUPS_PORT ?? 3003;

// ── Middlewares ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────
app.use('/api/groups',      groupsRoutes);
app.use('/api/permissions', permissionsRoutes);

// ── Health ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'groups' }));

app.listen(PORT, () => {
  console.log(`Groups service corriendo en http://localhost:${PORT}`);
});
