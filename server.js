const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

const upload = multer({ dest: "uploads/" });
function extractGettyId(filename) {
  const match = filename.match(/gettyimages[-_](\d+)/i);
  return match ? match[1] : null;
}
function extractId(filename) {
  // Try Getty first
  let id = extractGettyId(filename);
  if (id) return id;

  // Fallback: general number extraction
  const match = filename.match(/\d{6,12}/);
  return match ? match[0] : null;
}

function detectPlatform(filename) {
  filename = filename.toLowerCase();

  if (filename.includes("shutterstock")) return "shutterstock";
  if (filename.includes("adobe")) return "adobe";
  if (filename.includes("getty")) return "getty";

  return "unknown";
}

function generateLink(platform, id) {
  switch (platform) {
    case "shutterstock":
      return `https://www.shutterstock.com/image-photo/${id}`;
    case "adobe":
      return `https://stock.adobe.com/search?k=${id}`;
    case "getty":
      return `https://www.gettyimages.com/photos/${id}`;
    default:
      return "Could not generate link";
  }
}

app.post("/upload", upload.single("image"), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filename = file.originalname;

  const id = extractId(filename);
  const platform = detectPlatform(filename);
  const link = generateLink(platform, id);

  res.json({
    filename,
    extractedId: id,
    platform,
    link,
  });
});

// Dynamic port (REQUIRED for Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
