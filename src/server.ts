import app from "./app";          
import { connectDB } from "./config/db";

/**
 * 1. Database Initialization
 * We call connectDB() here to ensure the database connection and 
 * table synchronization happen as soon as the process starts.
 */
connectDB();

/**
 * 2. Port Configuration
 * We check the environment variables for a PORT (standard for deployment 
 * on platforms like Heroku or Docker). If not found, we default to 5000.
 */
const PORT = process.env.PORT || 5000;

/**
 * 3. Start the Server
 * The .listen() method starts the HTTP server. 
 * Once the server is ready to receive requests, the callback function runs,
 * printing the confirmation message to your console.
 */
app.listen(PORT, () => {
  console.log(`🚀 Server is officially running on port ${PORT}`);
  console.log(`🔗 Local link: http://localhost:${PORT}`);
});