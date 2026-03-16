// ============================================================
// server.js — Express Application Entry Point
// ============================================================
// Sets up Express, connects to MongoDB, mounts routes,
// and starts listening for requests.
// ============================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables from .env file
dotenv.config();

// Import route files
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");

// Initialize Express app
const app = express();

// ── Middleware ──────────────────────────────────────────────
// Configure CORS - allow frontend origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions)); // Enable CORS with whitelist
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ── API Routes ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

// ── Health Check Route ─────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cloud DMS API is running 🚀",
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
