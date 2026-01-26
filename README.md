// 🔒 SECURITY: Dynamic CORS configuration to restrict cross-origin access
import cors from "cors";

const allowedOrigins = [
    "http://localhost:3000",            // Local frontend
    "https://your-saas-dashboard.com"   // Production frontend
];

app.use(cors({
    // 🌐 Only allow requests from trusted origins
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);  // Allow non-browser requests (Postman, curl)
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = "The CORS policy for this site does not allow access from the specified Origin.";
            return callback(new Error(msg), false); // Reject unknown origins
        }
        return callback(null, true); // Accept allowed origins
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed HTTP methods
    credentials: true, // Allow cookies or auth headers
}));
