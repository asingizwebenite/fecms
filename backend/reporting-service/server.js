require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { sequelize } = require('./models');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.REPORTING_SERVICE_PORT || 3005;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

sequelize
  .authenticate()
  .then(() => console.log('Reporting Service connected to PostgreSQL'))
  .catch((err) => console.error('Database error:', err));

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Reporting Service', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    tags: [{ name: 'Reports', description: 'Reporting and analytics endpoints' }],
  },
  apis: ['./routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs-json', (req, res) => res.json(swaggerSpec));
app.use('/api/reports', reportsRouter);
app.get('/health', (req, res) => res.json({ status: 'up', service: 'reporting-service' }));

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => console.log(`Reporting Service running on http://localhost:${PORT}`));
