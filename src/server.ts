import app from "./app";
import { connectDB } from "./config/db";
import { initCronJobs } from "./utils/cronJobs";

const PORT = process.env.PORT || 5000;

connectDB();

initCronJobs();

app.listen(PORT, () => {
  console.log(`🚀 Server is officially running on port ${PORT}`);
  console.log(`🔗 Local link: http://localhost:${PORT}`);
  console.log(`⏰ Background Cron Jobs have been initialized.`);
});