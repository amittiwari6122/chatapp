import { useState } from 'react';
import Avatar from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import api from '../../lib/api';

export default function GroupInfoPanel({ onClose }) {
  const { user } = useAuthStore();
  const { activeRoom, setActiveRoom, setRooms, rooms } = useChatStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!activeRoom?.isGroup) return null;

  const isAdmin = activeRoom.admins?.some(a => a._id === user?._id || a === user?._id);

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    const { data } = await api.get(`/auth/search?q=${q}`);
    const memberIds = activeRoom.members?.map(m => m._id || m);
    setResults(data.filter(u => !memberIds.includes(u._id)));
  };

  const addMember = async (userId) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/rooms/${activeRoom._id}/members`, { userId });
      setActiveRoom(data);
      setRooms(rooms.map(r => r._id === data._id ? data : r));
      setSearch('');
      setResults([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const leaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await api.delete(`/rooms/${activeRoom._id}/leave`);
      setActiveRoom(null);
      setRooms(rooms.filter(r => r._id !== activeRoom._id));
      onClose();
    } catch (err) {
      alert('Failed to leave group');
    }
  };

  return (
    <div className="w-72 h-full flex flex-col border-l border-white/5 bg-gray-900/50 fade-in">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-semibold text-white">Group Info</h3>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Group avatar & name */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
            {activeRoom.name?.[0]?.toUpperCase()}
          </div>
          <p className="text-white font-semibold text-lg">{activeRoom.name}</p>
          {activeRoom.description && (
            <p className="text-gray-400 text-sm mt-1">{activeRoom.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{activeRoom.members?.length} members</p>
        </div>

        {/* Add members (admin only) */}
        {isAdmin && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add Members</p>
            <input
              type="text"
              className="input-field text-sm py-2"
              placeholder="Search users..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
            {results.length > 0 && (
              <div className="mt-2 space-y-1 bg-black/20 rounded-xl p-2">
                {results.map(u => (
                  <button
                    key={u._id}
                    onClick={() => addMember(u._id)}
                    disabled={loading}
                    className="w-full flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="text-sm text-white">{u.username}</span>
                    <svg className="w-4 h-4 text-brand-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members list */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</p>
          <div className="space-y-1">
            {activeRoom.members?.map(member => {
              const m = typeof member === 'object' ? member : { _id: member, username: 'Unknown' };
              const isCurrentUser = m._id === user?._id;
              const isMemberAdmin = activeRoom.admins?.some(a => (a._id || a) === m._id);
              return (
                <div key={m._id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <Avatar user={m} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {m.username} {isCurrentUser && <span className="text-gray-500">(you)</span>}
                    </p>
                  </div>
                  {isMemberAdmin && (
                    <span className="text-xs bg-brand-600/20 text-brand-300 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leave group */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={leaveGroup}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Leave Group
        </button>
      </div>
    </div>
  );
}
