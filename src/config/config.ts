// MODULE: Database Connection Environment Manager
// HEADER: Environment Configuration
require('dotenv').config();

// HEADER: Connection Settings Registry
module.exports = {
  // NOTE: Local development environment for rapid iteration and debugging.
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
  },

  // TEST: Isolated environment for Jest/Supertest execution.
  // NOTE: Uses a separate DB_NAME_TEST to prevent wiping development data during test runs.
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST,
    host: process.env.DB_HOST,
    dialect: 'postgres',
  },

  // SECURITY: Hardened production configuration.
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    // PERF: SSL encryption is mandatory for cloud-hosted databases (e.g., AWS RDS, Heroku, Supabase).
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
    },
  },
};