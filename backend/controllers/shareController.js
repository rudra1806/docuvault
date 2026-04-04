// ============================================================
// controllers/shareController.js — Share Link Handlers
// ============================================================
// Handles creating, managing, and accessing shared document links.
// ============================================================

const SharedLink = require("../models/SharedLink");
const Document = require("../models/Document");
const bcrypt = require("bcryptjs");
const { streamFromS3 } = require("../config/s3");

// Constants
const MAX_ACCESS_LOG_ENTRIES = 50;
const MIN_PASSWORD_LENGTH = 6;

// MIME type lookup
const MIME_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
};

// ── POST /api/share/create ─────────────────────────────────
// Create a new shareable link for a document
const createShareLink = async (req, res) => {
  try {
    const { documentId, password, permission, expiresIn } = req.body;

    // Validate document exists and belongs to user
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to share this document",
      });
    }

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password && password.trim()) {
      // Validate password length
      if (password.trim().length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        });
      }
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Create the shared link
    const sharedLink = await SharedLink.create({
      documentId,
      createdBy: req.user._id,
      password: hashedPassword,
      permission: permission || "view",
      expiresAt,
    });

    // Populate document details
    await sharedLink.populate("documentId", "fileName fileType fileSize");

    res.status(201).json({
      success: true,
      message: "Share link created successfully",
      sharedLink: {
        _id: sharedLink._id,
        token: sharedLink.token,
        permission: sharedLink.permission,
        expiresAt: sharedLink.expiresAt,
        hasPassword: !!sharedLink.password,
        isActive: sharedLink.isActive,
        accessCount: sharedLink.accessCount,
        downloadCount: sharedLink.downloadCount,
        lastAccessedAt: sharedLink.lastAccessedAt,
        document: sharedLink.documentId,
        createdAt: sharedLink.createdAt,
        isExpired: sharedLink.isExpired(),
        isValid: sharedLink.isValid(),
      },
    });
  } catch (error) {
    console.error("Create share link error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating share link",
    });
  }
};

// ── GET /api/share/my-shares ───────────────────────────────
// Get all share links created by the current user
const getMyShares = async (req, res) => {
  try {
    const shares = await SharedLink.find({ createdBy: req.user._id })
      .populate("documentId", "fileName fileType fileSize")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: shares.length,
      shares: shares.map((share) => ({
        _id: share._id,
        token: share.token,
        document: share.documentId,
        permission: share.permission,
        expiresAt: share.expiresAt,
        hasPassword: !!share.password,
        isActive: share.isActive,
        accessCount: share.accessCount,
        downloadCount: share.downloadCount,
        lastAccessedAt: share.lastAccessedAt,
        createdAt: share.createdAt,
        isExpired: share.isExpired(),
        isValid: share.isValid(),
      })),
    });
  } catch (error) {
    console.error("Get my shares error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching shares",
    });
  }
};

// ── GET /api/share/document/:documentId ────────────────────
// Get all share links for a specific document
const getDocumentShares = async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document belongs to user
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view shares for this document",
      });
    }

    const shares = await SharedLink.find({ documentId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: shares.length,
      shares: shares.map((share) => ({
        _id: share._id,
        token: share.token,
        permission: share.permission,
        expiresAt: share.expiresAt,
        hasPassword: !!share.password,
        isActive: share.isActive,
        accessCount: share.accessCount,
        downloadCount: share.downloadCount,
        lastAccessedAt: share.lastAccessedAt,
        createdAt: share.createdAt,
        isExpired: share.isExpired(),
        isValid: share.isValid(),
      })),
    });
  } catch (error) {
    console.error("Get document shares error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching document shares",
    });
  }
};

// ── DELETE /api/share/:shareId ─────────────────────────────
// Delete a share link
const deleteShareLink = async (req, res) => {
  try {
    const { shareId } = req.params;

    const share = await SharedLink.findById(shareId);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    // Verify ownership
    if (share.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this share link",
      });
    }

    await SharedLink.findByIdAndDelete(shareId);

    res.status(200).json({
      success: true,
      message: "Share link deleted successfully",
    });
  } catch (error) {
    console.error("Delete share link error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting share link",
    });
  }
};

// ── PATCH /api/share/:shareId/toggle ───────────────────────
// Toggle share link active status
const toggleShareLink = async (req, res) => {
  try {
    const { shareId } = req.params;

    const share = await SharedLink.findById(shareId);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    // Verify ownership
    if (share.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this share link",
      });
    }

    share.isActive = !share.isActive;
    await share.save();

    res.status(200).json({
      success: true,
      message: `Share link ${share.isActive ? "activated" : "deactivated"}`,
      isActive: share.isActive,
    });
  } catch (error) {
    console.error("Toggle share link error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while toggling share link",
    });
  }
};

// ── POST /api/share/access/:token ──────────────────────────
// Verify access to a shared link (with optional password)
const verifyShareAccess = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await SharedLink.findOne({ token }).populate(
      "documentId",
      "fileName fileType fileSize uploadDate"
    );

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    // Check if link is valid
    if (!share.isValid()) {
      return res.status(403).json({
        success: false,
        message: share.isExpired() ? "This link has expired" : "This link is no longer active",
      });
    }

    // Check password if required
    if (share.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: "Password required",
          requiresPassword: true,
        });
      }

      const isMatch = await bcrypt.compare(password, share.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password",
          requiresPassword: true,
        });
      }
    }

    // Update analytics
    share.accessCount += 1;
    share.lastAccessedAt = new Date();
    
    // Log access (keep only last N entries to prevent bloat)
    if (share.accessLog.length >= MAX_ACCESS_LOG_ENTRIES) {
      share.accessLog = share.accessLog.slice(-(MAX_ACCESS_LOG_ENTRIES - 1));
    }
    
    share.accessLog.push({
      accessedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    await share.save();

    res.status(200).json({
      success: true,
      message: "Access granted",
      share: {
        token: share.token,
        permission: share.permission,
        document: share.documentId,
      },
    });
  } catch (error) {
    console.error("Verify share access error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while verifying access",
    });
  }
};

// ── GET /api/share/preview/:token ──────────────────────────
// Preview a shared document
const previewSharedDocument = async (req, res) => {
  try {
    const { token } = req.params;

    const share = await SharedLink.findOne({ token }).populate("documentId");

    if (!share || !share.isValid()) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired share link",
      });
    }

    const document = share.documentId;

    // Get file stream from S3
    const { stream, contentType } = await streamFromS3(document.s3Key);

    const mimeType = MIME_TYPES[document.fileType] || contentType || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.fileName)}"`
    );

    // Pipe the S3 stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error("Preview shared document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while previewing document",
    });
  }
};

// ── GET /api/share/download/:token ─────────────────────────
// Download a shared document (if permission allows)
const downloadSharedDocument = async (req, res) => {
  try {
    const { token } = req.params;

    const share = await SharedLink.findOne({ token }).populate("documentId");

    if (!share || !share.isValid()) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired share link",
      });
    }

    // Check download permission
    if (share.permission !== "download") {
      return res.status(403).json({
        success: false,
        message: "This link does not allow downloads",
      });
    }

    const document = share.documentId;

    // Get file stream from S3
    const { stream, contentType } = await streamFromS3(document.s3Key);

    const mimeType = MIME_TYPES[document.fileType] || contentType || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.fileName)}"`
    );

    // Update download count
    share.downloadCount += 1;
    await share.save();

    // Pipe the S3 stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error("Download shared document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while downloading document",
    });
  }
};

module.exports = {
  createShareLink,
  getMyShares,
  getDocumentShares,
  deleteShareLink,
  toggleShareLink,
  verifyShareAccess,
  previewSharedDocument,
  downloadSharedDocument,
};
