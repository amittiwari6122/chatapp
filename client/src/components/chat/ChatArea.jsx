import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import Avatar from '../ui/Avatar';
import VideoCallModal from '../call/VideoCallModal';
import GroupInfoPanel from './GroupInfoPanel';
import { formatDistanceToNow } from 'date-fns';

export default function ChatArea() {
  const { activeRoom, messages, typingUsers, onlineUsers, loadMessages } = useChatStore();
  const { user } = useAuthStore();
  const [replyTo, setReplyTo] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef();
  const messagesTopRef = useRef();
  const socket = getSocket();

  const roomMessages = activeRoom ? (messages[activeRoom._id] || []) : [];
  const typing = activeRoom ? Object.values(typingUsers[activeRoom._id] || {}) : [];

  useEffect(() => {
    if (!activeRoom) return;
    setPage(1);
    setHasMore(true);
    loadMessages(activeRoom._id);
    socket?.emit('message:read', { roomId: activeRoom._id });
    setShowGroupInfo(false);
  }, [activeRoom?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length, typing.length]);

  // Incoming call listener
  useEffect(() => {
    if (!socket) return;
    socket.on('call:incoming', (data) => setIncomingCall({ ...data, incoming: true }));
    return () => socket.off('call:incoming');
  }, [socket]);

  const handleSend = useCallback((msgData) => {
    if (!activeRoom || !socket) return;
    socket.emit('message:send', { roomId: activeRoom._id, ...msgData });
  }, [activeRoom, socket]);

  const initiateCall = (isVideo) => {
    const other = activeRoom?.members?.find(m => m._id !== user?._id);
    if (!other) return;
    socket?.emit('call:initiate', { targetUserId: other._id, roomId: activeRoom._id, isVideo });
    setActiveCall({ targetUserId: other._id, callerName: other.username, isVideo });
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { loadMoreMessages } = useChatStore.getState();
    const data = await loadMoreMessages(activeRoom._id, nextPage);
    if (data.length < 50) setHasMore(false);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const getRoomTitle = () => {
    if (!activeRoom) return '';
    if (activeRoom.isGroup) return activeRoom.name;
    return activeRoom.members?.find(m => m._id !== user?._id)?.username || 'Unknown';
  };

  const getRoomSubtitle = () => {
    if (!activeRoom) return '';
    if (activeRoom.isGroup) {
      const onlineCount = activeRoom.members?.filter(m => m._id !== user?._id && onlineUsers.has(m._id)).length || 0;
      return onlineCount > 0 ? `${onlineCount} online` : `${activeRoom.members?.length || 0} members`;
    }
    const other = activeRoom.members?.find(m => m._id !== user?._id);
    if (!other) return '';
    if (typing.length > 0) return null; // handled below
    if (onlineUsers.has(other._id)) return 'Online';
    if (other.lastSeen) return `Last seen ${formatDistanceToNow(new Date(other.lastSeen), { addSuffix: true })}`;
    return 'Offline';
  };

  const getOtherUser = () => activeRoom?.members?.find(m => m._id !== user?._id);
  const otherUser = getOtherUser();
  const isOtherOnline = otherUser && onlineUsers.has(otherUser._id);

  const shouldShowAvatar = (idx) => {
    if (idx === 0) return true;
    return roomMessages[idx].sender?._id !== roomMessages[idx - 1].sender?._id;
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-center p-8">
        <div className="w-24 h-24 rounded-3xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-brand-600/5">
          <svg className="w-12 h-12 text-brand-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Your conversations</h2>
        <p className="text-gray-500 max-w-xs text-sm leading-relaxed">
          Search for someone to chat with, or select an existing conversation from the sidebar
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-950">
      {/* Main chat column */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-900/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {activeRoom.isGroup ? (
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {activeRoom.name?.[0]?.toUpperCase()}
              </div>
            ) : (
              <Avatar user={otherUser} size="md" showOnline isOnline={isOtherOnline} />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{getRoomTitle()}</p>
              <p className={`text-xs truncate ${typing.length > 0 ? 'text-emerald-400' : isOtherOnline && !activeRoom.isGroup ? 'text-emerald-400' : 'text-gray-500'}`}>
                {typing.length > 0
                  ? `${typing.slice(0, 2).join(', ')} ${typing.length === 1 ? 'is' : 'are'} typing...`
                  : getRoomSubtitle()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!activeRoom.isGroup && (
              <>
                <button onClick={() => initiateCall(false)} className="btn-ghost p-2" title="Voice call">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button onClick={() => initiateCall(true)} className="btn-ghost p-2" title="Video call">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </>
            )}
            {activeRoom.isGroup && (
              <button
                onClick={() => setShowGroupInfo(!showGroupInfo)}
                className={`btn-ghost p-2 ${showGroupInfo ? 'text-brand-400' : ''}`}
                title="Group info"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4" id="messages-container">
          {/* Load more */}
          {hasMore && roomMessages.length >= 50 && (
            <div className="flex justify-center mb-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load earlier messages'}
              </button>
            </div>
          )}
          <div ref={messagesTopRef} />

          {roomMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <span className="text-2xl">👋</span>
              </div>
              <div>
                <p className="text-white font-medium">Say hello!</p>
                <p className="text-gray-500 text-sm">Be the first to send a message</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {roomMessages.map((msg, i) => (
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  showAvatar={shouldShowAvatar(i)}
                  onReply={setReplyTo}
                />
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {typing.length > 0 && (
            <div className="flex items-center gap-2 pl-9 pt-2 pb-1">
              <div className="bg-white/10 border border-white/10 px-4 py-2.5 flex items-center gap-1.5" style={{ borderRadius: '18px 18px 18px 4px' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* Group info side panel */}
      {showGroupInfo && activeRoom.isGroup && (
        <GroupInfoPanel onClose={() => setShowGroupInfo(false)} />
      )}

      {/* Video call modals */}
      {(incomingCall || activeCall) && (
        <VideoCallModal
          call={incomingCall || activeCall}
          onEnd={() => { setIncomingCall(null); setActiveCall(null); }}
        />
      )}
    </div>
  );
}
