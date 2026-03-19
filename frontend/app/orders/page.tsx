'use client';
import { useEffect, useState } from 'react';
import { orders } from '@/lib/api';
import type { Order } from '@/lib/api';
import { clsx } from 'clsx';

const STATUSES = ['all','pending','confirmed','cooking','ready','served','cancelled'] as const;
type StatusFilter = typeof STATUSES[number];

const SP: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-900/40',
  confirmed: 'bg-blue-500/20   text-blue-400   border-blue-900/40',
  cooking:   'bg-orange-500/20 text-orange-400 border-orange-900/40',
  ready:     'bg-green-500/20  text-green-400  border-green-900/40',
  served:    'bg-zinc-500/20   text-zinc-400   border-zinc-700/40',
  cancelled: 'bg-red-500/20    text-red-400    border-red-900/40',
};
const NS: Record<string, string> = {
  pending:'confirmed', confirmed:'cooking', cooking:'ready', ready:'served'
};

const MOCK: Order[] = [
  { id:'o1', order_number:'POS-260319-1042', table_number:'T3', table_id:3, type:'dine_in',  status:'cooking',   payment_status:'unpaid', total:1040, subtotal:990,  tax_amount:50, discount_amount:0, items:[], waiter_name:'Rahim', created_at: new Date(Date.now()-600000).toISOString() },
  { id:'o2', order_number:'POS-260319-1041', table_number:'T7', table_id:7, type:'dine_in',  status:'pending',   payment_status:'unpaid', total:780,  subtotal:743,  tax_amount:37, discount_amount:0, items:[], waiter_name:'Sumon', created_at: new Date(Date.now()-900000).toISOString() },
  { id:'o3', order_number:'POS-260319-1040', table_number:'T1', table_id:1, type:'dine_in',  status:'ready',     payment_status:'unpaid', total:1380, subtotal:1314, tax_amount:66, discount_amount:0, items:[], waiter_name:'Rahim', created_at: new Date(Date.now()-1200000).toISOString() },
  { id:'o4', order_number:'POS-260319-1038', table_number:'',  table_id:undefined, type:'takeaway', status:'served', payment_status:'paid', total:560, subtotal:533, tax_amount:27, discount_amount:0, items:[], created_at: new Date(Date.now()-3600000).toISOString() },
];

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>(MOCK);
  const [filter, setFilter]       = useState<StatusFilter>('all');
  const [selected, setSelected]   = useState<Order | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false); // mobile detail toggle

  useEffect(() => {
    orders.getAll({ limit:'50' }).then(d => setAllOrders(d.orders)).catch(() => {});
  }, []);

  const displayed = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);

  const advanceOrder = async (order: Order, newStatus: string) => {
    setUpdating(order.id);
    try { await orders.updateStatus(order.id, newStatus); } catch {}
    setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    setSelected(o => o?.id === order.id ? { ...o, status: newStatus } : o);
    setUpdating(null);
  };

  const selectOrder = (order: Order) => {
    setSelected(order);
    setShowDetail(true);
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* List panel */}
      <div className={clsx(
        'flex flex-col border-r border-zinc-800 overflow-hidden',
        showDetail ? 'hidden md:flex md:w-72 lg:w-80' : 'flex flex-1 md:flex-none md:w-72 lg:w-80'
      )}>
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white font-bold text-base">Orders</h1>
            <span className="text-zinc-500 text-xs">{displayed.length}</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all',
                  filter === s ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                )}>{s}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {displayed.map(order => (
            <div key={order.id} onClick={() => selectOrder(order)}
              className={clsx('px-4 py-3 cursor-pointer hover:bg-zinc-900/50 transition-colors',
                selected?.id === order.id && 'bg-zinc-900 border-l-2 border-amber-500'
              )}>
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-white text-xs font-mono font-semibold">{order.order_number}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {order.table_number ? `Table ${order.table_number}` : order.type.replace('_',' ')}
                    {order.waiter_name ? ` · ${order.waiter_name}` : ''}
                  </p>
                </div>
                <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide h-fit', SP[order.status])}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-zinc-600 text-xs">
                  {Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)}m ago
                </span>
                <span className="text-amber-400 text-xs font-semibold">৳{Number(order.total).toFixed(0)}</span>
              </div>
            </div>
          ))}
          {displayed.length === 0 && (
            <div className="py-16 text-center text-zinc-600"><p className="text-2xl mb-2">📋</p><p className="text-sm">No orders</p></div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className={clsx(
        'flex flex-col overflow-hidden bg-zinc-950',
        showDetail ? 'flex flex-1' : 'hidden md:flex md:flex-1'
      )}>
        {selected ? (
          <>
            <div className="px-4 lg:px-6 py-4 border-b border-zinc-800 flex items-start gap-3">
              {/* Mobile back */}
              <button onClick={() => setShowDetail(false)} className="md:hidden text-zinc-500 hover:text-white text-sm mt-0.5">←</button>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm font-mono">{selected.order_number}</p>
                    <p className="text-zinc-500 text-xs mt-0.5 capitalize">
                      {selected.type.replace('_',' ')}
                      {selected.table_number ? ` · Table ${selected.table_number}` : ''}
                    </p>
                  </div>
                  <span className={clsx('text-[10px] px-2 py-1 rounded-full border font-bold uppercase', SP[selected.status])}>
                    {selected.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { l:'Subtotal', v:`৳${Number(selected.subtotal).toFixed(0)}` },
                  { l:'VAT',      v:`৳${Number(selected.tax_amount).toFixed(0)}` },
                  { l:'Discount', v:`৳${Number(selected.discount_amount).toFixed(0)}` },
                  { l:'Total',    v:`৳${Number(selected.total).toFixed(0)}`, accent: true },
                ].map(({ l, v, accent }) => (
                  <div key={l} className="bg-zinc-900 rounded-lg p-3">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-wider">{l}</p>
                    <p className={clsx('font-semibold text-sm mt-0.5', accent ? 'text-amber-400' : 'text-white')}>{v}</p>
                  </div>
                ))}
              </div>
              <div className={clsx('px-3 py-2 rounded-lg text-xs font-semibold flex justify-between',
                selected.payment_status === 'paid'
                  ? 'bg-green-500/10 text-green-400 border border-green-900/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-900/30'
              )}>
                <span>Payment: {selected.payment_status}</span>
                {selected.payment_status !== 'paid' && <span className="opacity-60">Cash / bKash / Card</span>}
              </div>
            </div>

            <div className="px-4 lg:px-6 pb-4 pt-3 border-t border-zinc-800 space-y-2">
              {NS[selected.status] && (
                <button onClick={() => advanceOrder(selected, NS[selected.status])}
                  disabled={updating === selected.id}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50">
                  {updating === selected.id ? 'Updating…' : `Mark as ${NS[selected.status]} →`}
                </button>
              )}
              {!['cancelled','served'].includes(selected.status) && (
                <button onClick={() => advanceOrder(selected, 'cancelled')}
                  className="w-full py-2 bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-900 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-all">
                  Cancel Order
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-2">
            <span className="text-5xl">📋</span>
            <p className="text-sm">Select an order</p>
          </div>
        )}
      </div>
    </div>
  );
}
