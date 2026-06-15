const { Sequelize } = require('sequelize');

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      },
      logging: false,
    })
  : new Sequelize(
      process.env.POSTGRES_DB || 'fecms_new',
      process.env.POSTGRES_USER || 'postgres',
      process.env.POSTGRES_PASSWORD || '',
      {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
      }
    );

module.exports = sequelize;
