// ============================================================
// scripts/testCascadeDelete.js — Test Cascade Deletion
// ============================================================
// Test script to verify that deleting a document also deletes
// its associated share links.
// ============================================================

require("dotenv").config();
const mongoose = require("mongoose");
const Document = require("../models/Document");
const SharedLink = require("../models/SharedLink");

const testCascadeDelete = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find a document with share links
    const documents = await Document.find().limit(5);
    
    if (documents.length === 0) {
      console.log("❌ No documents found in database. Upload some documents first.");
      process.exit(0);
    }

    console.log(`📄 Found ${documents.length} documents\n`);

    for (const doc of documents) {
      const shareCount = await SharedLink.countDocuments({ documentId: doc._id });
      console.log(`Document: ${doc.fileName}`);
      console.log(`  ID: ${doc._id}`);
      console.log(`  Share Links: ${shareCount}`);
      
      if (shareCount > 0) {
        console.log(`\n🧪 Testing cascade delete for: ${doc.fileName}`);
        console.log(`  This document has ${shareCount} share link(s)`);
        
        // Delete the document
        await Document.findByIdAndDelete(doc._id);
        
        // Check if share links were deleted
        const remainingShares = await SharedLink.countDocuments({ documentId: doc._id });
        
        if (remainingShares === 0) {
          console.log(`  ✅ SUCCESS: All ${shareCount} share links were deleted!`);
        } else {
          console.log(`  ❌ FAILED: ${remainingShares} share links still exist!`);
        }
        
        console.log("\n✨ Test completed!");
        break;
      }
      console.log("");
    }

    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
};

// Run the test
console.log("═══════════════════════════════════════════════════════");
console.log("  CASCADE DELETE TEST");
console.log("═══════════════════════════════════════════════════════\n");
console.log("⚠️  WARNING: This will delete one document and its shares!");
console.log("    Make sure you're testing on a development database.\n");

testCascadeDelete();
