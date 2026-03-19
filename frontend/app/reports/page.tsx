'use client';
import { useEffect, useState } from 'react';
import { reports } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { clsx } from 'clsx';

const PERIODS = ['today','week','month'] as const;
type Period = typeof PERIODS[number];

const PD: Record<string, any> = {
  today: { rev:68420,   ord:147,  avg:465, can:4,   tax:3421  },
  week:  { rev:421500,  ord:892,  avg:472, can:22,  tax:21075 },
  month: { rev:1840000, ord:3956, avg:465, can:98,  tax:92000 },
};
const MOCK_TREND = Array.from({length:14},(_,i)=>({ date:new Date(Date.now()-(13-i)*86400000).toISOString().slice(5,10), revenue:Math.floor(3000+Math.random()*8000) }));
const TOP = [
  {n:'Classic Smash Burger',q:89,r:31150,c:'Burgers'},
  {n:'Pepperoni Feast',q:64,r:39680,c:'Pizza'},
  {n:'BBQ Bacon Burger',q:57,r:23940,c:'Burgers'},
  {n:'Choco Lava Cake',q:51,r:12750,c:'Desserts'},
  {n:'Cold Brew Coffee',q:48,r:8640,c:'Drinks'},
  {n:'Loaded Fries',q:44,r:9680,c:'Starters'},
  {n:'Margherita Pizza',q:38,r:20900,c:'Pizza'},
  {n:'Chicken Wings',q:35,r:13300,c:'Starters'},
];
const METHS = [
  {name:'Cash',  amount:32400,count:69},
  {name:'bKash', amount:18200,count:39},
  {name:'Card',  amount:12600,count:27},
  {name:'Nagad', amount:5220, count:12},
];
const COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6'];

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData]     = useState(PD['today']);
  const [trend, setTrend]   = useState(MOCK_TREND);
  const [top, setTop]       = useState(TOP);

  useEffect(() => {
    setData(PD[period]);
    reports.getSummary(period).then(d => setData({ rev:d.summary.total_revenue, ord:d.summary.total_orders, avg:d.summary.avg_order_value, can:d.summary.cancelled_orders, tax:d.summary.total_tax })).catch(()=>{});
    reports.getTrend().then(d => setTrend(d.trend.map((r:any)=>({...r,date:String(r.date).slice(5,10)})))).catch(()=>{});
    reports.getTopItems(period,8).then(d => setTop(d.items.map((i:any)=>({n:i.item_name,q:i.total_qty,r:i.total_revenue,c:i.category||'—'})))).catch(()=>{});
  }, [period]);

  const total = METHS.reduce((s,m)=>s+m.amount,0);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white">Reports</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Sales analytics & insights</p>
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-2.5 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                period === p ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              )}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l:'Revenue',       v:`৳${Number(data.rev).toLocaleString()}`, s:`${data.ord} orders`, accent:true },
          { l:'Avg Order',     v:`৳${Number(data.avg).toFixed(0)}`,       s:'per transaction' },
          { l:'Cancellations', v:String(data.can),                        s:`${((data.can/Math.max(data.ord,1))*100).toFixed(1)}% rate` },
          { l:'Tax Collected', v:`৳${Number(data.tax).toLocaleString()}`, s:'5% VAT' },
        ].map(({ l, v, s, accent }) => (
          <div key={l} className={clsx('rounded-xl border p-4', accent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800')}>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">{l}</p>
            <p className={clsx('text-xl lg:text-2xl font-black mt-1', accent ? 'text-amber-400' : 'text-white')}>{v}</p>
            <p className="text-zinc-600 text-xs mt-1">{s}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fill:'#52525b',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#52525b',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:'#18181b',border:'1px solid #27272a',borderRadius:8,fontSize:12}} labelStyle={{color:'#a1a1aa'}} itemStyle={{color:'#f59e0b'}}/>
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#rg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-2">Payment Methods</h2>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={METHS} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={60} strokeWidth={0}>
                {METHS.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:'#18181b',border:'1px solid #27272a',borderRadius:8,fontSize:12}} formatter={(v:any)=>[`৳${Number(v).toLocaleString()}`,'Revenue']}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {METHS.map((m,i)=>(
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                  <span className="text-zinc-400">{m.name}</span>
                </div>
                <span className="text-zinc-500">{((m.amount/total)*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top items table — scrollable on mobile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-sm">Item Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-zinc-600 text-xs uppercase tracking-wider border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 font-medium">#</th>
                <th className="text-left px-4 py-2.5 font-medium">Item</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                <th className="text-right px-4 py-2.5 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {top.map((item, i) => (
                <tr key={i} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3"><span className={clsx('text-xs font-bold', i===0?'text-amber-400':'text-zinc-600')}>{i+1}</span></td>
                  <td className="px-4 py-3 text-white text-xs">{item.n}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{item.c}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs text-right font-semibold">{item.q}×</td>
                  <td className="px-4 py-3 text-amber-400 text-xs text-right font-bold">৳{Number(item.r).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
