import { create } from 'zustand';
import api from '../lib/api';

export const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: {},        // { roomId: [...messages] }
  typingUsers: {},     // { roomId: { userId: username } }
  onlineUsers: new Set(),
  unreadCounts: {},    // { roomId: count }

  setRooms: (rooms) => set({ rooms }),

  setActiveRoom: (room) => {
    set({ activeRoom: room });
    if (room) {
      set(s => ({ unreadCounts: { ...s.unreadCounts, [room._id]: 0 } }));
    }
  },

  loadRooms: async () => {
    const { data } = await api.get('/rooms');
    set({ rooms: data });
    return data;
  },

  loadMessages: async (roomId) => {
    const existing = get().messages[roomId];
    if (existing) return existing;
    const { data } = await api.get(`/rooms/${roomId}/messages`);
    set(s => ({ messages: { ...s.messages, [roomId]: data } }));
    return data;
  },

  loadMoreMessages: async (roomId, page) => {
    const { data } = await api.get(`/rooms/${roomId}/messages?page=${page}`);
    set(s => ({
      messages: { ...s.messages, [roomId]: [...data, ...(s.messages[roomId] || [])] }
    }));
    return data;
  },

  addMessage: (message) => {
    const roomId = message.room?._id || message.room;
    set(s => ({
      messages: {
        ...s.messages,
        [roomId]: [...(s.messages[roomId] || []), message],
      },
      rooms: s.rooms.map(r =>
        r._id === roomId ? { ...r, lastMessage: message } : r
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      unreadCounts: s.activeRoom?._id === roomId
        ? s.unreadCounts
        : { ...s.unreadCounts, [roomId]: (s.unreadCounts[roomId] || 0) + 1 },
    }));
  },

  deleteMessage: (messageId, roomId) => {
    set(s => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).map(m =>
          m._id === messageId ? { ...m, deleted: true } : m
        ),
      },
    }));
  },

  setTyping: (roomId, userId, username, isTyping) => {
    set(s => {
      const current = { ...(s.typingUsers[roomId] || {}) };
      if (isTyping) current[userId] = username;
      else delete current[userId];
      return { typingUsers: { ...s.typingUsers, [roomId]: current } };
    });
  },

  setUserOnline: (userId, isOnline) => {
    set(s => {
      const online = new Set(s.onlineUsers);
      isOnline ? online.add(userId) : online.delete(userId);
      return {
        onlineUsers: online,
        rooms: s.rooms.map(r => ({
          ...r,
          members: r.members?.map(m =>
            m._id === userId ? { ...m, isOnline, lastSeen: isOnline ? m.lastSeen : new Date() } : m
          ),
        })),
      };
    });
  },

  setOnlineUsers: (userIds) => {
    set({ onlineUsers: new Set(userIds) });
  },

  addRoom: (room) => {
    set(s => ({ rooms: [room, ...s.rooms.filter(r => r._id !== room._id)] }));
  },
}));
