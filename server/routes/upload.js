const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp3|ogg|webm|mp4|wav/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext || mime) cb(null, true);
  else cb(new Error('File type not supported'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  const ext = path.extname(req.file.originalname).toLowerCase();

  let type = 'file';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) type = 'image';
  else if (['.mp3', '.ogg', '.wav'].includes(ext)) type = 'audio';
  else if (['.mp4', '.webm'].includes(ext)) type = 'video';

  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    type,
  });
});

module.exports = router;
