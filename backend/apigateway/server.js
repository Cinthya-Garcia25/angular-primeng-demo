require('dotenv').config();
const Fastify = require('fastify');
const { jwtValidator } = require('./src/middleware/jwt-validator');
const { permissionChecker } = require('./src/middleware/permission-checker');
const { rateLimiter } = require('./src/middleware/rate-limiter');
const { serviceProxy } = require('./src/proxy/service-proxy');
const { ROUTES_MAP } = require('./src/config/routes-map');

const app = Fastify({ logger: true });
const PORT = process.env.GATEWAY_PORT ?? 3000;

// ── Plugins ─────────────────────────────────────────────
app.register(require('@fastify/cors'), { origin: 'http://localhost:4200' });
app.register(require('@fastify/rate-limit'), rateLimiter);

// ── Auth hook (todas las rutas excepto /api/auth) ───────
app.addHook('preHandler', jwtValidator);
app.addHook('preHandler', permissionChecker);

// ── Proxy dinámico ───────────────────────────────────────
app.all('/api/*', async (req, reply) => {
  return serviceProxy(req, reply, ROUTES_MAP);
});

// ── Health check ─────────────────────────────────────────
app.get('/health', async (_req, reply) => {
  return reply.code(200).send({ statusCode: 200, intOpCode: 'SxGW200', data: [{ status: 'ok', service: 'apigateway' }] });
});

app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`API Gateway corriendo en http://localhost:${PORT}`);
});
