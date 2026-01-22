// MODULE: Database Connector & Lifecycle Manager
// Provides the singleton Sequelize instance and handles the authentication handshake.

// HEADER: Imports & Setup
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import winston from "winston";

dotenv.config();

// HEADER: Internal Logger Configuration
// NOTE: Winston is used over console.log for structured, levels-based debugging (Info, Error, Debug).
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const { timestamp = new Date().toISOString(), level, message } = info as { timestamp?: string; level: string; message: string };
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// HEADER: Database Instance Initialization
// SECURITY: Using non-null assertion (!) for env variables; ensures the app crashes early if secrets are missing.
export const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    // SECURITY: SSL configuration enforced in production to protect data-in-transit.
    dialectOptions:
      process.env.NODE_ENV === "production"
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : undefined,
    // PERF: Redirects raw SQL queries to the winston 'debug' stream for dev-only visibility.
    logging: (msg) => logger.debug(msg),
    // PERF: Connection Pool Tuning
    // NOTE: Prevents database 'overload' by managing the number of concurrent connections.
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// HEADER: Database Connectivity Verification
// API: Exposed function used in the main server bootstrap sequence (server.ts).
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info("PostgreSQL connected successfully 🚀");
  } catch (err) {
    // FIX: Immediate process exit on failure to prevent the app from running in a 'broken' state.
    logger.error("Unable to connect to the database: " + (err as Error).message);
    process.exit(1);
  }
};