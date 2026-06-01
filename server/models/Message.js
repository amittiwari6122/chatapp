const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room:        { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  content:     { type: String, default: '' },
  type:        { type: String, enum: ['text', 'image', 'file', 'audio', 'video'], default: 'text' },
  fileUrl:     { type: String, default: '' },
  fileName:    { type: String, default: '' },
  fileSize:    { type: Number, default: 0 },
  duration:    { type: Number, default: 0 }, // for audio/video in seconds
  readBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  deleted:     { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
