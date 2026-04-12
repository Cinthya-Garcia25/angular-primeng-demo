require('dotenv').config();
const Fastify = require('fastify');
const { jwtValidator } = require('./src/middleware/jwt-validator');
const { permissionChecker } = require('./src/middleware/permission-checker');
const { rateLimiter } = require('./src/middleware/rate-limiter');
const { serviceProxy } = require('./src/proxy/service-proxy');
const { ROUTES_MAP } = require('./src/config/routes-map');
const { logRequest, logError } = require('./src/utils/logger');

const app = Fastify({ logger: true });
const PORT = process.env.GATEWAY_PORT ?? 3000;

app.register(require('@fastify/cors'), { origin: '*' });
app.register(require('@fastify/rate-limit'), rateLimiter);

app.addHook('preHandler', jwtValidator);
app.addHook('preHandler', permissionChecker);

app.addHook('onResponse', (req, reply, done) => {
  if (req.url !== '/health') {
    logRequest({
      servicio:    'apigateway',
      metodo:      req.method,
      endpoint:    req.url,
      usuario_id:  req.user?.userId ?? null,
      ip:          req.ip,
      status_http: reply.statusCode,
      duracion_ms: Math.round(reply.elapsedTime)
    });
  }
  done();
});

app.addHook('onError', (req, _reply, error, done) => {
  logError({
    servicio:    'apigateway',
    metodo:      req.method,
    endpoint:    req.url,
    usuario_id:  req.user?.userId ?? null,
    ip:          req.ip,
    mensaje:     error.message,
    stack_trace: error.stack
  });
  done();
});

app.all('/api/*', async (req, reply) => {
  return serviceProxy(req, reply, ROUTES_MAP);
});

app.get('/health', async (_req, reply) => {
  return reply.code(200).send({ statusCode: 200, intOpCode: 'SxGW200', data: [{ status: 'ok', service: 'apigateway' }] });
});

app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`API Gateway corriendo en http://localhost:${PORT}`);
});
