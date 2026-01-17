import app from "./app";          // <-- ES module import
import { connectDB } from "./config/db";

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
