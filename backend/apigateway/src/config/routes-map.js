// Mapa de prefijos de ruta → URL del microservicio destino
const ROUTES_MAP = {
  '/api/auth':    process.env.USERS_SERVICE_URL    ?? 'http://localhost:3001',
  '/api/users':   process.env.USERS_SERVICE_URL    ?? 'http://localhost:3001',
  '/api/tickets': process.env.TICKETS_SERVICE_URL  ?? 'http://localhost:3002',
  '/api/groups':  process.env.GROUPS_SERVICE_URL   ?? 'http://localhost:3003',
};

module.exports = { ROUTES_MAP };
