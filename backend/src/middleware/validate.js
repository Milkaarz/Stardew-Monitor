/** Validação de entrada com zod: substitui req.body/req.query pelos dados validados. */
export function validate(schema, where = 'body') {
  return (req, res, next) => {
    const r = schema.safeParse(where === 'query' ? { ...req.query } : where === 'params' ? req.params : req.body ?? {});
    if (!r.success) {
      const issues = r.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || where}: ${i.message}`);
      return res.status(400).json({ error: 'Dados inválidos.', issues });
    }
    if (where === 'query') req.validQuery = r.data;
    else if (where === 'params') req.validParams = r.data;
    else req.body = r.data;
    next();
  };
}

export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
