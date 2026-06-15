require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3006;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Notification Service', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [{ name: 'Notifications', description: 'Email notification endpoints' }],
  },
  apis: ['./routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs-json', (req, res) => res.json(swaggerSpec));
app.use('/api/notifications', notificationsRouter);
app.get('/health', (req, res) => res.json({ status: 'up', service: 'notification-service' }));

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => console.log(`Notification Service running on http://localhost:${PORT}`));
