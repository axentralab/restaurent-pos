'use client';
import { useEffect, useState } from 'react';
import { reports, orders } from '@/lib/api';
import type { SalesSummary, Order } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { clsx } from 'clsx';

const PERIODS = ['today', 'week', 'month'] as const;
type Period = typeof PERIODS[number];

const MOCK_SUMMARY: SalesSummary = {
  total_orders: 147, total_revenue: 68420, avg_order_value: 465,
  total_discounts: 2100, total_tax: 3421, cancelled_orders: 4,
};
const MOCK_TREND = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(5, 10),
  revenue: Math.floor(4000 + Math.random() * 6000),
  orders:  Math.floor(8 + Math.random() * 20),
}));
const MOCK_TOP = [
  { item_name: 'Classic Smash Burger', total_qty: 89, total_revenue: 31150 },
  { item_name: 'Pepperoni Feast',      total_qty: 64, total_revenue: 39680 },
  { item_name: 'BBQ Bacon Burger',     total_qty: 57, total_revenue: 23940 },
  { item_name: 'Choco Lava Cake',      total_qty: 51, total_revenue: 12750 },
  { item_name: 'Cold Brew Coffee',     total_qty: 48, total_revenue:  8640 },
];
const MOCK_ORDERS: Partial<Order>[] = [
  { id:'1', order_number:'POS-260319-1042', table_number:'T3', status:'cooking',   total:1040, created_at: new Date(Date.now()-600000).toISOString() },
  { id:'2', order_number:'POS-260319-1041', table_number:'T7', status:'pending',   total:780,  created_at: new Date(Date.now()-900000).toISOString() },
  { id:'3', order_number:'POS-260319-1040', table_number:'T1', status:'ready',     total:1380, created_at: new Date(Date.now()-1200000).toISOString() },
  { id:'4', order_number:'POS-260319-1039', table_number:'T5', status:'served',    total:560,  created_at: new Date(Date.now()-3600000).toISOString() },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-900/40',
  confirmed: 'bg-blue-500/20   text-blue-400   border-blue-900/40',
  cooking:   'bg-orange-500/20 text-orange-400 border-orange-900/40',
  ready:     'bg-green-500/20  text-green-400  border-green-900/40',
  served:    'bg-zinc-500/20   text-zinc-400   border-zinc-700/40',
  cancelled: 'bg-red-500/20    text-red-400    border-red-900/40',
};

const PERIODS_DATA: Record<string, typeof MOCK_SUMMARY> = {
  today: MOCK_SUMMARY,
  week:  { total_orders:892,  total_revenue:421500,  avg_order_value:472, total_discounts:12400, total_tax:21075, cancelled_orders:22 },
  month: { total_orders:3956, total_revenue:1840000, avg_order_value:465, total_discounts:53200, total_tax:92000, cancelled_orders:98 },
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={clsx('rounded-xl border p-4', accent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800')}>
      <p className="text-zinc-500 text-xs uppercase tracking-widest">{label}</p>
      <p className={clsx('text-xl lg:text-2xl font-black mt-1', accent ? 'text-amber-400' : 'text-white')}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod]     = useState<Period>('today');
  const [summary, setSummary]   = useState<SalesSummary>(MOCK_SUMMARY);
  const [trend, setTrend]       = useState(MOCK_TREND);
  const [topItems, setTopItems] = useState(MOCK_TOP);
  const [liveOrders, setLiveOrders] = useState<Partial<Order>[]>(MOCK_ORDERS);

  useEffect(() => {
    setSummary(PERIODS_DATA[period]);
    reports.getSummary(period).then(d => setSummary(d.summary)).catch(() => {});
    reports.getTrend().then(d => setTrend(d.trend.map((r: any) => ({ ...r, date: String(r.date).slice(5,10) })))).catch(() => {});
    reports.getTopItems(period).then(d => setTopItems(d.items)).catch(() => {});
    orders.getAll({ status: 'pending,confirmed,cooking,ready', limit: '8' }).then(d => setLiveOrders(d.orders)).catch(() => {});
  }, [period]);

  const maxRevenue = Math.max(...topItems.map(i => Number(i.total_revenue)));

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white">Dashboard</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            {new Date().toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-2.5 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                period === p ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              )}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Revenue"    value={`৳${Number(summary?.total_revenue||0).toLocaleString()}`} sub={`${summary?.total_orders} orders`} accent />
        <StatCard label="Avg Order"  value={`৳${Number(summary?.avg_order_value||0).toFixed(0)}`}    sub="per transaction" />
        <StatCard label="VAT"        value={`৳${Number(summary?.total_tax||0).toLocaleString()}`}     sub="5% rate" />
        <StatCard label="Discounts"  value={`৳${Number(summary?.total_discounts||0).toLocaleString()}`} sub={`${summary?.cancelled_orders} cancellations`} />
      </div>

      {/* Charts — stack on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#a1a1aa' }} itemStyle={{ color: '#f59e0b' }} />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#rev)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-4">Top Sellers</h2>
          <div className="space-y-3">
            {topItems.slice(0, 5).map((item, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300 text-xs truncate pr-2">{item.item_name}</span>
                  <span className="text-amber-400 text-xs font-semibold flex-shrink-0">{item.total_qty}×</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(Number(item.total_revenue) / maxRevenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Orders table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-sm">Live Orders</h2>
          <span className="flex items-center gap-1.5 text-green-400 text-xs">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Live
          </span>
        </div>
        {/* Scrollable on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-zinc-600 text-xs uppercase tracking-wider border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 font-medium">Order #</th>
                <th className="text-left px-4 py-2.5 font-medium">Table</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Time</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {liveOrders.map((order) => (
                <tr key={order.id} className="border-b border-zinc-900 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-white font-mono text-xs">{order.order_number}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{order.table_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase', STATUS_COLORS[order.status || 'pending'])}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {order.created_at ? `${Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)}m ago` : '—'}
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-semibold text-xs text-right">৳{Number(order.total||0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
