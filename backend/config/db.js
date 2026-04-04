// ============================================================
// config/db.js — MongoDB Connection Setup
// ============================================================
// Connects to MongoDB Atlas using Mongoose.
// The connection URI is read from the MONGODB_URI env variable.
// ============================================================

const mongoose = require("mongoose");
const logger = require("./logger");

/**
 * connectDB()
 * Establishes a connection to MongoDB.
 * Exits the process with code 1 if the connection fails.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
