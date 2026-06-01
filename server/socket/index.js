const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

// Map: userId -> socketId
const onlineUsers = new Map();

module.exports = (io) => {

  // Auth middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    // Mark user online
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });

    // Broadcast online status to all
    io.emit('user:online', { userId, isOnline: true });

    // Join all user's rooms
    const rooms = await Room.find({ members: userId });
    rooms.forEach(room => socket.join(room._id.toString()));

    // Send current online users list to newly connected user
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // ─── MESSAGING ───────────────────────────────────────────────

    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type = 'text', fileUrl, fileName, fileSize, duration, replyTo } = data;

        const room = await Room.findOne({ _id: roomId, members: userId });
        if (!room) return;

        const message = await Message.create({
          sender: userId,
          room: roomId,
          content,
          type,
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          duration: duration || 0,
          replyTo: replyTo || null,
          readBy: [userId],
        });

        await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username avatar')
          .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username' } });

        io.to(roomId).emit('message:new', populated);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete', async ({ messageId }) => {
      try {
        const msg = await Message.findOne({ _id: messageId, sender: userId });
        if (!msg) return;
        msg.deleted = true;
        await msg.save();
        io.to(msg.room.toString()).emit('message:deleted', { messageId, roomId: msg.room });
      } catch (err) {}
    });

    socket.on('message:read', async ({ roomId }) => {
      try {
        await Message.updateMany(
          { room: roomId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        io.to(roomId).emit('message:read', { roomId, userId });
      } catch (err) {}
    });

    // ─── TYPING INDICATORS ────────────────────────────────────────

    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:start', {
        roomId,
        userId,
        username: socket.user.username,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:stop', { roomId, userId });
    });

    // ─── VIDEO CALLING (WebRTC Signaling) ─────────────────────────

    socket.on('call:initiate', ({ targetUserId, roomId, isVideo }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:incoming', {
          from: socket.user,
          roomId,
          isVideo,
        });
      } else {
        socket.emit('call:unavailable', { targetUserId });
      }
    });

    socket.on('call:accept', ({ targetUserId, roomId }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:accepted', { userId, roomId });
      }
    });

    socket.on('call:reject', ({ targetUserId }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:rejected', { userId });
      }
    });

    socket.on('call:end', ({ targetUserId }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ended', { userId });
      }
    });

    // WebRTC offer/answer/ICE exchange
    socket.on('webrtc:offer', ({ targetUserId, offer }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) io.to(targetSocketId).emit('webrtc:offer', { from: userId, offer });
    });

    socket.on('webrtc:answer', ({ targetUserId, answer }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) io.to(targetSocketId).emit('webrtc:answer', { from: userId, answer });
    });

    socket.on('webrtc:ice-candidate', ({ targetUserId, candidate }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) io.to(targetSocketId).emit('webrtc:ice-candidate', { from: userId, candidate });
    });

    // ─── DISCONNECT ──────────────────────────────────────────────

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: '',
      });
      io.emit('user:online', { userId, isOnline: false, lastSeen: new Date() });
    });
  });
};
