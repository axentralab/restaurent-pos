'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

const DEMO_ACCOUNTS = [
  { role: 'Admin',   email: 'admin@pos.com',   password: 'admin123',   desc: 'Full access' },
  { role: 'Cashier', email: 'cashier@pos.com', password: 'cashier123', desc: 'POS + billing' },
  { role: 'Waiter',  email: 'waiter@pos.com',  password: 'waiter123',  desc: 'Orders only'  },
  { role: 'Chef',    email: 'chef@pos.com',    password: 'chef123',    desc: 'Kitchen only' },
];

// All valid users — no backend needed
const USERS: Record<string, { name: string; role: string }> = {
  'admin@pos.com':   { name: 'Admin User',    role: 'admin'   },
  'cashier@pos.com': { name: 'Sarah Cashier', role: 'cashier' },
  'waiter@pos.com':  { name: 'Rahim Waiter',  role: 'waiter'  },
  'chef@pos.com':    { name: 'Chef Karim',    role: 'chef'    },
};

const PASSWORDS: Record<string, string> = {
  'admin@pos.com':   'admin123',
  'cashier@pos.com': 'cashier123',
  'waiter@pos.com':  'waiter123',
  'chef@pos.com':    'chef123',
};

function makeToken(email: string, name: string, role: string): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: Math.random().toString(36).slice(2),
    email, name, role,
    iat: Math.floor(Date.now() / 1000),
  }));
  return `${header}.${payload}.demo_signature`;
}

function saveSession(token: string) {
  try { localStorage.setItem('pos_token', token); } catch {}
  try { document.cookie = `pos_token=${token}; path=/; max-age=${7 * 24 * 3600}`; } catch {}
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('admin@pos.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const em = email.trim().toLowerCase();

    // ── Try real backend first (with short timeout) ──────────
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000); // 3s timeout
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: em, password }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          saveSession(data.token);
          router.push('/');
          return;
        }
      } catch {
        // Backend unavailable — fall through to demo login
      }
    }

    // ── Demo / offline login ──────────────────────────────────
    const user = USERS[em];
    const correctPass = PASSWORDS[em];

    if (user && correctPass === password) {
      const token = makeToken(em, user.name, user.role);
      saveSession(token);
      setLoading(false);
      router.push('/');
    } else {
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex' }}>
      {/* Left branding */}
      <div style={{ flex: 1, background: '#18181b', borderRight: '1px solid #27272a', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        className="hidden lg:flex">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, background: '#f59e0b', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: 10 }}>POS</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fafafa' }}>foodashh</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fafafa', lineHeight: 1.3, marginBottom: 12 }}>
            The POS that<br /><span style={{ color: '#f59e0b' }}>works as hard</span><br />as your kitchen.
          </div>
          <p style={{ color: '#71717a', fontSize: 13, lineHeight: 1.6 }}>
            Real-time orders. Live inventory.<br />Multi-role access. Built for BD restaurants.
          </p>
        </div>
        <p style={{ color: '#3f3f46', fontSize: 11 }}>© 2026 foodashh · Axentralab</p>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 340 }}>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div style={{ width: 32, height: 32, background: '#f59e0b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: 9 }}>POS</div>
            <span style={{ color: '#fafafa', fontWeight: 700, fontSize: 16 }}>foodashh</span>
          </div>

          <div style={{ color: '#fafafa', fontSize: 20, fontWeight: 900, marginBottom: 3 }}>Sign in</div>
          <div style={{ color: '#71717a', fontSize: 12, marginBottom: 20 }}>Pick a demo account or enter credentials</div>

          {/* Demo buttons */}
          <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, padding: 12, marginBottom: 20 }}>
            <p style={{ color: '#52525b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 8 }}>Demo accounts</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  style={{
                    padding: '8px 10px',
                    border: `1px solid ${email === acc.email ? 'rgba(245,158,11,.5)' : '#3f3f46'}`,
                    borderRadius: 8,
                    background: email === acc.email ? 'rgba(245,158,11,.08)' : 'transparent',
                    color: email === acc.email ? '#fafafa' : '#a1a1aa',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .12s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{acc.role}</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{acc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', color: '#71717a', fontSize: 11, fontWeight: 500, marginBottom: 5 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 9, padding: '9px 12px', color: '#fafafa', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', color: '#71717a', fontSize: 11, fontWeight: 500, marginBottom: 5 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 9, padding: '9px 12px', color: '#fafafa', fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
            />

            {error && (
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 12, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', background: loading ? '#27272a' : '#f59e0b',
                border: 'none', borderRadius: 10, color: loading ? '#71717a' : '#000',
                fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all .12s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p style={{ color: '#3f3f46', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
            Works offline — no backend needed for demo
          </p>
        </div>
      </div>
    </div>
  );
}
