'use client';
import { useEffect, useState, useCallback } from 'react';
import { orders } from '@/lib/api';
import type { Order } from '@/lib/api';
import { useSocket, useInterval } from '@/lib/hooks';
import { clsx } from 'clsx';

interface KDSOrder extends Order { elapsed: number; }

const urgency = (s: number) => s > 1200 ? 'critical' : s > 600 ? 'urgent' : s > 300 ? 'warn' : 'normal';
const US: Record<string, string> = {
  normal:   'border-zinc-700  bg-zinc-900',
  warn:     'border-yellow-700/60 bg-yellow-950/20',
  urgent:   'border-orange-700/60 bg-orange-950/20',
  critical: 'border-red-700/60 bg-red-950/30',
};
const UH: Record<string, string> = {
  normal: 'bg-zinc-800 text-zinc-300', warn: 'bg-yellow-900/40 text-yellow-300',
  urgent: 'bg-orange-900/40 text-orange-300', critical: 'bg-red-900/40 text-red-300',
};
const fmtT = (s: number) => { const m = Math.floor(s/60), sc = s%60; return m > 0 ? `${m}m ${sc}s` : `${sc}s`; };

const MOCK: Partial<Order>[] = [
  { id:'k1', order_number:'POS-260319-1042', table_number:'T3', type:'dine_in', status:'cooking', created_at: new Date(Date.now()-480000).toISOString(), items:[{menu_item_id:'1',item_name:'Classic Smash Burger',unit_price:350,quantity:2,modifiers:[]},{menu_item_id:'11',item_name:'Loaded Fries',unit_price:220,quantity:2,modifiers:[]},{menu_item_id:'8',item_name:'Fresh Lemonade',unit_price:120,quantity:3,modifiers:[],special_note:'Less sugar'}], total:1380, subtotal:1314, tax_amount:66, discount_amount:0, payment_status:'unpaid' },
  { id:'k2', order_number:'POS-260319-1043', table_number:'T7', type:'dine_in', status:'pending', created_at: new Date(Date.now()-120000).toISOString(), items:[{menu_item_id:'4',item_name:'Margherita Pizza',unit_price:550,quantity:1,modifiers:[],special_note:'Extra basil'},{menu_item_id:'9',item_name:'Cold Brew Coffee',unit_price:180,quantity:2,modifiers:[]}], total:910, subtotal:867, tax_amount:43, discount_amount:0, payment_status:'unpaid' },
  { id:'k3', order_number:'POS-260319-1041', table_number:'', type:'takeaway', status:'pending', created_at: new Date(Date.now()-780000).toISOString(), items:[{menu_item_id:'2',item_name:'BBQ Bacon Burger',unit_price:420,quantity:1,modifiers:[]},{menu_item_id:'5',item_name:'Pepperoni Feast',unit_price:620,quantity:1,modifiers:[],special_note:'Well done'},{menu_item_id:'12',item_name:'Chicken Wings',unit_price:380,quantity:1,modifiers:[]}], total:1470, subtotal:1400, tax_amount:70, discount_amount:0, payment_status:'unpaid' },
  { id:'k4', order_number:'POS-260319-1040', table_number:'T1', type:'dine_in', status:'ready', created_at: new Date(Date.now()-1500000).toISOString(), items:[{menu_item_id:'10',item_name:'Chocolate Lava Cake',unit_price:250,quantity:2,modifiers:[]},{menu_item_id:'8',item_name:'Fresh Lemonade',unit_price:120,quantity:1,modifiers:[]}], total:651, subtotal:620, tax_amount:31, discount_amount:0, payment_status:'unpaid' },
];

const NS: Record<string,string> = { pending:'cooking', cooking:'ready' };

export default function KitchenPage() {
  const [kds, setKds]       = useState<KDSOrder[]>([]);
  const [filter, setFilter] = useState<'all'|'pending'|'cooking'|'ready'>('all');
  const { on, emit }        = useSocket();

  const build = useCallback((raw: Partial<Order>[]): KDSOrder[] =>
    raw.filter(o => !['served','cancelled'].includes(o.status||''))
       .map(o => ({ ...o, elapsed: Math.floor((Date.now()-new Date(o.created_at||Date.now()).getTime())/1000) } as KDSOrder))
       .sort((a,b) => b.elapsed - a.elapsed), []);

  useEffect(() => {
    setKds(build(MOCK as Order[]));
    emit('join_kitchen');
    orders.getAll({ status:'pending,confirmed,cooking,ready', limit:'50' }).then(d => setKds(build(d.orders))).catch(()=>{});
  }, []);

  useInterval(() => setKds(prev => prev.map(o => ({ ...o, elapsed: o.elapsed + 1 }))), 1000);
  useEffect(() => { const off = on('new_order', () => orders.getAll({ status:'pending,confirmed,cooking,ready',limit:'50' }).then(d=>setKds(build(d.orders))).catch(()=>{})); return off; }, [on]);

  const advance = async (order: KDSOrder) => {
    const next = NS[order.status];
    if (!next) return;
    try { await orders.updateStatus(order.id, next); } catch {}
    setKds(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
  };

  const displayed = kds.filter(o => filter === 'all' || o.status === filter);
  const cnt = { p: kds.filter(o=>o.status==='pending').length, c: kds.filter(o=>o.status==='cooking').length, r: kds.filter(o=>o.status==='ready').length };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3 flex-wrap bg-zinc-900">
        <div>
          <h1 className="text-white font-black text-base leading-none">Kitchen Display</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Real-time order queue</p>
        </div>
        {/* Counts */}
        <div className="flex gap-4 ml-2">
          {[{l:'Pending',c:'text-yellow-400',n:cnt.p},{l:'Cooking',c:'text-orange-400',n:cnt.c},{l:'Ready',c:'text-green-400',n:cnt.r}].map(x=>(
            <div key={x.l} className="text-center">
              <p className={clsx('text-xl font-black leading-none', x.c)}>{x.n}</p>
              <p className="text-zinc-600 text-[9px]">{x.l}</p>
            </div>
          ))}
        </div>
        {/* Filter */}
        <div className="flex gap-1 ml-auto bg-zinc-800 rounded-lg p-1">
          {(['all','pending','cooking','ready'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx('px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all',
                filter === f ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              )}>{f === 'all' ? `All (${kds.length})` : f}</button>
          ))}
        </div>
      </div>

      {/* KDS grid — responsive */}
      <div className="flex-1 overflow-y-auto p-3">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-3">
            <span className="text-5xl">👨‍🍳</span><p className="text-base font-semibold">Kitchen is clear!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 auto-rows-max">
            {displayed.map(order => {
              const u = urgency(order.elapsed);
              const tc = u === 'critical' ? '#f87171' : u === 'urgent' ? '#fb923c' : u === 'warn' ? '#eab308' : '#a1a1aa';
              const isReady = order.status === 'ready';
              const isPending = order.status === 'pending';
              return (
                <div key={order.id} className={clsx('rounded-2xl border-2 flex flex-col overflow-hidden', US[u])}>
                  <div className={clsx('px-3 py-2.5 flex items-start justify-between', UH[u])}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0',
                          u==='critical'?'bg-red-400 animate-pulse':u==='urgent'?'bg-orange-400 animate-pulse':u==='warn'?'bg-yellow-400 animate-pulse':'bg-green-400'
                        )} />
                        <span className="font-black text-xs font-mono">{order.order_number}</span>
                      </div>
                      <div className="text-xs opacity-70 mt-0.5 pl-3">
                        {order.table_number ? `Table ${order.table_number}` : order.type?.replace('_',' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black tabular-nums" style={{ color: tc }}>{fmtT(order.elapsed)}</div>
                      <div className="text-[9px] opacity-60">elapsed</div>
                    </div>
                  </div>
                  <div className="flex-1 px-3 py-2.5 space-y-2">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-black bg-zinc-800 text-amber-400">{item.quantity}</span>
                        <div>
                          <p className="text-white text-xs font-medium leading-tight">{item.item_name}</p>
                          {item.special_note && <p className="text-amber-400/80 text-[10px] mt-0.5 italic">✎ {item.special_note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 pb-3">
                    {isReady ? (
                      <button onClick={() => setKds(prev => prev.filter(o=>o.id!==order.id))}
                        className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all">
                        ✓ Served — Dismiss
                      </button>
                    ) : NS[order.status] ? (
                      <button onClick={() => advance(order)}
                        className={clsx('w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95',
                          isPending ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'
                        )}>
                        {isPending ? '▶ Start Cooking' : '✓ Mark Ready'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
