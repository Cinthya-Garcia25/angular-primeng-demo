require('dotenv').config();
const Fastify = require('fastify');
const ticketsRoutes = require('./src/routes/tickets.routes');

const app  = Fastify({ logger: true });
const PORT = process.env.TICKETS_PORT ?? 3002;

// ── Plugins ─────────────────────────────────────────────
app.register(require('@fastify/cors'));

// ── Rutas ────────────────────────────────────────────────
app.register(ticketsRoutes, { prefix: '/api/tickets' });

// ── Health ───────────────────────────────────────────────
app.get('/api/health', async () => ({ status: 'ok', service: 'tickets' }));

app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Tickets service corriendo en http://localhost:${PORT}`);
});
