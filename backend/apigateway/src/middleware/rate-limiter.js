// Configuración para @fastify/rate-limit
const rateLimiter = {
  max: 100,           // máximo de peticiones por ventana
  timeWindow: 60000,  // ventana de 1 minuto en ms
  errorResponseBuilder: () => ({
    error: 'Too many requests',
    message: 'Has superado el límite de peticiones. Intenta de nuevo en 1 minuto.'
  })
};

module.exports = { rateLimiter };
