import { useState } from 'react';
import api from '../../lib/api';
import { useChatStore } from '../../store/chatStore';
import Avatar from '../ui/Avatar';

export default function CreateGroupModal({ onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addRoom, setActiveRoom } = useChatStore();

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    const { data } = await api.get(`/auth/search?q=${q}`);
    setResults(data);
  };

  const toggleUser = (u) => {
    setSelected(prev =>
      prev.find(p => p._id === u._id)
        ? prev.filter(p => p._id !== u._id)
        : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length < 1) return;
    setLoading(true);
    try {
      const { data } = await api.post('/rooms/group', {
        name,
        description,
        members: selected.map(u => u._id),
      });
      addRoom(data);
      setActiveRoom(data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
      <div className="glass rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">New Group Chat</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            className="input-field"
            placeholder="Group name *"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Selected members */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <span
                  key={u._id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs px-2.5 py-1 rounded-full cursor-pointer hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-colors"
                >
                  {u.username}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            className="input-field"
            placeholder="Search members to add"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />

          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2">
              {results.map(u => {
                const isSelected = selected.find(s => s._id === u._id);
                return (
                  <button
                    key={u._id}
                    onClick={() => toggleUser(u)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                      isSelected ? 'bg-brand-600/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <Avatar user={u} size="sm" />
                    <span className="text-sm text-white">{u.username}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-brand-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={handleCreate}
            className="btn-primary w-full py-3"
            disabled={!name.trim() || selected.length < 1 || loading}
          >
            {loading ? 'Creating...' : `Create Group (${selected.length + 1} members)`}
          </button>
        </div>
      </div>
    </div>
  );
}
