const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// सुनिश्चित uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

// Serve static files
app.use(express.static(__dirname));

// Home route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Simple ID extraction (you can expand later)
function extractId(filename) {
  const match = filename.match(/\d{6,12}/);
  return match ? match[0] : null;
}

// Build link
function buildLink(id) {
  if (!id) return "No ID found";
  return `https://www.gettyimages.com/photos/${id}`;
}

// Upload route (MULTIPLE FILES)
app.post("/upload", upload.array("images"), (req, res) => {
  const results = req.files.map(file => {
    const id = extractId(file.originalname);
    const link = buildLink(id);
    return link;
  });

  res.json(results);
});

// Dynamic port (REQUIRED for Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
