'use client';
import { useRef } from 'react';
import type { Order } from '@/lib/api';

interface Props {
  order: Order;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = ref.current?.innerHTML || '';
    const w = window.open('', '_blank', 'width=400,height=650');
    if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${order.order_number}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:monospace;font-size:12px;color:#000;background:#fff;padding:20px;width:300px}
        .center{text-align:center} .right{text-align:right} .bold{font-weight:bold}
        .line{border-top:1px dashed #999;margin:8px 0}
        .row{display:flex;justify-content:space-between;padding:2px 0}
        .big{font-size:14px;font-weight:bold}
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const date = new Date(order.created_at);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold transition-all"
            >🖨 Print</button>
            <button onClick={onClose} className="text-zinc-600 hover:text-white text-lg">✕</button>
          </div>
        </div>

        {/* Receipt */}
        <div className="overflow-y-auto p-4">
          <div
            ref={ref}
            className="bg-white text-zinc-900 rounded-xl p-5 font-mono text-xs leading-relaxed max-w-xs mx-auto"
          >
            {/* Header */}
            <div className="center bold" style={{ textAlign: 'center', fontWeight: 'bold' }}>
              <p style={{ fontSize: 16, marginBottom: 2 }}>🍔 foodashh</p>
              <p>Restaurant & Café</p>
              <p style={{ color: '#666', fontSize: 10, marginTop: 2 }}>foodashh.vercel.app</p>
            </div>

            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice #</span><span style={{ fontWeight: 'bold' }}>{order.order_number}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date</span>
              <span>{date.toLocaleDateString('en-BD', { day:'2-digit', month:'short', year:'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Time</span><span>{date.toLocaleTimeString('en-BD', { hour:'2-digit', minute:'2-digit' })}</span>
            </div>
            {order.table_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Table</span><span>{order.table_number}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Type</span><span style={{ textTransform: 'capitalize' }}>{order.type?.replace('_', ' ')}</span>
            </div>
            {order.waiter_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Staff</span><span>{order.waiter_name}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />

            {/* Items */}
            {(order.items || []).map((item, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span style={{ flex: 1, marginRight: 4 }}>{item.item_name}</span>
                  <span>৳{(item.unit_price * item.quantity).toFixed(0)}</span>
                </div>
                <div style={{ color: '#666', paddingLeft: 8 }}>
                  {item.quantity} × ৳{item.unit_price.toFixed(0)}
                  {item.special_note ? ` — ${item.special_note}` : ''}
                </div>
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span><span>৳{Number(order.subtotal).toFixed(0)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'green' }}>
                <span>Discount</span><span>−৳{Number(order.discount_amount).toFixed(0)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>VAT (5%)</span><span>৳{Number(order.tax_amount).toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14, marginTop: 4 }}>
              <span>TOTAL</span><span>৳{Number(order.total).toFixed(0)}</span>
            </div>

            {order.payment_method && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Paid via</span>
                <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{order.payment_method}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }} />

            <p style={{ textAlign: 'center', color: '#666', fontSize: 10 }}>
              Thank you for dining with us!<br />
              Visit again soon 🙏
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
