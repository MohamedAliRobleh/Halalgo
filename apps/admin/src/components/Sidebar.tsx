import { NavLink } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',     emoji: '📊' },
  { path: '/users',         label: 'Users',         emoji: '👥' },
  { path: '/orders',        label: 'Orders',        emoji: '📦' },
  { path: '/stores',        label: 'Stores',        emoji: '🏪' },
  { path: '/drivers',       label: 'Drivers',       emoji: '🛵' },
  { path: '/promotions',    label: 'Promotions',    emoji: '🎟️' },
  { path: '/finances',      label: 'Finances',      emoji: '💰' },
  { path: '/notifications', label: 'Notifications', emoji: '🔔' },
];

export function Sidebar() {
  const { signOut } = useClerk();

  return (
    <aside className="w-64 bg-primary h-full flex flex-col py-6 px-4 shrink-0">
      <div className="mb-8 px-2">
        <h1 className="text-white font-bold text-2xl" style={{ fontFamily: 'Poppins' }}>HalalGo</h1>
        <p className="text-white/60 text-xs mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1">
        {NAV_ITEMS.map(({ path, label, emoji }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-xl mb-1 text-sm transition-colors ${
                isActive
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="mr-3">{emoji}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => void signOut()}
        className="text-white/60 hover:text-white text-sm px-3 py-2 text-left transition-colors"
      >
        ← Sign Out
      </button>
    </aside>
  );
}
