// ============================================================
// models/Document.js — Document Schema
// ============================================================
// Defines the MongoDB schema for uploaded documents.
// Each document stores metadata + a reference to its S3 key.
// ============================================================

const mongoose = require("mongoose");
const logger = require("../config/logger");

const documentSchema = new mongoose.Schema({
  // Original file name chosen by the user
  fileName: {
    type: String,
    required: [true, "File name is required"],
    trim: true,
  },

  // S3 key (path) where the file is stored
  s3Key: {
    type: String,
    required: [true, "S3 key is required"],
  },

  // File type / extension (e.g., "pdf", "jpg")
  fileType: {
    type: String,
    required: true,
  },

  // File size in bytes
  fileSize: {
    type: Number,
    default: 0,
  },

  // Resource type ("image" or "raw") - kept for compatibility
  resourceType: {
    type: String,
    enum: ["image", "raw"],
    default: "raw",
  },

  // Reference to the user who uploaded this document
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Upload timestamp
  uploadDate: {
    type: Date,
    default: Date.now,
  },

  // ── AI Processing Fields ──────────────────────────────
  // Current AI processing status
  aiStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "skipped"],
    default: "pending",
  },

  // Number of text chunks generated from this document
  chunkCount: {
    type: Number,
    default: 0,
  },

  // Error message if AI processing failed
  aiError: {
    type: String,
    default: null,
  },

  // Timestamp when AI processing completed
  aiProcessedAt: {
    type: Date,
    default: null,
  },
});

// Create indexes for better query performance
documentSchema.index({ userId: 1, uploadDate: -1 }); // For listing user's documents sorted by date
documentSchema.index({ userId: 1, fileName: 1 }); // For searching by filename

// ── Pre-remove Hook: Cascade delete share links ────────────
// This ensures share links are deleted even if document is removed directly
documentSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const SharedLink = require("./SharedLink");
    await SharedLink.deleteMany({ documentId: this._id });
    logger.info(`Cascade deleted share links for document ${this._id}`);
    next();
  } catch (error) {
    logger.error("Error in cascade delete:", error);
    next(error);
  }
});

// Also handle findByIdAndDelete and findOneAndDelete
documentSchema.pre('findOneAndDelete', async function(next) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      const SharedLink = require("./SharedLink");
      await SharedLink.deleteMany({ documentId: doc._id });
      logger.info(`Cascade deleted share links for document ${doc._id}`);
    }
    next();
  } catch (error) {
    logger.error("Error in cascade delete:", error);
    next(error);
  }
});

module.exports = mongoose.model("Document", documentSchema);
