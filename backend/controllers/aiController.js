// ============================================================
// controllers/aiController.js — AI Processing Handlers
// ============================================================
// Orchestrates AI processing: triggers Python service,
// handles webhooks, proxies queries, and manages vectors.
// ============================================================

const axios = require("axios");
const Document = require("../models/Document");
const { streamFromS3 } = require("../config/s3");
const logger = require("../config/logger");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ── POST /api/ai/process/:documentId ───────────────────────
// Trigger AI processing for a specific document
const processDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Verify ownership
    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to process this document",
      });
    }

    // Check if already processing
    if (document.aiStatus === "processing") {
      return res.status(409).json({
        success: false,
        message: "Document is already being processed",
      });
    }

    // Update status to processing
    document.aiStatus = "processing";
    document.aiError = null;
    await document.save();

    // Download file from S3
    const { stream, contentType } = await streamFromS3(document.s3Key);

    // Collect stream into buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // Send to Python AI service
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: document.fileName,
      contentType: contentType || "application/octet-stream",
    });
    formData.append("file_id", document._id.toString());
    formData.append("user_id", document.userId.toString());
    formData.append("file_name", document.fileName);

    await axios.post(`${AI_SERVICE_URL}/process`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 second timeout for initial request
    });

    logger.info(`AI processing triggered for document ${document._id}`);

    res.status(200).json({
      success: true,
      message: "AI processing started",
      documentId: document._id,
      aiStatus: "processing",
    });
  } catch (error) {
    logger.logError(error);

    // Update document status to failed
    try {
      await Document.findByIdAndUpdate(req.params.documentId, {
        aiStatus: "failed",
        aiError: error.message,
      });
    } catch (updateErr) {
      logger.error("Failed to update document AI status:", updateErr);
    }

    res.status(500).json({
      success: false,
      message: "Failed to start AI processing",
      error: error.message,
    });
  }
};

// ── POST /api/ai/webhook ───────────────────────────────────
// Webhook called by Python service when processing completes
const processingWebhook = async (req, res) => {
  try {
    const { file_id, status, chunk_count, error } = req.body;

    if (!file_id) {
      return res.status(400).json({
        success: false,
        message: "file_id is required",
      });
    }

    const updateData = {
      aiStatus: status === "completed" ? "completed" : "failed",
      chunkCount: chunk_count || 0,
      aiError: error || null,
    };

    if (status === "completed") {
      updateData.aiProcessedAt = new Date();
    }

    await Document.findByIdAndUpdate(file_id, updateData);

    logger.info(
      `AI processing ${status} for document ${file_id} (${chunk_count} chunks)`
    );

    res.status(200).json({
      success: true,
      message: "Status updated",
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to update processing status",
    });
  }
};

// ── GET /api/ai/status/:documentId ─────────────────────────
// Get AI processing status for a document
const getProcessingStatus = async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId).select(
      "aiStatus chunkCount aiError aiProcessedAt fileName"
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.userId && document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.status(200).json({
      success: true,
      documentId: document._id,
      fileName: document.fileName,
      aiStatus: document.aiStatus,
      chunkCount: document.chunkCount,
      aiError: document.aiError,
      aiProcessedAt: document.aiProcessedAt,
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to get processing status",
    });
  }
};

// ── POST /api/ai/query ─────────────────────────────────────
// Ask a question about the user's documents
const queryDocuments = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    // Forward to Python AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/query`,
      {
        question: question.trim(),
        user_id: req.user._id.toString(),
      },
      {
        timeout: 60000, // 60 second timeout for query
      }
    );

    res.status(200).json({
      success: true,
      answer: response.data.answer,
      sources: response.data.sources || [],
      chunks_found: response.data.chunks_found || 0,
    });
  } catch (error) {
    logger.logError(error);

    // Try to extract error message from Python service
    const errorMsg =
      error.response?.data?.detail ||
      error.message ||
      "Failed to get answer";

    res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
};

// ── DELETE /api/ai/vectors/:documentId ─────────────────────
// Delete vectors when a document is deleted
const deleteVectors = async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/delete-vectors`,
      {
        file_id: req.params.documentId,
      },
      {
        timeout: 15000,
      }
    );

    logger.info(
      `Deleted vectors for document ${req.params.documentId}: ${response.data.deleted_count} vectors`
    );

    res.status(200).json({
      success: true,
      message: "Vectors deleted",
      deleted_count: response.data.deleted_count || 0,
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete vectors",
    });
  }
};

// ── GET /api/ai/stats ──────────────────────────────────────
// Get AI processing stats for the current user
const getAIStats = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Get document stats from MongoDB
    const totalDocs = await Document.countDocuments({ userId: req.user._id });
    const processedDocs = await Document.countDocuments({
      userId: req.user._id,
      aiStatus: "completed",
    });
    const processingDocs = await Document.countDocuments({
      userId: req.user._id,
      aiStatus: "processing",
    });
    const failedDocs = await Document.countDocuments({
      userId: req.user._id,
      aiStatus: "failed",
    });

    // Get chunk stats from Qdrant
    let totalChunks = 0;
    try {
      const response = await axios.get(
        `${AI_SERVICE_URL}/stats/${userId}`,
        { timeout: 10000 }
      );
      totalChunks = response.data.total_chunks || 0;
    } catch (err) {
      logger.warning("Could not fetch Qdrant stats:", err.message);
    }

    res.status(200).json({
      success: true,
      stats: {
        totalDocuments: totalDocs,
        processedDocuments: processedDocs,
        processingDocuments: processingDocs,
        failedDocuments: failedDocs,
        totalChunks: totalChunks,
      },
    });
  } catch (error) {
    logger.logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to get AI stats",
    });
  }
};

// ── Helper: Trigger processing for a document ──────────────
// Called internally after file upload (fire-and-forget)
const triggerProcessing = async (documentId, userId, fileName, s3Key) => {
  try {
    // Download file from S3
    const { stream, contentType } = await streamFromS3(s3Key);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // Send to Python AI service
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: fileName,
      contentType: contentType || "application/octet-stream",
    });
    formData.append("file_id", documentId);
    formData.append("user_id", userId);
    formData.append("file_name", fileName);

    await axios.post(`${AI_SERVICE_URL}/process`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    logger.info(`Auto-triggered AI processing for ${documentId}`);
  } catch (error) {
    logger.error(`Auto-processing failed for ${documentId}: ${error.message}`);
    // Update status to failed
    try {
      await Document.findByIdAndUpdate(documentId, {
        aiStatus: "failed",
        aiError: `Auto-processing failed: ${error.message}`,
      });
    } catch (updateErr) {
      logger.error("Failed to update AI status:", updateErr.message);
    }
  }
};

module.exports = {
  processDocument,
  processingWebhook,
  getProcessingStatus,
  queryDocuments,
  deleteVectors,
  getAIStats,
  triggerProcessing,
};
