require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const groupsRoutes      = require('./src/routes/groups.routes');
const permissionsRoutes = require('./src/routes/permissions.routes');
const { logError }      = require('./src/utils/logger');

const app  = express();
const PORT = process.env.GROUPS_PORT ?? 3003;

app.use(cors());
app.use(express.json());

app.use('/api/groups',      groupsRoutes);
app.use('/api/permissions', permissionsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'groups' }));

app.use((err, req, res, _next) => {
  logError({
    servicio:    'groups',
    metodo:      req.method,
    endpoint:    req.url,
    usuario_id:  req.user?.userId ?? null,
    ip:          req.ip,
    mensaje:     err.message,
    stack_trace: err.stack
  });
  res.status(500).json({ statusCode: 500, intOpCode: 'SxGS500', data: null, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Groups service corriendo en http://localhost:${PORT}`);
});
