const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// ---------------------------
// Upload folder
// ---------------------------
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ---------------------------
// Multer setup
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// ---------------------------
// Static files
// ---------------------------
app.use(express.static(__dirname));

// ---------------------------
// Homepage
// ---------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------------------------
// Platform detection
// ---------------------------
function detectPlatform(filename) {
  const name = filename.toLowerCase();

  if (name.includes("gettyimages")) return "getty";
  if (name.includes("adobestock")) return "adobe";
  if (name.includes("shutterstock")) return "shutterstock";

  return "unknown";
}

// ---------------------------
// Asset type detection
// ---------------------------
function detectAssetType(filename) {
  const ext = filename.split(".").pop().toLowerCase();

  // Images
  if (["jpg", "jpeg", "png", "gif", "webp", "tif"].includes(ext)) {
    return "image";
  }

  // Videos
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    return "video";
  }

  // Audio
  if (["mp3", "wav", "aac", "flac", "aiff"].includes(ext)) {
    return "audio";
  }

  return "unknown";
}

// ---------------------------
// ID extraction
// ---------------------------
function extractId(filename) {
  const match = filename.match(/\d{6,12}/);

  return match ? match[0] : null;
}

// ---------------------------
// Link builder
// ---------------------------
function buildLink(platform, assetType, id) {
  if (!id) return "No ID found";

  switch (platform) {

    // ---------------- GETTY ----------------
    case "getty":

      if (assetType === "video") {
        return `https://www.gettyimages.com/videos/${id}`;
      }

      if (assetType === "audio") {
        return `https://www.gettyimages.com/music/${id}`;
      }

      return `https://www.gettyimages.com/photos/${id}`;

    // ---------------- ADOBE ----------------
    case "adobe":

      if (assetType === "video") {
        return `https://stock.adobe.com/search/video?k=${id}`;
      }

      if (assetType === "audio") {
        return `https://stock.adobe.com/search/audio?k=${id}`;
      }

      return `https://stock.adobe.com/search?k=${id}`;

    // ---------------- SHUTTERSTOCK ----------------
    case "shutterstock":

      if (assetType === "video") {
        return `https://www.shutterstock.com/video/search/${id}`;
      }

      if (assetType === "audio") {
        return `https://www.shutterstock.com/music/search/${id}`;
      }

      return `https://www.shutterstock.com/search/${id}`;

    default:
      return `Search ID: ${id}`;
  }
}

// ---------------------------
// Main processor
// ---------------------------
function processFile(file) {

  const filename = file.originalname;

  const platform = detectPlatform(filename);
  const assetType = detectAssetType(filename);
  const id = extractId(filename);

  const link = buildLink(platform, assetType, id);

  return {
    file: filename,
    platform,
    assetType,
    id,
    link,
  };
}

// ---------------------------
// Upload route
// ---------------------------
app.post("/upload", upload.array("images"), (req, res) => {

  const results = req.files.map(file => processFile(file));

  res.json(results);
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
