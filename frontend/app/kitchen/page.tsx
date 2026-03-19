'use client';
import { useEffect, useState, useCallback } from 'react';
import { orders } from '@/lib/api';
import type { Order } from '@/lib/api';
import { useSocket, useInterval } from '@/lib/hooks';
import { clsx } from 'clsx';

// ── KDS-specific types ──────────────────────────────────────
interface KDSOrder extends Order {
  elapsed: number; // seconds since created
}

const URGENCY = (secs: number) =>
  secs > 1200 ? 'critical' :  // >20 min
  secs > 600  ? 'urgent'   :  // >10 min
  secs > 300  ? 'warn'     :  // >5 min
                'normal';

const URGENCY_STYLES = {
  normal:   'border-zinc-700  bg-zinc-900',
  warn:     'border-yellow-700/60 bg-yellow-950/20',
  urgent:   'border-orange-700/60 bg-orange-950/20',
  critical: 'border-red-700/60 bg-red-950/30',
};

const URGENCY_HEADER = {
  normal:   'bg-zinc-800 text-zinc-300',
  warn:     'bg-yellow-900/40 text-yellow-300',
  urgent:   'bg-orange-900/40 text-orange-300',
  critical: 'bg-red-900/40 text-red-300',
};

const URGENCY_DOT = {
  normal:   'bg-green-500',
  warn:     'bg-yellow-400 animate-pulse',
  urgent:   'bg-orange-400 animate-pulse',
  critical: 'bg-red-500 animate-pulse',
};

const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// Mock KDS data
const MOCK_KDS: Partial<Order>[] = [
  {
    id: 'k1', order_number: 'POS-260319-1042', table_number: 'T3',
    type: 'dine_in', status: 'cooking', created_at: new Date(Date.now() - 480000).toISOString(),
    items: [
      { menu_item_id:'1', item_name:'Classic Smash Burger', unit_price:350, quantity:2, modifiers:[] },
      { menu_item_id:'11', item_name:'Loaded Fries',        unit_price:220, quantity:2, modifiers:[] },
      { menu_item_id:'8', item_name:'Fresh Lemonade',       unit_price:120, quantity:3, modifiers:[] },
    ], total:1380, subtotal:1314, tax_amount:66, discount_amount:0, payment_status:'unpaid',
  },
  {
    id: 'k2', order_number: 'POS-260319-1043', table_number: 'T7',
    type: 'dine_in', status: 'pending', created_at: new Date(Date.now() - 120000).toISOString(),
    items: [
      { menu_item_id:'4', item_name:'Margherita Pizza',     unit_price:550, quantity:1, modifiers:[], special_note:'Extra basil' },
      { menu_item_id:'9', item_name:'Cold Brew Coffee',     unit_price:180, quantity:2, modifiers:[] },
    ], total:910, subtotal:867, tax_amount:43, discount_amount:0, payment_status:'unpaid',
  },
  {
    id: 'k3', order_number: 'POS-260319-1041',
    type: 'takeaway', status: 'pending', created_at: new Date(Date.now() - 780000).toISOString(),
    items: [
      { menu_item_id:'2', item_name:'BBQ Bacon Burger',  unit_price:420, quantity:1, modifiers:[] },
      { menu_item_id:'5', item_name:'Pepperoni Feast',   unit_price:620, quantity:1, modifiers:[], special_note:'Well done crust' },
      { menu_item_id:'12', item_name:'Chicken Wings',    unit_price:380, quantity:1, modifiers:[] },
    ], total:1470, subtotal:1400, tax_amount:70, discount_amount:0, payment_status:'unpaid',
  },
  {
    id: 'k4', order_number: 'POS-260319-1040', table_number: 'T1',
    type: 'dine_in', status: 'ready', created_at: new Date(Date.now() - 1500000).toISOString(),
    items: [
      { menu_item_id:'10', item_name:'Chocolate Lava Cake', unit_price:250, quantity:2, modifiers:[] },
      { menu_item_id:'8',  item_name:'Fresh Lemonade',      unit_price:120, quantity:1, modifiers:[] },
    ], total:651, subtotal:620, tax_amount:31, discount_amount:0, payment_status:'unpaid',
  },
];

const NEXT_STATUS: Record<string, string> = {
  pending: 'cooking',
  cooking: 'ready',
};
const NEXT_LABEL: Record<string, string> = {
  pending: '▶ Start Cooking',
  cooking: '✓ Mark Ready',
};

export default function KitchenPage() {
  const [kdsOrders, setKdsOrders] = useState<KDSOrder[]>([]);
  const [filter, setFilter]       = useState<'all' | 'pending' | 'cooking' | 'ready'>('all');
  const [sound, setSound]         = useState(true);
  const { connected, on, emit }   = useSocket();

  // Build elapsed times
  const buildOrders = useCallback((raw: Partial<Order>[]): KDSOrder[] =>
    raw
      .filter(o => !['served','cancelled'].includes(o.status || ''))
      .map(o => ({
        ...o,
        elapsed: Math.floor((Date.now() - new Date(o.created_at || Date.now()).getTime()) / 1000),
      } as KDSOrder))
      .sort((a, b) => b.elapsed - a.elapsed),  // oldest first
  []);

  useEffect(() => {
    setKdsOrders(buildOrders(MOCK_KDS as Order[]));
    // Join kitchen socket room
    emit('join_kitchen');
    // Real API call:
    orders.getAll({ status: 'pending,confirmed,cooking,ready', limit: '50' })
      .then(d => setKdsOrders(buildOrders(d.orders)))
      .catch(() => {});
  }, []);

  // Tick elapsed every second
  useInterval(() => {
    setKdsOrders(prev => prev.map(o => ({ ...o, elapsed: o.elapsed + 1 })));
  }, 1000);

  // Real-time new orders
  useEffect(() => {
    const off = on('new_order', (_ev) => {
      orders.getAll({ status: 'pending,confirmed,cooking,ready', limit: '50' })
        .then(d => setKdsOrders(buildOrders(d.orders)))
        .catch(() => {});
    });
    return off;
  }, [on]);

  const advance = async (order: KDSOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await orders.updateStatus(order.id, next);
    } catch {}
    setKdsOrders(prev =>
      next === 'ready'
        ? prev.map(o => o.id === order.id ? { ...o, status: next } : o)
        : prev.map(o => o.id === order.id ? { ...o, status: next } : o)
    );
  };

  const dismiss = (id: string) => {
    setKdsOrders(prev => prev.filter(o => o.id !== id));
  };

  const displayed = kdsOrders.filter(o => filter === 'all' || o.status === filter);
  const counts = {
    pending: kdsOrders.filter(o => o.status === 'pending').length,
    cooking: kdsOrders.filter(o => o.status === 'cooking').length,
    ready:   kdsOrders.filter(o => o.status === 'ready').length,
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* KDS Header */}
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900">
        <div>
          <h1 className="text-white font-black text-lg leading-none">Kitchen Display</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Real-time order queue</p>
        </div>

        {/* Live indicator */}
        <div className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ml-2',
          connected
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        )}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-400 animate-pulse' : 'bg-red-400')} />
          {connected ? 'Live' : 'Offline'}
        </div>

        {/* Status counts */}
        <div className="flex gap-3 ml-2">
          {[
            { key: 'pending', label: 'Pending',  color: 'text-yellow-400' },
            { key: 'cooking', label: 'Cooking',  color: 'text-orange-400' },
            { key: 'ready',   label: 'Ready',    color: 'text-green-400'  },
          ].map(({ key, label, color }) => (
            <div key={key} className="text-center">
              <p className={clsx('text-2xl font-black leading-none', color)}>{counts[key as keyof typeof counts]}</p>
              <p className="text-zinc-600 text-[10px]">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1 ml-auto bg-zinc-800 rounded-lg p-1">
          {(['all','pending','cooking','ready'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all',
                filter === f ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              )}
            >{f === 'all' ? `All (${kdsOrders.length})` : f}</button>
          ))}
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => setSound(s => !s)}
          className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            sound
              ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-600'
          )}
        >
          {sound ? '🔔 Sound' : '🔕 Muted'}
        </button>
      </div>

      {/* KDS Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-3">
            <span className="text-6xl">👨‍🍳</span>
            <p className="text-lg font-semibold">Kitchen is clear!</p>
            <p className="text-sm">No active orders in this view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
            {displayed.map(order => {
              const urgency  = URGENCY(order.elapsed);
              const next     = NEXT_STATUS[order.status];
              const isReady  = order.status === 'ready';

              return (
                <div
                  key={order.id}
                  className={clsx(
                    'rounded-2xl border-2 flex flex-col overflow-hidden transition-all duration-300',
                    URGENCY_STYLES[urgency]
                  )}
                >
                  {/* Card header */}
                  <div className={clsx('px-4 py-3 flex items-start justify-between', URGENCY_HEADER[urgency])}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', URGENCY_DOT[urgency])} />
                        <span className="font-black text-sm font-mono">{order.order_number}</span>
                      </div>
                      <div className="text-xs opacity-70 mt-0.5 pl-4">
                        {order.table_number ? `Table ${order.table_number}` : order.type?.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={clsx(
                        'text-lg font-black tabular-nums',
                        urgency === 'critical' ? 'text-red-400' :
                        urgency === 'urgent'   ? 'text-orange-400' :
                        urgency === 'warn'     ? 'text-yellow-400' : 'text-zinc-300'
                      )}>
                        {fmtTime(order.elapsed)}
                      </div>
                      <div className="text-[10px] opacity-60">elapsed</div>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="flex-1 px-4 py-3 space-y-2">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className={clsx(
                          'flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-black',
                          'bg-zinc-800 text-amber-400'
                        )}>{item.quantity}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium leading-tight">{item.item_name}</p>
                          {item.special_note && (
                            <p className="text-amber-400/80 text-xs mt-0.5 italic">
                              ✎ {item.special_note}
                            </p>
                          )}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-zinc-500 text-xs mt-0.5">
                              +{item.modifiers.map(m => m.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card footer / actions */}
                  <div className="px-4 pb-4 pt-2 flex gap-2">
                    {isReady ? (
                      <button
                        onClick={() => dismiss(order.id)}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                      >
                        ✓ Served — Dismiss
                      </button>
                    ) : next ? (
                      <button
                        onClick={() => advance(order)}
                        className={clsx(
                          'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95',
                          order.status === 'pending'
                            ? 'bg-orange-600 hover:bg-orange-500 text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        )}
                      >
                        {NEXT_LABEL[order.status]}
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
