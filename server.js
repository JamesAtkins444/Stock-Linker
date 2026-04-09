// server.js
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const Tesseract = require("tesseract.js");

const app = express();

// ---------------------------
// 1. Set up uploads folder
// ---------------------------
const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// ---------------------------
// 2. Serve static files
// ---------------------------
app.use(express.static(path.join(__dirname, "public"))); // for CSS/JS if needed

// Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------------------------
// 3. ID extraction functions
// ---------------------------

// Adobe
function extractAdobeId(filename) {
  const match = filename.match(/adobestock[_-]?(\d+)/i);
  return match ? match[1] : null;
}

// Getty
function extractGettyId(filename) {
  const match = filename.match(/gettyimages[-_]?(\d{6,12})/i);
  return match ? match[1] : null;
}

// Generic number fallback
function extractGenericId(filename) {
  const match = filename.match(/\d{6,12}/);
  return match ? match[0] : null;
}

// Master extractor
function extractId(filename) {
  return extractAdobeId(filename) || extractGettyId(filename) || extractGenericId(filename);
}

// Detect platform from filename
function detectPlatform(filename) {
  const name = filename.toLowerCase();
  if (name.includes("adobestock")) return "adobe";
  if (name.includes("gettyimages")) return "getty";
  if (name.includes("shutterstock")) return "shutterstock";
  return null;
}

// ---------------------------
// 4. API / fallback helpers
// ---------------------------

// Adobe API
async function fetchAdobeImage(id) {
  try {
    const res = await axios.get("https://stock.adobe.io/Rest/Media/1/Search/Files", {
      headers: { "x-api-key": process.env.ADOBE_API_KEY || "" },
      params: { search_parameters: JSON.stringify({ words: id }) },
    });
    const file = res.data.files?.[0];
    return file ? file.url : null;
  } catch (err) {
    return null;
  }
}

// Getty API
async function fetchGettyImage(id) {
  try {
    const res = await axios.get(`https://api.gettyimages.com/v3/images/${id}`, {
      headers: { "Api-Key": process.env.GETTY_API_KEY || "" },
    });
    const img = res.data.images?.[0];
    return img ? img.display_sizes[0].uri : null;
  } catch (err) {
    return null;
  }
}

// Fallback URLs
function buildFallbackLink(platform, id) {
  switch (platform) {
    case "shutterstock":
      return `https://www.shutterstock.com/image-photo/${id}`;
    case "adobe":
      return `https://stock.adobe.com/search?k=${id}`;
    case "getty":
      return `https://www.gettyimages.com/photos/${id}`;
    default:
      return `ID found: ${id}`;
  }
}

// ---------------------------
// 5. OCR fallback
// ---------------------------
async function extractIdFromImage(filePath) {
  try {
    const result = await Tesseract.recognize(filePath, "eng");
    const text = result.data.text;
    // Try to extract 6-12 digit number from OCR
    const match = text.match(/\d{6,12}/);
    return match ? match[0] : null;
  } catch (err) {
    return null;
  }
}

// ---------------------------
// 6. Hybrid processing function
// ---------------------------
async function processImage(file) {
  let filename = file.originalname;
  let id = extractId(filename);
  let platform = detectPlatform(filename);
  let link = null;

  // Try API
  if (id && platform === "adobe") link = await fetchAdobeImage(id);
  if (id && platform === "getty") link = await fetchGettyImage(id);

  // OCR fallback
  if (!link) {
    id = await extractIdFromImage(file.path);
    if (id) platform = platform || "unknown";
  }

  // Final fallback
  if (!link && id) link = buildFallbackLink(platform, id);

  return link || "No link found";
}

// ---------------------------
// 7. Upload route
// ---------------------------
app.post("/upload", upload.array("images"), async (req, res) => {
  const results = [];
  for (const file of req.files) {
    const link = await processImage(file);
    results.push(link);
  }
  res.json(results);
});

// ---------------------------
// 8. Start server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
