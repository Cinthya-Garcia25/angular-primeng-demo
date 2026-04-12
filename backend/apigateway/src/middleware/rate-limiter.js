const rateLimiter = {
  max: 100,
  timeWindow: 60000,

  errorResponseBuilder: (req, context) => ({
    statusCode: 429,
    intOpCode: 'SxRL429',
    data: null,
    message: `Too many requests. Límite de ${context.max} requests por minuto excedido. Intenta de nuevo en ${Math.ceil(context.after / 1000)} segundos.`
  }),

  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
};

module.exports = { rateLimiter };
