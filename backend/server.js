// ============================================================
// server.js — Express Application Entry Point
// ============================================================
// Sets up Express, connects to MongoDB, mounts routes,
// and starts listening for requests.
// ============================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables FIRST before any other imports
dotenv.config();

const connectDB = require("./config/db");
const logger = require("./config/logger");

// Import route files
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const shareRoutes = require("./routes/shareRoutes");

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
app.use("/api/share", shareRoutes);

// ── Health Check Route ─────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cloud DMS API is running 🚀",
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  logger.logError(err, req);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
});
