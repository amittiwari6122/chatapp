import { create } from 'zustand';
import api from '../lib/api';
import { initSocket, disconnectSocket } from '../lib/socket';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  socket: null,

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) return set({ isLoading: false });
    try {
      const { data } = await api.get('/auth/me');
      const socket = initSocket(token);
      set({ user: data, token, socket, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    const socket = initSocket(data.token);
    set({ user: data.user, token: data.token, socket });
    return data;
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('token', data.token);
    const socket = initSocket(data.token);
    set({ user: data.user, token: data.token, socket });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    disconnectSocket();
    set({ user: null, token: null, socket: null });
  },

  updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } })),
}));
