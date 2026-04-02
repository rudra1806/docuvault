// ============================================================
// scripts/clearDatabase.js — Database Clearing Script
// ============================================================
// Clears all data from the MongoDB database.
// Use with caution - this will delete all users, documents, and shared links.
// ============================================================

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

// Import models
const User = require("../models/User");
const Document = require("../models/Document");
const SharedLink = require("../models/SharedLink");

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts user for confirmation before clearing database
 */
const confirmClear = () => {
  return new Promise((resolve) => {
    rl.question(
      "\n⚠️  WARNING: This will delete ALL data from the database!\n" +
        "Are you sure you want to continue? (yes/no): ",
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "yes");
      }
    );
  });
};

/**
 * Clears all collections in the database
 */
const clearDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get confirmation from user
    const confirmed = await confirmClear();

    if (!confirmed) {
      console.log("\n❌ Database clear cancelled.");
      process.exit(0);
    }

    console.log("\n🗑️  Clearing database...\n");

    // Delete all documents from each collection
    const usersDeleted = await User.deleteMany({});
    console.log(`✅ Deleted ${usersDeleted.deletedCount} users`);

    const documentsDeleted = await Document.deleteMany({});
    console.log(`✅ Deleted ${documentsDeleted.deletedCount} documents`);

    const sharedLinksDeleted = await SharedLink.deleteMany({});
    console.log(`✅ Deleted ${sharedLinksDeleted.deletedCount} shared links`);

    console.log("\n✨ Database cleared successfully!");
    console.log(
      `📊 Total records deleted: ${
        usersDeleted.deletedCount +
        documentsDeleted.deletedCount +
        sharedLinksDeleted.deletedCount
      }`
    );

    // Close connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error clearing database:", error.message);
    process.exit(1);
  }
};

// Run the script
clearDatabase();
