const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function validate(schema) {
  const validateFn = ajv.compile(schema);
  return (req, res, next) => {
    console.log('🔍 Validation middleware - Request body:', req.body);
    console.log('🔍 Validation middleware - Schema:', schema);

    const valid = validateFn(req.body);
    console.log('🔍 Validation result:', valid);

    if (!valid) {
      const errors = validateFn.errors.map(e => `${e.instancePath} ${e.message}`.trim());
      console.error('❌ Validation errors:', errors);
      res.status(400).json({ statusCode: 400, intOpCode: 'SxUS400', data: null, message: 'Datos inválidos: ' + errors.join('; ') });
      return;
    }

    console.log('✅ Validation passed');
    next();
  };
}

module.exports = { validate };
