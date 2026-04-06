// Middleware de validación AJV para el servicio de usuarios
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function validate(schema) {
  const validateFn = ajv.compile(schema);
  return (req, res, next) => {
    const valid = validateFn(req.body);
    if (!valid) {
      const errors = validateFn.errors.map(e => `${e.instancePath} ${e.message}`.trim());
      res.status(400).json({ statusCode: 400, intOpCode: 'SxUS400', data: null, message: 'Datos inválidos: ' + errors.join('; ') });
      return;
    }
    next();
  };
}

module.exports = { validate };
