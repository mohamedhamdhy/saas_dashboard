import app from "./app";          
import { connectDB } from "./config/db";

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is officially running on port ${PORT}`);
  console.log(`🔗 Local link: http://localhost:${PORT}`);
});