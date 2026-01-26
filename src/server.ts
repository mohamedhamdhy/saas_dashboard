// MODULE: Server Lifecycle & Process Manager
// Handles application startup, database synchronization, and graceful termination.

// HEADER: Imports
import app from "./app";
import { connectDB, sequelize } from "./config/db"; 
import { initCronJobs } from "./utils/cronJobs";

const PORT = process.env.PORT || 5000;

// HEADER: Execution
// NOTE: We initialize the database and background tasks before opening the port.
// This ensures the app doesn't accept requests until it's actually ready.
connectDB();
initCronJobs();

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is officially running on port ${PORT}`);
  console.log(`🔗 Local link: http://localhost:${PORT}`);
  console.log(`⏰ Background Cron Jobs have been initialized.`);
});

/**
 * 💡 Purpose
 * Handles graceful shutdown of the server and database connections
 * to ensure no data loss and safe exit, especially in Docker/Kubernetes environments. 🛑
 */
const gracefulShutdown = async (signal: string) => {
  // 💡 Signal Detection
  // Detect termination signals (SIGINT, SIGTERM) and start shutdown process
  console.log(`\nRECEIVED ${signal} 🛑. Starting Graceful Shutdown...`);

  // 💡 Stop Accepting New Requests
  // Close Express server to finish ongoing requests before shutting down
  server.close(async () => {
    console.log("✔ Express server closed.");

    try {
      // 💡 Database Cleanup
      // Close Sequelize connection pool to ensure all pending queries finish safely
      await sequelize.close();
      console.log("✔ Database connection pool drained and closed.");

      // 💡 Complete Cleanup
      // Exit process safely after cleaning up all resources
      console.log("👋 Cleanup complete. Process exiting.");
      process.exit(0);
    } catch (err) {
      // 💡 Error Handling
      // Log errors during shutdown and exit with error code
      console.error("❌ Error during database shutdown:", err);
      process.exit(1);
    }
  });

  // 💡 Safety Timeout
  // Force exit after 10 seconds if connections hang, preventing stuck containers
  setTimeout(() => {
    console.error("❗ Could not close connections in time, forcing shut down.");
    process.exit(1);
  }, 10000);
};

// 💡 Signal Listeners
// Listen for SIGINT (Ctrl+C) and SIGTERM (Cloud hosting termination) signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));


// SECURITY: Global Exception Guard.
// Prevents the server from staying in a "Zombie" state if an unhandled error occurs.
process.on("unhandledRejection", (err: Error) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});