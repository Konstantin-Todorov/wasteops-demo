// Превръща zod грешка в едно четимо съобщение на български.
function formatZodError(err) {
  const issues = err.issues || [];
  return issues.map(i => {
    const path = (i.path || []).join('.');
    return path ? `${path}: ${i.message}` : i.message;
  }).join('; ');
}

// Валидира req.body по зададена схема и заменя тялото с изчистените данни.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }
    req.body = result.data;
    next();
  };
}

// Валидира конкретни query параметри. Непознатите се оставят непокътнати.
function validateQuery(shape) {
  return (req, res, next) => {
    for (const [key, schema] of Object.entries(shape)) {
      if (req.query[key] === undefined) continue;
      const result = schema.safeParse(req.query[key]);
      if (!result.success) {
        return res.status(400).json({ error: `${key}: ${formatZodError(result.error)}` });
      }
      req.validated = req.validated || {};
      req.validated[key] = result.data;
    }
    next();
  };
}

// Проверява, че :id в пътя е валиден UUID — иначе Prisma хвърля 500.
function validateParamId(name = 'id') {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (req, res, next) => {
    if (!re.test(req.params[name] || '')) {
      return res.status(400).json({ error: 'Невалиден идентификатор' });
    }
    next();
  };
}

module.exports = { validateBody, validateQuery, validateParamId, formatZodError };
