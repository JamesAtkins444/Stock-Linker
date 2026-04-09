const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// ---------------------------
// Upload folder
// ---------------------------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

// ---------------------------
// Static + homepage
// ---------------------------
app.use(express.static(__dirname));

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
// ID extraction
// ---------------------------
function extractId(filename) {
  const match = filename.match(/\d{6,12}/);
  return match ? match[0] : null;
}

// ---------------------------
// Link builder
// ---------------------------
function buildLink(platform, id) {
  if (!id) return "No ID found";

  switch (platform) {
    case "getty":
      return `https://www.gettyimages.com/photos/${id}`;

    case "adobe":
      return `https://stock.adobe.com/search?k=${id}`;

    case "shutterstock":
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
  const id = extractId(filename);
  const link = buildLink(platform, id);

  return {
    file: filename,
    platform,
    id,
    link,
  };
}

// ---------------------------
// Upload route (MULTI FILE)
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
