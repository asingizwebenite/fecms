require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const sequelize = require('./config/database');
const Extinguisher = require('./models/Extinguisher');
const extinguishersRouter = require('./routes/extinguishers');

const app = express();
const PORT = process.env.EXTINGUISHER_SERVICE_PORT || 3003;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

sequelize
  .authenticate()
  .then(() => {
    console.log('📦 Extinguisher Service connected to PostgreSQL');
    return Extinguisher.sync({ alter: true });
  })
  .then(() => console.log('✅ Extinguishers table synced'))
  .catch((err) => console.error('Database error:', err));

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Fire Extinguisher Management Service', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        ExtinguisherInput: {
          type: 'object',
          required: ['serialNumber', 'location', 'type', 'size', 'installationDate', 'expiryDate'],
          properties: {
            serialNumber: { type: 'string' },
            location: { type: 'string' },
            type: { type: 'string', enum: ['Water', 'CO2', 'Foam', 'Dry Chemical'] },
            size: { type: 'string', enum: ['1.5 lb', '5 lb', '9 lb', '12 lb'] },
            installationDate: { type: 'string', format: 'date' },
            expiryDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['Active', 'Expired', 'Under Maintenance', 'Decommissioned'] },
            notes: { type: 'string' },
          },
        },
      },
    },
    tags: [{ name: 'Extinguishers', description: 'Fire extinguisher management endpoints' }],
  },
  apis: ['./routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs-json', (req, res) => res.json(swaggerSpec));
app.use('/api/extinguishers', extinguishersRouter);
app.get('/health', (req, res) => res.json({ status: 'up', service: 'extinguisher-service' }));

app.listen(PORT, () => console.log(`🧯 Extinguisher Service running on http://localhost:${PORT}`));
