'use client';
import { useEffect, useState } from 'react';
import { orders } from '@/lib/api';
import type { Order } from '@/lib/api';
import { clsx } from 'clsx';

const STATUSES = ['all','pending','confirmed','cooking','ready','served','cancelled'] as const;
type StatusFilter = typeof STATUSES[number];

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-900/40',
  confirmed: 'bg-blue-500/20   text-blue-400   border-blue-900/40',
  cooking:   'bg-orange-500/20 text-orange-400 border-orange-900/40',
  ready:     'bg-green-500/20  text-green-400  border-green-900/40',
  served:    'bg-zinc-500/20   text-zinc-400   border-zinc-700/40',
  cancelled: 'bg-red-500/20    text-red-400    border-red-900/40',
};

const NEXT_STATUS: Record<string, string> = {
  pending:   'confirmed',
  confirmed: 'cooking',
  cooking:   'ready',
  ready:     'served',
};

const MOCK_ORDERS: Order[] = [
  { id:'1', order_number:'POS-260319-1042', table_number:'T3', table_id:3, type:'dine_in',  status:'cooking',   payment_status:'unpaid', total:1040, subtotal:990,  tax_amount:50,  discount_amount:0, items:[], waiter_name:'Rahim', created_at: new Date(Date.now()-600000).toISOString() },
  { id:'2', order_number:'POS-260319-1041', table_number:'T7', table_id:7, type:'dine_in',  status:'pending',   payment_status:'unpaid', total:780,  subtotal:743,  tax_amount:37,  discount_amount:0, items:[], waiter_name:'Sumon', created_at: new Date(Date.now()-900000).toISOString() },
  { id:'3', order_number:'POS-260319-1040', table_number:'T1', table_id:1, type:'dine_in',  status:'ready',     payment_status:'unpaid', total:1380, subtotal:1314, tax_amount:66,  discount_amount:0, items:[], waiter_name:'Rahim', created_at: new Date(Date.now()-1200000).toISOString() },
  { id:'4', order_number:'POS-260319-1038', table_number:'',   table_id:undefined, type:'takeaway', status:'served', payment_status:'paid', total:560, subtotal:533, tax_amount:27, discount_amount:0, items:[], waiter_name:'Admin',  created_at: new Date(Date.now()-3600000).toISOString() },
  { id:'5', order_number:'POS-260319-1037', table_number:'T5', table_id:5, type:'dine_in',  status:'served',    payment_status:'paid',   total:2100, subtotal:2000, tax_amount:100, discount_amount:0, items:[], waiter_name:'Sumon', created_at: new Date(Date.now()-7200000).toISOString() },
  { id:'6', order_number:'POS-260319-1036', table_number:'',   table_id:undefined, type:'delivery', status:'cancelled', payment_status:'unpaid', total:690, subtotal:657, tax_amount:33, discount_amount:0, items:[], waiter_name:'Admin', created_at: new Date(Date.now()-10800000).toISOString() },
];

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>(MOCK_ORDERS);
  const [filter, setFilter]       = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = { limit: '50' };
    if (filter !== 'all') params.status = filter;
    orders.getAll(params)
      .then(d => setAllOrders(d.orders))
      .catch(() => {});
  }, [filter]);

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    setUpdating(order.id);
    try {
      await orders.updateStatus(order.id, newStatus);
      setAllOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o)
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(o => o ? { ...o, status: newStatus } : null);
      }
    } catch (err: any) {
      // Optimistic update for demo
      setAllOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o)
      );
    } finally {
      setUpdating(null);
    }
  };

  const displayed = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);

  return (
    <div className="flex h-full">
      {/* Order List */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-bold text-lg">Orders</h1>
            <span className="text-zinc-500 text-xs">{displayed.length} orders</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all',
                  filter === s ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                )}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {displayed.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={clsx(
                'px-4 py-3 cursor-pointer hover:bg-zinc-900/50 transition-colors',
                selectedOrder?.id === order.id && 'bg-zinc-900 border-l-2 border-amber-500'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white text-xs font-mono font-semibold">{order.order_number}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {order.table_number ? `Table ${order.table_number}` : order.type.replace('_',' ')}
                    {order.waiter_name ? ` · ${order.waiter_name}` : ''}
                  </p>
                </div>
                <span className={clsx(
                  'text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide flex-shrink-0',
                  STATUS_COLORS[order.status]
                )}>{order.status}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-zinc-600 text-xs">
                  {Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)}m ago
                </span>
                <span className="text-amber-400 text-xs font-semibold">৳{Number(order.total).toFixed(0)}</span>
              </div>
            </div>
          ))}
          {displayed.length === 0 && (
            <div className="py-16 text-center text-zinc-600">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm">No orders found</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail */}
      <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col bg-zinc-950">
        {selectedOrder ? (
          <>
            <div className="px-5 py-4 border-b border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold text-sm font-mono">{selectedOrder.order_number}</p>
                  <p className="text-zinc-500 text-xs mt-0.5 capitalize">
                    {selectedOrder.type.replace('_',' ')}
                    {selectedOrder.table_number ? ` · Table ${selectedOrder.table_number}` : ''}
                  </p>
                </div>
                <span className={clsx(
                  'text-[10px] px-2 py-1 rounded-full border font-bold uppercase',
                  STATUS_COLORS[selectedOrder.status]
                )}>{selectedOrder.status}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Subtotal',  value: `৳${Number(selectedOrder.subtotal).toFixed(0)}` },
                  { label: 'VAT (5%)', value: `৳${Number(selectedOrder.tax_amount).toFixed(0)}` },
                  { label: 'Discount', value: `৳${Number(selectedOrder.discount_amount).toFixed(0)}` },
                  { label: 'Total',    value: `৳${Number(selectedOrder.total).toFixed(0)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-900 rounded-lg p-3">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-wider">{label}</p>
                    <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Payment status */}
              <div className={clsx(
                'px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between',
                selectedOrder.payment_status === 'paid'
                  ? 'bg-green-500/10 text-green-400 border border-green-900/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-900/30'
              )}>
                <span>Payment: {selectedOrder.payment_status}</span>
                {selectedOrder.payment_status !== 'paid' && (
                  <span className="text-[10px] opacity-70">Cash / Card / bKash</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-5 pt-3 border-t border-zinc-800 space-y-2">
              {NEXT_STATUS[selectedOrder.status] && (
                <button
                  onClick={() => handleStatusUpdate(selectedOrder, NEXT_STATUS[selectedOrder.status])}
                  disabled={updating === selectedOrder.id}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  {updating === selectedOrder.id ? 'Updating…' : `Mark as ${NEXT_STATUS[selectedOrder.status]} →`}
                </button>
              )}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'served' && (
                <button
                  onClick={() => handleStatusUpdate(selectedOrder, 'cancelled')}
                  className="w-full py-2 bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-900 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-2">
            <span className="text-5xl">📋</span>
            <p className="text-sm">Select an order to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
