// ============================================================
// models/User.js — User Schema
// ============================================================
// Defines the MongoDB schema for users.
// Passwords are automatically hashed before saving.
// ============================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // Full name of the user
  name: {
    type: String,
    required: [true, "Please provide your name"],
    trim: true,
    maxlength: [50, "Name cannot exceed 50 characters"],
  },

  // Email address (must be unique)
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },

  // Hashed password
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, // Don't include password in queries by default
  },

  // Account creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create index on email for faster lookups
userSchema.index({ email: 1 });

// ── Pre-save Hook: Hash the password before storing ────────
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance Method: Compare entered password with stored hash ──
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
