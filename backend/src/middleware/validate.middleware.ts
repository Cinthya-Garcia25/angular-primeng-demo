import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export function validate(schema: object) {
  const validateFn = ajv.compile(schema);

  return (req: Request, res: Response, next: NextFunction): void => {
    const valid = validateFn(req.body);
    if (!valid) {
      const errors = validateFn.errors!.map(e => `${e.instancePath} ${e.message}`.trim());
      res.status(400).json({ error: 'Datos inválidos', details: errors });
      return;
    }
    next();
  };
}
