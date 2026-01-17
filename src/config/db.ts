import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    logging: false,
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected");

    // Automatically update tables without dropping existing ones
    await sequelize.sync({ alter: true }); // safe for existing enums
    console.log("Tables synced ✅");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
};

