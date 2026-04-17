// ============================================================
// routes/authRoutes.js — Authentication Routes
// ============================================================

const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

// POST /api/auth/register — Create a new user account
router.post("/register", authLimiter, register);

// POST /api/auth/login    — Log in and receive a JWT token
router.post("/login", authLimiter, login);

module.exports = router;
