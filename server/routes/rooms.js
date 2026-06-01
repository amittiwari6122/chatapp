const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all rooms for current user
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('members', '-password')
      .populate('admins', '-password')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar' } })
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or get DM room
router.post('/dm', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    const existing = await Room.findOne({
      isGroup: false,
      members: { $all: [req.user._id, userId], $size: 2 },
    }).populate('members', '-password')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar' } });

    if (existing) return res.json(existing);

    const room = await Room.create({
      isGroup: false,
      members: [req.user._id, userId],
      createdBy: req.user._id,
    });

    const populated = await Room.findById(room._id)
      .populate('members', '-password');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create group
router.post('/group', protect, async (req, res) => {
  try {
    const { name, members, description } = req.body;
    if (!name || !members || members.length < 2)
      return res.status(400).json({ message: 'Group needs name and at least 2 members' });

    const allMembers = [...new Set([...members, req.user._id.toString()])];
    const room = await Room.create({
      name, description, isGroup: true,
      members: allMembers,
      admins: [req.user._id],
      createdBy: req.user._id,
    });

    const populated = await Room.findById(room._id)
      .populate('members', '-password')
      .populate('admins', '-password');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages in a room
router.get('/:roomId/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const room = await Room.findOne({ _id: req.params.roomId, members: req.user._id });
    if (!room) return res.status(403).json({ message: 'Not a member' });

    const messages = await Message.find({ room: req.params.roomId, deleted: false })
      .populate('sender', 'username avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Mark messages as read
    await Message.updateMany(
      { room: req.params.roomId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add member to group
router.post('/:roomId/members', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findOne({ _id: req.params.roomId, admins: req.user._id });
    if (!room) return res.status(403).json({ message: 'Not an admin' });

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }
    const updated = await Room.findById(room._id).populate('members', '-password').populate('admins', '-password');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Leave group
router.delete('/:roomId/leave', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, members: req.user._id });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    room.members = room.members.filter(m => m.toString() !== req.user._id.toString());
    room.admins = room.admins.filter(a => a.toString() !== req.user._id.toString());
    if (room.members.length === 0) {
      await Room.findByIdAndDelete(room._id);
    } else {
      if (room.isGroup && room.admins.length === 0) room.admins.push(room.members[0]);
      await room.save();
    }
    res.json({ message: 'Left successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
