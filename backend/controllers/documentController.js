// ============================================================
// controllers/documentController.js — Document Handlers
// ============================================================
// Handles uploading, listing, downloading, deleting,
// and searching documents.
// ============================================================

const Document = require("../models/Document");
const { cloudinary, IMAGE_EXTENSIONS } = require("../config/cloudinary");
const https = require("https");
const http = require("http");
const path = require("path");

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
// Upload a file to Cloudinary and save metadata to MongoDB
const uploadDocument = async (req, res) => {
  try {
    // Multer + Cloudinary have already uploaded the file at this point
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select a file.",
      });
    }

    // Extract file extension from the original name
    const fileExtension = path.extname(req.file.originalname).replace(".", "").toLowerCase();

    // Determine resource type (matches the upload config logic)
    const resourceType = IMAGE_EXTENSIONS.includes(fileExtension) ? "image" : "raw";

    // Create a new document record in MongoDB
    const document = await Document.create({
      fileName: req.file.originalname,
      fileURL: req.file.path, // Cloudinary URL
      fileType: fileExtension,
      fileSize: req.file.size || 0,
      cloudinaryId: req.file.filename, // Cloudinary public_id
      resourceType: resourceType,
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
// Proxy the file from Cloudinary to the client as a download
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

    // Build the correct Cloudinary URL with fl_attachment for download
    let downloadURL = document.fileURL;

    // For Cloudinary URLs, add fl_attachment flag to force download
    if (downloadURL.includes("cloudinary.com")) {
      // For raw files, the URL usually works as-is
      // For images, we need to ensure the URL forces download
      if (document.resourceType === "image") {
        // Insert fl_attachment into the URL
        downloadURL = downloadURL.replace("/upload/", "/upload/fl_attachment/");
      }
    }

    // Determine correct MIME type
    const mimeType = MIME_TYPES[document.fileType] || "application/octet-stream";

    // Set headers for file download
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.fileName)}"`
    );

    // Fetch the file from Cloudinary and pipe it to the response
    const protocol = downloadURL.startsWith("https") ? https : http;

    protocol.get(downloadURL, (fileStream) => {
      if (fileStream.statusCode !== 200) {
        console.error("Cloudinary fetch failed with status:", fileStream.statusCode);
        return res.status(502).json({
          success: false,
          message: "Failed to fetch file from cloud storage",
        });
      }

      // Pipe the file data directly to the response
      fileStream.pipe(res);
    }).on("error", (err) => {
      console.error("Error fetching from Cloudinary:", err);
      res.status(500).json({
        success: false,
        message: "Error downloading file from cloud storage",
      });
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while downloading document",
    });
  }
};

// ── GET /api/documents/preview/:id ─────────────────────────
// Stream the file from Cloudinary for inline preview in the browser
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

    let previewURL = document.fileURL;

    // For images, add fl_attachment override removal if present
    if (document.resourceType === "image" && previewURL.includes("cloudinary.com")) {
      previewURL = previewURL.replace("/upload/fl_attachment/", "/upload/");
    }

    const mimeType = MIME_TYPES[document.fileType] || "application/octet-stream";

    // Content-Disposition: inline tells the browser to render the file
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.fileName)}"`
    );

    const protocol = previewURL.startsWith("https") ? https : http;

    protocol.get(previewURL, (fileStream) => {
      if (fileStream.statusCode !== 200) {
        console.error("Cloudinary preview fetch failed:", fileStream.statusCode);
        return res.status(502).json({
          success: false,
          message: "Failed to fetch file from cloud storage",
        });
      }
      fileStream.pipe(res);
    }).on("error", (err) => {
      console.error("Error fetching preview from Cloudinary:", err);
      res.status(500).json({
        success: false,
        message: "Error fetching file preview",
      });
    });
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while previewing document",
    });
  }
};

// ── DELETE /api/documents/:id ──────────────────────────────
// Delete a document from Cloudinary and MongoDB
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

    // Use the stored resourceType (falls back to guessing for old docs)
    const resourceType =
      document.resourceType ||
      (IMAGE_EXTENSIONS.includes(document.fileType) ? "image" : "raw");

    await cloudinary.uploader.destroy(document.cloudinaryId, {
      resource_type: resourceType,
    });

    // Remove the document record from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
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
