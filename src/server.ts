// MODULE: Server Lifecycle & Process Manager
// HEADER: Imports
import app from "./app";
import { connectDB, sequelize } from "./config/db"; 
import { initCronJobs } from "./utils/cronJobs";

const PORT = process.env.PORT || 5000;

// HEADER: Execution
// NOTE: We initialize the database and background tasks before opening the port.
connectDB();
initCronJobs();

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is officially running on port ${PORT}`);
  console.log(`🔗 Local link: http://localhost:${PORT}`);
  console.log(`⏰ Background Cron Jobs have been initialized.`);
});

// HEADER: Graceful Shutdown Logic
// SECURITY: Handles termination signals (SIGINT, SIGTERM) to prevent data loss.
const gracefulShutdown = async (signal: string) => {
  console.log(`\nRECEIVED ${signal} 🛑. Starting Graceful Shutdown...`);

  // STATE: Stop the server from accepting new requests.
  server.close(async () => {
    console.log("✔ Express server closed.");

    try {
      // DB: Closing the Sequelize connection pool.
      // NOTE: This ensures all pending queries are finished and the DB port is released.
      await sequelize.close();
      console.log("✔ Database connection pool drained and closed.");
      
      console.log("👋 Cleanup complete. Process exiting.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during database shutdown:", err);
      process.exit(1);
    }
  });

  // FIX: Force exit after 10 seconds if the shutdown hangs.
  setTimeout(() => {
    console.error("❗ Could not close connections in time, forcing shut down.");
    process.exit(1);
  }, 10000);
};

// HEADER: Signal Listeners
// NOTE: SIGINT is triggered by Ctrl+C. SIGTERM is triggered by hosting providers like Heroku/AWS.
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// SECURITY: Handle Unhandled Promise Rejections to prevent silent failures.
process.on("unhandledRejection", (err: Error) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});