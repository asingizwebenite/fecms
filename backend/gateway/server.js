require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');
const swaggerUi = require('swagger-ui-express');
const axios = require('axios');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

const SERVICES = {
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  extinguishers: process.env.EXTINGUISHER_SERVICE_URL || 'http://localhost:3003',
  inspections: process.env.INSPECTION_SERVICE_URL || 'http://localhost:3004',
  maintenance: process.env.INSPECTION_SERVICE_URL || 'http://localhost:3004',
  reports: process.env.REPORTING_SERVICE_URL || 'http://localhost:3005',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
};

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Swagger aggregation ──────────────────────────────────────
const buildSwaggerSpec = async () => {
  const specs = await Promise.allSettled([
    axios.get(`${SERVICES.users}/api-docs-json`),
    axios.get(`${SERVICES.auth}/api-docs-json`),
    axios.get(`${SERVICES.extinguishers}/api-docs-json`),
    axios.get(`${SERVICES.inspections}/api-docs-json`),
    axios.get(`${SERVICES.reports}/api-docs-json`),
    axios.get(`${SERVICES.notifications}/api-docs-json`),
  ]);

  const combined = {
    openapi: '3.0.0',
    info: {
      title: 'TWZ FEMS - Fire Extinguisher Management System API',
      version: '1.0.0',
      description: 'Aggregated API documentation for all FECMS microservices',
    },
    servers: [{ url: `http://localhost:${PORT}/api`, description: 'API Gateway' }],
    paths: {},
    components: { schemas: {}, securitySchemes: {} },
    tags: [],
  };

  for (const result of specs) {
    if (result.status === 'fulfilled') {
      const spec = result.value.data;
      Object.assign(combined.paths, spec.paths || {});
      if (spec.components?.schemas) Object.assign(combined.components.schemas, spec.components.schemas);
      if (spec.components?.securitySchemes) Object.assign(combined.components.securitySchemes, spec.components.securitySchemes);
      if (spec.tags) combined.tags.push(...spec.tags);
    }
  }
  return combined;
};

app.use('/api-docs', async (req, res, next) => {
  try {
    const spec = await buildSwaggerSpec();
    swaggerUi.setup(spec)(req, res, next);
  } catch {
    next();
  }
});

app.get('/api-docs-setup', async (req, res) => {
  const spec = await buildSwaggerSpec();
  swaggerUi.setup(spec);
  res.redirect('/api-docs');
});

// Serve swagger UI assets
app.use('/api-docs', swaggerUi.serve);

app.get('/api-docs-json', async (req, res) => {
  const spec = await buildSwaggerSpec();
  res.json(spec);
});

// ── Proxy routes ─────────────────────────────────────────────
const proxyOptions = { proxyReqPathResolver: (req) => req.originalUrl };

app.use('/api/users', proxy(SERVICES.users, { proxyReqPathResolver: (req) => `/api/users${req.url}` }));
app.use('/api/auth', proxy(SERVICES.auth, { proxyReqPathResolver: (req) => `/api/auth${req.url}` }));
app.use('/api/extinguishers', proxy(SERVICES.extinguishers, { proxyReqPathResolver: (req) => `/api/extinguishers${req.url}` }));
app.use('/api/inspections', proxy(SERVICES.inspections, { proxyReqPathResolver: (req) => `/api/inspections${req.url}` }));
app.use('/api/maintenance', proxy(SERVICES.maintenance, { proxyReqPathResolver: (req) => `/api/maintenance${req.url}` }));
app.use('/api/reports', proxy(SERVICES.reports, { proxyReqPathResolver: (req) => `/api/reports${req.url}` }));
app.use('/api/notifications', proxy(SERVICES.notifications, { proxyReqPathResolver: (req) => `/api/notifications${req.url}` }));

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([name, url]) => {
      const r = await axios.get(`${url}/health`, { timeout: 3000 });
      return { name, status: 'up', url };
    })
  );
  const services = checks.map((c, i) => ({
    name: Object.keys(SERVICES)[i],
    status: c.status === 'fulfilled' ? 'up' : 'down',
  }));
  res.json({ gateway: 'up', services });
});

app.get('/', (req, res) => {
  res.json({
    message: 'TWZ FEMS API Gateway',
    docs: `http://localhost:${PORT}/api-docs`,
    health: `http://localhost:${PORT}/health`,
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/api-docs`);
});
