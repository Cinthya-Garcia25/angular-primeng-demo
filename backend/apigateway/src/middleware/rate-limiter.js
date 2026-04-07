// Configuración para @fastify/rate-limit
const rateLimiter = {
  max: 100,           // máximo de peticiones por ventana
  timeWindow: 60000,  // ventana de 1 minuto en ms (60000ms)
  
  // Personalizar respuesta cuando se excede el límite
  errorResponseBuilder: (req, context) => ({
    statusCode: 429,
    intOpCode: 'SxRL429',
    data: null,
    message: `Too many requests. Límite de ${context.max} requests por minuto excedido. Intenta de nuevo en ${Math.ceil(context.after / 1000)} segundos.`
  }),
  
  // Incluir headers de rate limit en la respuesta
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
};

module.exports = { rateLimiter };
