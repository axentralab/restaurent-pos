'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from './api';
import type { User } from './api';
import { connectSocket, disconnectSocket, getSocket } from './socket';
import type { SocketEventMap } from './socket';

// ── Parse user from token (works for real JWT and mock token) ──
function parseToken(token: string): Partial<User> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// ── useAuth ───────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (!token) { setLoading(false); return; }

    // Try real API first
    auth.me()
      .then(d => setUser(d.user))
      .catch(() => {
        // Fall back to parsing the token directly (mock / offline mode)
        const parsed = parseToken(token);
        if (parsed?.id) {
          setUser(parsed as User);
        } else {
          localStorage.removeItem('pos_token');
          document.cookie = 'pos_token=; path=/; max-age=0';
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await auth.login(email, password);
    localStorage.setItem('pos_token', token);
    document.cookie = `pos_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pos_token');
    document.cookie = 'pos_token=; path=/; max-age=0';
    setUser(null);
    disconnectSocket();
    window.location.href = '/login';
  }, []);

  return { user, loading, login, logout, isAdmin: user?.role === 'admin' };
}

// ── useSocket ─────────────────────────────────────────────────
export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = connectSocket();
    setConnected(s.connected);
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    return () => { s.off('connect', onConnect); s.off('disconnect', onDisconnect); };
  }, []);

  const on = useCallback(<K extends keyof SocketEventMap>(
    event: K,
    handler: (data: SocketEventMap[K]) => void
  ) => {
    const s = getSocket();
    s.on(event as string, handler as any);
    return () => s.off(event as string, handler as any);
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    getSocket().emit(event, data);
  }, []);

  return { connected, on, emit };
}

// ── useLocalStorage ───────────────────────────────────────────
export function useLocalStorage<T>(key: string, initial: T): [T, (val: T) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch { return initial; }
  });

  const set = useCallback((v: T) => {
    setVal(v);
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(v));
  }, [key]);

  return [val, set];
}

// ── useInterval ───────────────────────────────────────────────
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// ── useDebounce ───────────────────────────────────────────────
export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
