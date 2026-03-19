'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard', icon: '◈', roles: ['admin','cashier','waiter','chef'] },
  { href: '/pos',       label: 'POS',       icon: '⊞', roles: ['admin','cashier','waiter'] },
  { href: '/kitchen',   label: 'Kitchen',   icon: '🍳', roles: ['admin','chef','waiter'] },
  { href: '/orders',    label: 'Orders',    icon: '⊟', roles: ['admin','cashier','waiter'] },
  { href: '/inventory', label: 'Inventory', icon: '⊡', roles: ['admin','cashier'] },
  { href: '/reports',   label: 'Reports',   icon: '◉', roles: ['admin','cashier'] },
];

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-amber-500 text-black',
  cashier: 'bg-blue-600 text-white',
  waiter:  'bg-green-600 text-white',
  chef:    'bg-orange-600 text-white',
};

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visible = user
    ? NAV_ITEMS.filter(i => i.roles.includes(user.role))
    : NAV_ITEMS;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <nav className="fixed left-0 top-0 h-screen w-16 lg:w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-black text-xs flex-shrink-0">
          POS
        </div>
        <span className="hidden lg:block text-white font-bold text-sm tracking-wide">foodashh</span>
      </div>

      {/* Nav Links */}
      <div className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              )}
            >
              <span className="text-base leading-none w-5 text-center flex-shrink-0">{item.icon}</span>
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User section */}
      <div className="p-2 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className={clsx(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
            ROLE_COLORS[user?.role || ''] || 'bg-zinc-700 text-white'
          )}>
            {initials}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">{user?.name || 'Guest'}</p>
            <p className="text-xs text-zinc-500 capitalize">{user?.role || '—'}</p>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Sign out"
              className="hidden lg:flex text-zinc-600 hover:text-white transition-colors text-sm"
            >⏻</button>
          )}
        </div>
      </div>
    </nav>
  );
}
