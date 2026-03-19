// lib/api.ts — typed API client for the POS backend

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Helpers ──────────────────────────────────────────────────────
const getToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

const get  = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',  body: JSON.stringify(body) });
const put  = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) });
const patch= <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del  = <T>(path: string)               => request<T>(path, { method: 'DELETE' });

// ── Types ─────────────────────────────────────────────────────────
export interface User { id: string; name: string; email: string; role: string; }
export interface Category { id: number; name: string; icon: string; item_count: number; }
export interface MenuItem {
  id: string; name: string; description: string; price: number;
  category_id: number; category_name: string; is_featured: boolean;
  is_available: boolean; image_url?: string; prep_time_min: number;
  modifiers: Modifier[]; tags?: string[];
}
export interface Modifier { id: number; name: string; price_delta: number; }
export interface RestaurantTable {
  id: number; table_number: string; capacity: number; status: string; floor: string;
  active_order_id?: string; order_number?: string; order_total?: number;
}
export interface OrderItem {
  menu_item_id: string; item_name: string; unit_price: number;
  quantity: number; modifiers?: Modifier[]; special_note?: string;
}
export interface Order {
  id: string; order_number: string; table_id?: number; type: string;
  status: string; payment_status: string; total: number; subtotal: number;
  tax_amount: number; discount_amount: number; items: OrderItem[];
  waiter_name?: string; table_number?: string; created_at: string;
}
export interface Ingredient {
  id: number; name: string; unit: string; quantity: number;
  threshold_alert: number; cost_per_unit: number; supplier?: string;
}
export interface SalesSummary {
  total_orders: number; total_revenue: number; avg_order_value: number;
  total_discounts: number; total_tax: number; cancelled_orders: number;
}

// ── Auth ──────────────────────────────────────────────────────────
export const auth = {
  login:    (email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (data: Partial<User> & { password: string }) =>
    post<{ user: User }>('/auth/register', data),
  me:       () => get<{ user: User }>('/auth/me'),
};

// ── Menu ──────────────────────────────────────────────────────────
export const menu = {
  getAll:       (params?: Record<string, string>) =>
    get<{ items: MenuItem[] }>(`/menu${params ? '?' + new URLSearchParams(params) : ''}`),
  getCategories:() => get<{ categories: Category[] }>('/menu/categories'),
  getOne:       (id: string)    => get<{ item: MenuItem }>(`/menu/${id}`),
  create:       (data: Partial<MenuItem>) => post<{ item: MenuItem }>('/menu', data),
  update:       (id: string, data: Partial<MenuItem>) => put<{ item: MenuItem }>(`/menu/${id}`, data),
  delete:       (id: string)    => del<{ message: string }>(`/menu/${id}`),
};

// ── Orders ────────────────────────────────────────────────────────
export const orders = {
  getAll:       (params?: Record<string, string>) =>
    get<{ orders: Order[] }>(`/orders${params ? '?' + new URLSearchParams(params) : ''}`),
  getOne:       (id: string)    => get<Order>(`/orders/${id}`),
  getTables:    ()               => get<{ tables: RestaurantTable[] }>('/orders/tables'),
  create:       (data: {
    table_id?: number; type: string; items: OrderItem[];
    notes?: string; customer_name?: string; customer_phone?: string;
  }) => post<{ order: Order }>('/orders', data),
  updateStatus: (id: string, status: string) =>
    patch<{ order: Order }>(`/orders/${id}/status`, { status }),
  processPayment: (id: string, data: {
    method: string; amount: number; discount_code?: string; reference?: string;
  }) => post<{ order: Order; message: string }>(`/orders/${id}/payment`, data),
};

// ── Inventory ─────────────────────────────────────────────────────
export const inventory = {
  getAll:    (params?: Record<string, string>) =>
    get<{ ingredients: Ingredient[] }>(`/inventory${params ? '?' + new URLSearchParams(params) : ''}`),
  getAlerts: () => get<{ alerts: Ingredient[]; count: number }>('/inventory/alerts'),
  create:    (data: Partial<Ingredient>) => post<{ ingredient: Ingredient }>('/inventory', data),
  update:    (id: number, data: Partial<Ingredient>) =>
    patch<{ ingredient: Ingredient }>(`/inventory/${id}`, data),
  restock:   (id: number, quantity: number, cost_per_unit?: number) =>
    post<{ ingredient: Ingredient }>(`/inventory/${id}/restock`, { quantity, cost_per_unit }),
};

// ── Reports ───────────────────────────────────────────────────────
export const reports = {
  getSummary:  (period?: string) =>
    get<{ summary: SalesSummary; byMethod: any[]; hourly: any[] }>(
      `/reports/summary${period ? `?period=${period}` : ''}`
    ),
  getTopItems: (period?: string, limit?: number) =>
    get<{ items: any[] }>(`/reports/top-items?period=${period ?? 'month'}&limit=${limit ?? 10}`),
  getTrend:    () => get<{ trend: any[] }>('/reports/trend'),
  getInventory:() => get<{ inventory: any }>('/reports/inventory'),
};
