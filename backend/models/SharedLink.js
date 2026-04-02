// ============================================================
// models/SharedLink.js — Shared Link Schema
// ============================================================
// Defines the MongoDB schema for shareable document links.
// Tracks permissions, expiration, password protection, and analytics.
// ============================================================

const mongoose = require("mongoose");
const crypto = require("crypto");

const sharedLinkSchema = new mongoose.Schema({
  // Unique shareable token (used in the URL)
  token: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(16).toString("hex"),
  },

  // Reference to the document being shared
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true,
  },

  // Reference to the user who created the share
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Optional password protection (hashed)
  password: {
    type: String,
    default: null,
  },

  // Permissions: "view" (preview only) or "download" (can download)
  permission: {
    type: String,
    enum: ["view", "download"],
    default: "view",
  },

  // Optional expiration date
  expiresAt: {
    type: Date,
    default: null,
  },

  // Analytics: track access
  accessCount: {
    type: Number,
    default: 0,
  },

  // Analytics: track downloads
  downloadCount: {
    type: Number,
    default: 0,
  },

  // Analytics: last accessed timestamp
  lastAccessedAt: {
    type: Date,
    default: null,
  },

  // Access log (optional: store IP addresses or user agents)
  accessLog: [
    {
      accessedAt: { type: Date, default: Date.now },
      ipAddress: String,
      userAgent: String,
    },
  ],

  // Active status (can be disabled without deleting)
  isActive: {
    type: Boolean,
    default: true,
  },

  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better query performance
sharedLinkSchema.index({ token: 1 });
sharedLinkSchema.index({ documentId: 1 });
sharedLinkSchema.index({ createdBy: 1 });
sharedLinkSchema.index({ expiresAt: 1 });

// Method to check if link is expired
sharedLinkSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to check if link is valid
sharedLinkSchema.methods.isValid = function () {
  return this.isActive && !this.isExpired();
};

module.exports = mongoose.model("SharedLink", sharedLinkSchema);
