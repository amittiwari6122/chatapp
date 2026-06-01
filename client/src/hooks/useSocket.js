import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

export const useSocket = () => {
  const socket = useAuthStore(s => s.socket);
  const { addMessage, deleteMessage, setTyping, setUserOnline, setOnlineUsers, loadRooms } = useChatStore();

  useEffect(() => {
    if (!socket) return;

    const onMessage = (message) => {
      addMessage(message);
    };

    const onDeleted = ({ messageId, roomId }) => deleteMessage(messageId, roomId);
    const onTypingStart = ({ roomId, userId, username }) => setTyping(roomId, userId, username, true);
    const onTypingStop = ({ roomId, userId }) => setTyping(roomId, userId, null, false);
    const onUserOnline = ({ userId, isOnline }) => setUserOnline(userId, isOnline);
    const onUsersOnline = (userIds) => setOnlineUsers(userIds);

    const onReadUpdate = ({ roomId, userId }) => {
      const { messages } = useChatStore.getState();
      const roomMessages = messages[roomId] || [];
      const updated = roomMessages.map(m => {
        if (!m.readBy?.includes(userId)) {
          return { ...m, readBy: [...(m.readBy || []), userId] };
        }
        return m;
      });
      useChatStore.setState(s => ({
        messages: { ...s.messages, [roomId]: updated }
      }));
    };

    // Reconnect — reload rooms
    const onReconnect = () => {
      loadRooms();
    };

    socket.on('message:new', onMessage);
    socket.on('message:deleted', onDeleted);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('user:online', onUserOnline);
    socket.on('users:online', onUsersOnline);
    socket.on('message:read', onReadUpdate);
    socket.on('reconnect', onReconnect);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('message:deleted', onDeleted);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('user:online', onUserOnline);
      socket.off('users:online', onUsersOnline);
      socket.off('message:read', onReadUpdate);
      socket.off('reconnect', onReconnect);
    };
  }, [socket]);
};
