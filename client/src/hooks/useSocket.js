import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

export const useSocket = () => {
  const socket = useAuthStore(s => s.socket);
  const { addMessage, deleteMessage, setTyping, setUserOnline, setOnlineUsers } = useChatStore();

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', addMessage);
    socket.on('message:deleted', ({ messageId, roomId }) => deleteMessage(messageId, roomId));
    socket.on('typing:start', ({ roomId, userId, username }) => setTyping(roomId, userId, username, true));
    socket.on('typing:stop', ({ roomId, userId }) => setTyping(roomId, userId, null, false));
    socket.on('user:online', ({ userId, isOnline }) => setUserOnline(userId, isOnline));
    socket.on('users:online', (userIds) => setOnlineUsers(userIds));

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('user:online');
      socket.off('users:online');
    };
  }, [socket]);
};
