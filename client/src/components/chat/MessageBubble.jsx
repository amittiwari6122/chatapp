import { useState } from 'react';
import Avatar from '../ui/Avatar';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getSocket } from '../../lib/socket';

export default function MessageBubble({ message, showAvatar, onReply }) {
  const { user } = useAuthStore();
  const { activeRoom } = useChatStore();
  const isMine = message.sender?._id === user?._id;
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    const socket = getSocket();
    socket?.emit('message:delete', { messageId: message._id });
    setShowMenu(false);
  };

  if (message.deleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
        <span className="text-xs text-gray-600 italic px-4 py-2 bg-white/5 rounded-xl">
          🚫 Message deleted
        </span>
      </div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={message.fileUrl}
              alt="Image"
              className="rounded-xl max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-48">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <audio controls src={message.fileUrl} className="max-w-48" style={{ height: 32 }} />
          </div>
        );
      case 'file':
        return (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate max-w-48">{message.fileName}</p>
              <p className="text-xs text-white/60">{message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'File'}</p>
            </div>
          </a>
        );
      default:
        return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  // Tick status
  const renderTicks = () => {
    if (!isMine) return null;
    const isRead = message.readBy?.length > 1;
    return (
      <span className="flex items-center ml-0.5">
        {isRead ? (
          // Double blue tick — Read
          <span className="flex items-center -space-x-1.5">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : (
          // Single grey tick — Sent
          <svg className="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    );
  };

  return (
    <div className={`flex items-end gap-2 mb-1 group ${isMine ? 'flex-row-reverse' : 'flex-row'} msg-enter`}>
      {/* Avatar */}
      <div className="w-7 flex-shrink-0">
        {showAvatar && !isMine && (
          <Avatar user={message.sender} size="sm" />
        )}
      </div>

      <div className={`max-w-xs lg:max-w-md relative ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name in group */}
        {showAvatar && !isMine && activeRoom?.isGroup && (
          <p className="text-xs font-medium text-brand-300 mb-1 ml-1">
            {message.sender?.username}
          </p>
        )}

        {/* Reply to */}
        {message.replyTo && (
          <div className={`text-xs mb-1 px-3 py-2 rounded-xl border-l-2 border-brand-400 bg-black/20 max-w-full ${isMine ? 'border-r-2 border-l-0' : ''}`}>
            <p className="font-medium text-brand-300">{message.replyTo.sender?.username}</p>
            <p className="text-gray-400 truncate">{message.replyTo.content || '📎 Attachment'}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative px-4 py-2.5 cursor-pointer ${isMine ? 'message-bubble-mine text-white' : 'message-bubble-other text-gray-100'}`}
          onMouseEnter={() => setShowMenu(true)}
          onMouseLeave={() => setShowMenu(false)}
        >
          {renderContent()}

          {/* Time + Ticks */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {renderTicks()}
          </div>

          {/* Context menu */}
          {showMenu && (
            <div className={`absolute bottom-full mb-1 flex gap-1 ${isMine ? 'right-0' : 'left-0'}`}>
              <button
                onClick={() => { onReply(message); setShowMenu(false); }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-lg transition-colors"
              >
                ↩ Reply
              </button>
              {isMine && (
                <button
                  onClick={handleDelete}
                  className="bg-gray-800 hover:bg-red-900/50 text-red-400 text-xs px-2 py-1 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
