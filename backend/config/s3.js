// ============================================================
// config/s3.js — AWS S3 Configuration
// ============================================================
// Sets up AWS S3 client and provides helper functions for
// file upload, download, and deletion operations.
// ============================================================

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// File extensions that are images
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff"];

// Configure Multer to store files in memory (we'll upload to S3 manually)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max file size
  },
});

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} - Upload result with key and URL
 */
const uploadToS3 = async (fileBuffer, originalName, mimeType) => {
  const ext = path.extname(originalName).replace(".", "").toLowerCase();
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(originalName)}`;
  const key = `cloud-dms/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  return {
    key: key,
    fileName: originalName,
    fileSize: fileBuffer.length,
    fileType: ext,
    resourceType: IMAGE_EXTENSIONS.includes(ext) ? "image" : "raw",
  };
};

/**
 * Get presigned URL for file download (valid for 1 hour)
 * @param {string} key - S3 object key
 * @returns {Promise<string>} - Presigned URL
 */
const getPresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  return url;
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Stream file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Object>} - Object with stream and metadata
 */
const streamFromS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
};

module.exports = {
  s3Client,
  upload,
  uploadToS3,
  getPresignedUrl,
  deleteFromS3,
  streamFromS3,
  IMAGE_EXTENSIONS,
  BUCKET_NAME,
};
