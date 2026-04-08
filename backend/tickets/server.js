require('dotenv').config();
const Fastify = require('fastify');
const ticketsRoutes = require('./src/routes/tickets.routes');
const { logError }  = require('./src/utils/logger');

const app  = Fastify({ logger: true });
const PORT = process.env.TICKETS_PORT ?? 3002;

// ── Plugins ─────────────────────────────────────────────
app.register(require('@fastify/cors'));

// ── Rutas ────────────────────────────────────────────────
app.register(ticketsRoutes, { prefix: '/api/tickets' });

// ── Health ───────────────────────────────────────────────
app.get('/api/health', async () => ({ status: 'ok', service: 'tickets' }));

// ── Error handler global ─────────────────────────────────
app.setErrorHandler((err, req, reply) => {
  logError({
    servicio:    'tickets',
    metodo:      req.method,
    endpoint:    req.url,
    usuario_id:  req.user?.userId ?? null,
    ip:          req.ip,
    mensaje:     err.message,
    stack_trace: err.stack
  });
  reply.code(500).send({ statusCode: 500, intOpCode: 'SxTS500', data: null, message: 'Error interno del servidor' });
});

app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Tickets service corriendo en http://localhost:${PORT}`);
});
