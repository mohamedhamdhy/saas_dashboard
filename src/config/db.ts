import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// 1. Load environment variables from the .env file into process.env
dotenv.config();

/**
 * 2. Initialize Sequelize Instance
 * We pass the database name, user, and password (using '!' to tell TS these won't be null).
 * The configuration object defines the "where" and "how" of the connection.
 */
export const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST,
    // Ensure the port is a number; default to 5432 for PostgreSQL
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    // Set to 'true' or 'console.log' if you want to see the SQL queries in your terminal
    logging: false, 
  }
);

/**
 * 3. Database Connection Function
 * This is an asynchronous function that handles the lifecycle of the connection.
 */
export const connectDB = async () => {
  try {
    // Verifies the connection credentials and host reachability
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully 🚀");

    /**
     * sequelize.sync({ alter: true })
     * This checks the current state of the DB and performs necessary changes 
     * to make it match your TypeScript models (adding columns, etc.)
     * Note: Use 'alter' with caution in production.
     */
    await sequelize.sync({ alter: true }); 
    console.log("Database tables synchronized ✅");
  } catch (err) {
    // Log the error and shut down the app if the DB connection fails
    console.error("Unable to connect to the database:", err);
    process.exit(1);
  }
};