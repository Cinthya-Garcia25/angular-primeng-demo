import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes    from './routes/auth.routes';
import usersRoutes   from './routes/users.routes';
import groupsRoutes  from './routes/groups.routes';
import ticketsRoutes from './routes/tickets.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

// ── Middlewares globales ──────────────────────────────
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// ── Rutas ─────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/users',   usersRoutes);
app.use('/api/groups',  groupsRoutes);
app.use('/api/tickets', ticketsRoutes);

// ── Health check ──────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
