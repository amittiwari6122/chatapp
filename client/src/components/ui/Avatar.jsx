export default function Avatar({ user, size = 'md', showOnline = false, isOnline = false }) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const colors = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-cyan-500', 'bg-blue-500', 'bg-violet-500', 'bg-pink-500',
  ];

  const colorIndex = user?.username
    ? user.username.charCodeAt(0) % colors.length
    : 0;

  return (
    <div className={`relative flex-shrink-0 ${sizes[size]}`}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center font-semibold text-white uppercase`}>
          {user?.username?.[0] || '?'}
        </div>
      )}
      {showOnline && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-gray-950 ${isOnline ? 'bg-emerald-400' : 'bg-gray-500'}`} />
      )}
    </div>
  );
}
