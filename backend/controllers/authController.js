// ============================================================
// controllers/authController.js — Authentication Handlers
// ============================================================
// Handles user registration and login.
// Returns a JWT token on successful auth.
// ============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../config/logger");

/**
 * generateToken()
 * Creates a signed JWT with the user's ID as payload.
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// ── POST /api/auth/register ────────────────────────────────
// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.logAuth("register", email, false, "Email already exists");
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Create the user (password is hashed by the pre-save hook)
    const user = await User.create({ name, email, password });

    // Generate JWT and respond
    const token = generateToken(user._id);

    logger.logAuth("register", email, true);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// ── POST /api/auth/login ───────────────────────────────────
// Log in an existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find the user and include the password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      logger.logAuth("login", email, false, "User not found");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.logAuth("login", email, false, "Invalid password");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT and respond
    const token = generateToken(user._id);

    logger.logAuth("login", email, true);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

module.exports = { register, login };
