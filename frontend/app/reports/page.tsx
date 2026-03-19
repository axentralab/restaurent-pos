'use client';
import { useEffect, useState } from 'react';
import { reports } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { clsx } from 'clsx';

const PERIODS = ['today','week','month'] as const;
type Period = typeof PERIODS[number];

const MOCK_SUMMARY = { total_orders:147, total_revenue:68420, avg_order_value:465, total_discounts:2100, total_tax:3421, cancelled_orders:4 };
const MOCK_TREND = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13-i)*86400000).toISOString().slice(5,10),
  revenue: Math.floor(3000 + Math.random() * 8000),
  orders:  Math.floor(6  + Math.random() * 18),
}));
const MOCK_TOP = [
  { item_name:'Classic Smash Burger', total_qty:89,  total_revenue:31150, category:'Burgers'  },
  { item_name:'Pepperoni Feast',      total_qty:64,  total_revenue:39680, category:'Pizza'    },
  { item_name:'BBQ Bacon Burger',     total_qty:57,  total_revenue:23940, category:'Burgers'  },
  { item_name:'Choco Lava Cake',      total_qty:51,  total_revenue:12750, category:'Desserts' },
  { item_name:'Cold Brew Coffee',     total_qty:48,  total_revenue:8640,  category:'Drinks'   },
  { item_name:'Loaded Fries',         total_qty:44,  total_revenue:9680,  category:'Starters' },
  { item_name:'Margherita Pizza',     total_qty:38,  total_revenue:20900, category:'Pizza'    },
  { item_name:'Chicken Wings',        total_qty:35,  total_revenue:13300, category:'Starters' },
];
const MOCK_BY_METHOD = [
  { payment_method:'cash',   amount:32400, count:69 },
  { payment_method:'bkash',  amount:18200, count:39 },
  { payment_method:'card',   amount:12600, count:27 },
  { payment_method:'nagad',  amount:5220,  count:12 },
];
const COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#f43f5e'];

function StatCard({ label, value, sub, accent }:{ label:string; value:string; sub?:string; accent?:boolean }) {
  return (
    <div className={clsx('rounded-xl border p-5', accent ? 'bg-amber-500/10 border-amber-500/30':'bg-zinc-900 border-zinc-800')}>
      <p className="text-zinc-500 text-xs uppercase tracking-widest">{label}</p>
      <p className={clsx('text-2xl font-black mt-1', accent ? 'text-amber-400':'text-white')}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [summary, setSummary] = useState(MOCK_SUMMARY);
  const [trend, setTrend]     = useState(MOCK_TREND);
  const [topItems, setTopItems] = useState(MOCK_TOP);
  const [byMethod, setByMethod] = useState(MOCK_BY_METHOD);

  useEffect(() => {
    reports.getSummary(period)
      .then(d => { setSummary(d.summary); setByMethod(d.byMethod || MOCK_BY_METHOD); })
      .catch(() => {});
    reports.getTrend()
      .then(d => setTrend(d.trend.map((r: any) => ({ ...r, date: String(r.date).slice(5,10) }))))
      .catch(() => {});
    reports.getTopItems(period, 8)
      .then(d => setTopItems(d.items))
      .catch(() => {});
  }, [period]);

  const totalPayments = byMethod.reduce((s, m) => s + Number(m.amount), 0);

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Reports</h1>
          <p className="text-zinc-500 text-sm">Sales analytics & insights</p>
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                period === p ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              )}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"   value={`৳${Number(summary.total_revenue||0).toLocaleString()}`}  sub={`${summary.total_orders} orders`} accent />
        <StatCard label="Avg Order Value" value={`৳${Number(summary.avg_order_value||0).toFixed(0)}`}      sub="per transaction" />
        <StatCard label="Cancellations"   value={String(summary.cancelled_orders||0)}                       sub={`${((summary.cancelled_orders/Math.max(summary.total_orders,1))*100).toFixed(1)}% rate`} />
        <StatCard label="Tax Collected"   value={`৳${Number(summary.total_tax||0).toFixed(0)}`}            sub="5% VAT" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-1">Revenue Trend</h2>
          <p className="text-zinc-600 text-xs mb-4">Last 14 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top:0, right:0, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill:'#52525b', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#52525b', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'#18181b', border:'1px solid #27272a', borderRadius:8, fontSize:12 }} labelStyle={{ color:'#a1a1aa' }} itemStyle={{ color:'#f59e0b' }} />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#rg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Pie */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-1">Payment Methods</h2>
          <p className="text-zinc-600 text-xs mb-2">Revenue share</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={byMethod} dataKey="amount" nameKey="payment_method" cx="50%" cy="50%" outerRadius={65} strokeWidth={0}>
                {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background:'#18181b', border:'1px solid #27272a', borderRadius:8, fontSize:12 }}
                formatter={(v: any) => [`৳${Number(v).toLocaleString()}`, 'Revenue']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {byMethod.map((m, i) => (
              <div key={m.payment_method} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-400 capitalize">{m.payment_method}</span>
                </div>
                <span className="text-zinc-500">{((Number(m.amount)/totalPayments)*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Items Bar Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-1">Top Selling Items</h2>
        <p className="text-zinc-600 text-xs mb-4">By quantity sold</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topItems} margin={{ top:0, right:0, left:-10, bottom:40 }}>
            <XAxis dataKey="item_name" tick={{ fill:'#52525b', fontSize:9 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={{ fill:'#52525b', fontSize:10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background:'#18181b', border:'1px solid #27272a', borderRadius:8, fontSize:12 }}
              labelStyle={{ color:'#a1a1aa' }}
              cursor={{ fill:'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="total_qty" name="Qty Sold" radius={[4,4,0,0]}>
              {topItems.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : '#3f3f46'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Items Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-sm">Item Performance</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-600 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="text-left px-5 py-2.5 font-medium">#</th>
              <th className="text-left px-4 py-2.5 font-medium">Item</th>
              <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Category</th>
              <th className="text-right px-4 py-2.5 font-medium">Qty Sold</th>
              <th className="text-right px-5 py-2.5 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {topItems.map((item, i) => (
              <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-5 py-3">
                  <span className={clsx('text-xs font-bold', i === 0 ? 'text-amber-400' : 'text-zinc-600')}>{i+1}</span>
                </td>
                <td className="px-4 py-3 text-white text-sm">{item.item_name}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{item.category}</td>
                <td className="px-4 py-3 text-zinc-300 text-xs text-right font-semibold">{item.total_qty}×</td>
                <td className="px-5 py-3 text-amber-400 text-xs text-right font-bold">৳{Number(item.total_revenue).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
