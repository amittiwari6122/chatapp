import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import Avatar from '../ui/Avatar';

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const previewUser = { ...user, ...form };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
      <div className="glass rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar user={previewUser} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center border-2 border-gray-900">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3">Paste an image URL below</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2.5 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-2.5 rounded-xl mb-4 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Profile updated!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Username</label>
            <input
              type="text"
              className="input-field"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              minLength={3}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Avatar URL</label>
            <input
              type="url"
              className="input-field"
              placeholder="https://..."
              value={form.avatar}
              onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Bio</label>
            <textarea
              className="input-field resize-none"
              placeholder="Tell something about yourself..."
              rows={3}
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1 py-2.5 border border-white/10">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary flex-1 py-2.5" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
