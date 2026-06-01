import { useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import ProfileModal from '../chat/ProfileModal';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function Sidebar({ onNewGroup }) {
  const { rooms, activeRoom, setActiveRoom, onlineUsers, loadRooms, addRoom, unreadCounts } = useChatStore();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get(`/auth/search?q=${search}`);
      setSearchResults(data);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openDM = async (userId) => {
    const { data } = await api.post('/rooms/dm', { userId });
    addRoom(data);
    setActiveRoom(data);
    setSearch('');
    setSearchResults([]);
  };

  const getRoomName = (room) => {
    if (room.isGroup) return room.name;
    return room.members?.find(m => m._id !== user?._id)?.username || 'Unknown';
  };

  const getRoomUser = (room) => room.members?.find(m => m._id !== user?._id);

  const isRoomOnline = (room) => {
    if (room.isGroup) return false;
    const other = getRoomUser(room);
    return other && onlineUsers.has(other._id);
  };

  const getPreview = (room) => {
    const msg = room.lastMessage;
    if (!msg) return 'Start a conversation';
    if (msg.deleted) return '🚫 Message deleted';
    const map = { image: '📷 Photo', audio: '🎤 Voice message', file: '📎 File', video: '🎥 Video' };
    if (map[msg.type]) return map[msg.type];
    return msg.content?.length > 40 ? msg.content.slice(0, 40) + '…' : (msg.content || '');
  };

  const filtered = rooms.filter(r => getRoomName(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-80 h-full flex flex-col bg-gray-900/50 border-r border-white/5 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button
            className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-1.5 -ml-1.5 transition-colors"
            onClick={() => setShowProfile(true)}
          >
            <Avatar user={user} size="md" showOnline isOnline />
            <div className="text-left">
              <p className="font-semibold text-white text-sm leading-tight">{user?.username}</p>
              <p className="text-emerald-400 text-xs">Online</p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onNewGroup} className="btn-ghost p-2" title="New group">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={logout} className="btn-ghost p-2" title="Logout">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="input-field pl-10 py-2.5 text-sm"
            placeholder="Search or start new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* User search results */}
      {search && searchResults.length > 0 && (
        <div className="border-b border-white/5 flex-shrink-0">
          <p className="text-xs text-gray-500 px-4 py-2 uppercase tracking-wider font-medium">People</p>
          {searchResults.map(u => (
            <button key={u._id} onClick={() => openDM(u._id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
              <Avatar user={u} size="md" showOnline isOnline={onlineUsers.has(u._id)} />
              <div className="text-left">
                <p className="text-sm font-medium text-white">{u.username}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              {onlineUsers.has(u._id) && <span className="ml-auto text-xs text-emerald-400">Online</span>}
            </button>
          ))}
        </div>
      )}
      {search && searchResults.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500 border-b border-white/5 flex-shrink-0">No users found for "{search}"</div>
      )}

      {/* Chats header */}
      <div className="px-4 py-2.5 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Chats {rooms.length > 0 && `· ${rooms.length}`}
        </p>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-sm gap-1">
            <p>No conversations yet</p>
            <p className="text-xs">Search a user to get started</p>
          </div>
        ) : (
          filtered.map(room => {
            const isActive = activeRoom?._id === room._id;
            const unread = unreadCounts[room._id] || 0;
            const roomUser = getRoomUser(room);
            const lastMsgTime = room.lastMessage?.createdAt;

            return (
              <button key={room._id} onClick={() => setActiveRoom(room)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-100 border-l-2 ${
                  isActive ? 'bg-brand-600/15 border-brand-500' : 'hover:bg-white/5 border-transparent'
                }`}
              >
                {room.isGroup ? (
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {room.name?.[0]?.toUpperCase()}
                  </div>
                ) : (
                  <Avatar user={roomUser} size="md" showOnline isOnline={isRoomOnline(room)} />
                )}

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
                      {getRoomName(room)}
                    </p>
                    {lastMsgTime && (
                      <p className={`text-xs flex-shrink-0 ${unread > 0 ? 'text-brand-400 font-medium' : 'text-gray-600'}`}>
                        {formatDistanceToNow(new Date(lastMsgTime), { addSuffix: false })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${unread > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                      {getPreview(room)}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 bg-brand-600 text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold leading-none">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
