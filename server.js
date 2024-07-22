const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = 3002;

app.use(cors()); // Enable CORS
app.use(bodyParser.json());
// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Destination folder for file uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Custom filename
  }
});

const upload = multer({ storage: storage });

// SQLite database setup
const db = new sqlite3.Database('./file_metadata.db');
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, filename TEXT, filepath TEXT, uploaded_at TEXT, synced INTEGER)');
});

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const uploadedAt = new Date().toISOString();

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  db.run('INSERT INTO files (filename, filepath, uploaded_at, synced) VALUES (?, ?, ?, ?)',
    [file.filename, file.path, uploadedAt, 0], (err) => {
      if (err) {
        console.error(`Failed to insert into database: ${err.message}`);
        return res.status(500).json({ error: 'Internal Server Error.' });
      }
      res.status(200).json({ message: 'File uploaded successfully.' });
    });
});

// Endpoint to list files in the uploads directory
app.get('/files', (req, res) => {
  const targetFolder = 'uploads/';

  fs.readdir(targetFolder, (err, files) => {
    if (err) {
      console.error(`Failed to list files: ${err.message}`);
      return res.status(500).json({ error: 'Internal Server Error.' });
    }
    res.status(200).json(files);
  });
});
app.get('/check-password', (req, res) => {
  const { fileName, password } = req.query;

  if (password == 'add your password logic') {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
});
// Endpoint to download a file
app.get('/download/:filename', (req, res) => {
  const targetFolder = 'uploads/';
  const filename = req.params.filename;
  const filePath = path.join(targetFolder, filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${filename}`);
      return res.status(404).json({ error: 'File not found.' });
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error(`Failed to download file: ${err.message}`);
        return res.status(500).json({ error: 'Internal Server Error.' });
      }
    });
  });
});

// Root endpoint to test server
app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
