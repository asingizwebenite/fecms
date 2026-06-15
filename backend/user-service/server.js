require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const sequelize = require('./config/database');
const User = require('./models/User');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

sequelize
  .authenticate()
  .then(() => {
    console.log('📦 User Service connected to PostgreSQL');
    return User.sync({ alter: true });
  })
  .then(() => console.log('✅ Users table synced'))
  .catch((err) => console.error('Database error:', err));

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'User Management Service', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    tags: [{ name: 'Users', description: 'User management endpoints' }],
  },
  apis: ['./routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs-json', (req, res) => res.json(swaggerSpec));
app.use('/api/users', usersRouter);
app.get('/health', (req, res) => res.json({ status: 'up', service: 'user-service' }));

app.listen(PORT, () => console.log(`👤 User Service running on http://localhost:${PORT}`));
