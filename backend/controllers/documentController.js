// ============================================================
// controllers/documentController.js — Document Handlers
// ============================================================
// Handles uploading, listing, downloading, deleting,
// and searching documents using AWS S3.
// ============================================================

const Document = require("../models/Document");
const { uploadToS3, deleteFromS3, streamFromS3, IMAGE_EXTENSIONS } = require("../config/s3");

// MIME type lookup for common file formats
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
  "7z": "application/x-7z-compressed",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
};

// ── POST /api/documents/upload ─────────────────────────────
// Upload a file to S3 and save metadata to MongoDB
const uploadDocument = async (req, res) => {
  try {
    // Multer has stored the file in memory
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select a file.",
      });
    }

    // Upload to S3
    const uploadResult = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Create a new document record in MongoDB
    const document = await Document.create({
      fileName: uploadResult.fileName,
      s3Key: uploadResult.key,
      fileType: uploadResult.fileType,
      fileSize: uploadResult.fileSize,
      resourceType: uploadResult.resourceType,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during file upload",
    });
  }
};

// ── GET /api/documents?search=keyword ──────────────────────
// Get all documents for the logged-in user, with optional search
const getDocuments = async (req, res) => {
  try {
    const { search } = req.query;

    // Build the query — always filter by the current user
    let query = { userId: req.user._id };

    // If a search term is provided, filter by fileName (case-insensitive)
    if (search) {
      query.fileName = { $regex: search, $options: "i" };
    }

    // Fetch documents sorted by newest first
    const documents = await Document.find(query).sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching documents",
    });
  }
};

// ── GET /api/documents/download/:id ────────────────────────
// Stream the file from S3 to the client as a download
const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    // Check if document exists
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Ensure the document belongs to the current user
    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this document",
      });
    }

    // Get file stream from S3
    const { stream, contentType } = await streamFromS3(document.s3Key);

    // Determine correct MIME type
    const mimeType = MIME_TYPES[document.fileType] || contentType || "application/octet-stream";

    // Set headers for file download
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.fileName)}"`
    );

    // Pipe the S3 stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while downloading document",
    });
  }
};

// ── GET /api/documents/preview/:id ─────────────────────────
// Stream the file from S3 for inline preview in the browser
const previewDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this document",
      });
    }

    // Get file stream from S3
    const { stream, contentType } = await streamFromS3(document.s3Key);

    const mimeType = MIME_TYPES[document.fileType] || contentType || "application/octet-stream";

    // Content-Disposition: inline tells the browser to render the file
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.fileName)}"`
    );

    // Pipe the S3 stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while previewing document",
    });
  }
};

// ── DELETE /api/documents/:id ──────────────────────────────
// Delete a document from S3 and MongoDB
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    // Check if document exists
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Ensure the document belongs to the current user
    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this document",
      });
    }

    // Delete from S3
    await deleteFromS3(document.s3Key);

    // CASCADE DELETE: Remove all share links associated with this document
    const SharedLink = require("../models/SharedLink");
    const deletedShares = await SharedLink.deleteMany({ documentId: req.params.id });
    
    console.log(`Deleted ${deletedShares.deletedCount} share links for document ${req.params.id}`);

    // Remove the document record from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      deletedShares: deletedShares.deletedCount,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting document",
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  downloadDocument,
  previewDocument,
  deleteDocument,
};
