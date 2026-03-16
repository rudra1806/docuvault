// ============================================================
// middleware/auth.js — JWT Authentication Middleware
// ============================================================
// Protects routes by verifying the JWT token sent in the
// Authorization header (Bearer <token>).
// ============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect()
 * Middleware that checks for a valid JWT and attaches the
 * authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  // Check if the Authorization header contains a Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Also accept token from query param (needed for iframe/img preview)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  // If no token was found, return 401
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — no token provided",
    });
  }

  try {
    // Verify the token and extract the payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user (without password) to the request object
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — invalid token",
    });
  }
};

module.exports = { protect };
