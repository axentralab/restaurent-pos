'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { clsx } from 'clsx';

const DEMO_ACCOUNTS = [
  { role: 'Admin',   email: 'admin@pos.com',   password: 'admin123',   desc: 'Full access to all modules' },
  { role: 'Cashier', email: 'cashier@pos.com', password: 'cashier123', desc: 'POS, orders, reports' },
  { role: 'Waiter',  email: 'waiter@pos.com',  password: 'waiter123',  desc: 'POS and table orders' },
  { role: 'Chef',    email: 'chef@pos.com',    password: 'chef123',    desc: 'Kitchen display only' },
];

// Mock users — works even when backend is offline
const MOCK_USERS: Record<string, { name: string; role: string; password: string }> = {
  'admin@pos.com':   { name: 'Admin User',    role: 'admin',   password: 'admin123'   },
  'cashier@pos.com': { name: 'Sarah Cashier', role: 'cashier', password: 'cashier123' },
  'waiter@pos.com':  { name: 'Rahim Waiter',  role: 'waiter',  password: 'waiter123'  },
  'chef@pos.com':    { name: 'Chef Karim',    role: 'chef',    password: 'chef123'    },
};

function mockToken(user: { name: string; role: string; email: string }) {
  // Fake JWT-shaped token for demo — not cryptographically valid
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ id: crypto.randomUUID(), ...user, iat: Date.now() }));
  return `${header}.${payload}.mock_signature`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('admin@pos.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const saveSession = (token: string) => {
    // Save in both localStorage (for API calls) and cookie (for middleware)
    localStorage.setItem('pos_token', token);
    document.cookie = `pos_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Try real backend first
    try {
      const { token } = await auth.login(email, password);
      saveSession(token);
      router.push('/');
      return;
    } catch (_) {
      // Backend offline — fall through to mock login
    }

    // 2. Mock login fallback (demo / no backend)
    const mock = MOCK_USERS[email.toLowerCase()];
    if (mock && mock.password === password) {
      const token = mockToken({ name: mock.name, role: mock.role, email });
      saveSession(token);
      router.push('/');
    } else {
      setError('Invalid email or password');
    }

    setLoading(false);
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-zinc-900 border-r border-zinc-800 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black font-black text-sm">
            POS
          </div>
          <span className="text-white font-bold text-xl">foodashh</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight">
            The POS that<br />
            <span className="text-amber-400">works as hard</span><br />
            as your kitchen.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Real-time orders. Live inventory. Multi-role access.
            Built for restaurants in Bangladesh and beyond.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '⚡', label: 'Real-time KOT' },
              { icon: '📊', label: 'Live analytics' },
              { icon: '📦', label: 'Auto inventory' },
              { icon: '💳', label: 'bKash / Cash' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-zinc-400 text-sm">
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-zinc-700 text-sm">© 2026 foodashh POS · Axentralab</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-black font-black text-xs">POS</div>
            <span className="text-white font-bold text-lg">foodashh</span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Sign in</h2>
            <p className="text-zinc-500 text-sm mt-1">Enter your credentials to access the POS</p>
          </div>

          {/* Demo switcher */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className={clsx(
                    'p-2.5 rounded-lg border text-left transition-all',
                    email === acc.email
                      ? 'border-amber-500/60 bg-amber-500/10 text-white'
                      : 'border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white'
                  )}
                >
                  <p className="text-xs font-semibold">{acc.role}</p>
                  <p className="text-[10px] opacity-60 mt-0.5">{acc.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-xl transition-all active:scale-95 text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="text-zinc-700 text-xs text-center">
            Works offline with demo accounts. Connect backend for real data.
          </p>
        </div>
      </div>
    </div>
  );
}
