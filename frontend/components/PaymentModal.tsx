'use client';
import { useState } from 'react';
import { orders } from '@/lib/api';
import type { Order } from '@/lib/api';
import { clsx } from 'clsx';

interface Props {
  order: Order;
  onSuccess: (paidOrder: Order) => void;
  onClose: () => void;
}

type Method = 'cash' | 'card' | 'bkash' | 'rocket' | 'nagad' | 'split';

const METHODS: { id: Method; label: string; icon: string }[] = [
  { id: 'cash',   label: 'Cash',   icon: '💵' },
  { id: 'card',   label: 'Card',   icon: '💳' },
  { id: 'bkash',  label: 'bKash',  icon: '📱' },
  { id: 'rocket', label: 'Rocket', icon: '🚀' },
  { id: 'nagad',  label: 'Nagad',  icon: '📲' },
  { id: 'split',  label: 'Split',  icon: '✂️'  },
];

export default function PaymentModal({ order, onSuccess, onClose }: Props) {
  const [method, setMethod]         = useState<Method>('cash');
  const [discountCode, setDiscount] = useState('');
  const [reference, setReference]   = useState('');
  const [cashTendered, setCash]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [discountApplied, setDiscApplied] = useState<number>(0);

  const total       = Number(order.total) - discountApplied;
  const cashBack    = cashTendered ? Math.max(0, parseFloat(cashTendered) - total) : 0;
  const needsRef    = ['bkash','rocket','nagad','card'].includes(method);
  const needsCash   = method === 'cash';
  const canProcess  = !needsRef || reference.trim().length > 0;

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    // Simulate discount lookup — in production this hits /api/discounts/validate
    const mockDiscounts: Record<string, number> = {
      'SAVE10': order.subtotal * 0.1,
      'FLAT50': 50,
      'WELCOME': order.subtotal * 0.15,
    };
    const disc = mockDiscounts[discountCode.toUpperCase()];
    if (disc) {
      setDiscApplied(Math.round(disc));
      setError('');
    } else {
      setError('Invalid or expired discount code');
      setDiscApplied(0);
    }
  };

  const handlePay = async () => {
    if (!canProcess) { setError('Please enter transaction reference'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await orders.processPayment(order.id, {
        method,
        amount: total,
        discount_code: discountCode || undefined,
        reference: reference || undefined,
      });
      onSuccess(res.order);
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Process Payment</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-mono">{order.order_number}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto">
          {/* Order summary */}
          <div className="px-6 py-4 bg-zinc-900/50 border-b border-zinc-900">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span><span>৳{Number(order.subtotal).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-400">
                <span>VAT (5%)</span><span>৳{Number(order.tax_amount).toFixed(0)}</span>
              </div>
              {discountApplied > 0 && (
                <div className="flex justify-between text-sm text-green-400">
                  <span>Discount ({discountCode})</span><span>−৳{discountApplied}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
                <span>Total Due</span>
                <span className="text-amber-400">৳{total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Discount code */}
            <div>
              <label className="text-zinc-400 text-xs font-medium block mb-1.5">Discount Code (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SAVE10"
                  value={discountCode}
                  onChange={e => { setDiscount(e.target.value.toUpperCase()); setDiscApplied(0); }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm uppercase tracking-widest focus:outline-none focus:border-amber-500/50 placeholder-zinc-700"
                />
                <button
                  onClick={applyDiscount}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-all"
                >Apply</button>
              </div>
              {discountApplied > 0 && (
                <p className="text-green-400 text-xs mt-1">✓ Saved ৳{discountApplied}</p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="text-zinc-400 text-xs font-medium block mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setReference(''); setCash(''); }}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all',
                      method === m.id
                        ? 'bg-amber-500/10 border-amber-500/60 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    )}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash tendered */}
            {needsCash && (
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Cash Tendered (৳)</label>
                <input
                  type="number"
                  placeholder={`Min ৳${total.toFixed(0)}`}
                  value={cashTendered}
                  onChange={e => setCash(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
                {cashTendered && parseFloat(cashTendered) >= total && (
                  <div className="mt-2 flex justify-between text-sm font-semibold">
                    <span className="text-zinc-400">Change</span>
                    <span className="text-green-400">৳{cashBack.toFixed(0)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Mobile/Card reference */}
            {needsRef && (
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">
                  {method === 'card' ? 'Last 4 digits / Auth code' : 'Transaction ID'}
                </label>
                <input
                  type="text"
                  placeholder={method === 'card' ? 'e.g. AUTH123456' : 'e.g. 8OP5E7K2'}
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono uppercase"
                />
              </div>
            )}

            {/* Split payment note */}
            {method === 'split' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-blue-400 text-xs">
                For split payments, record the cash portion now and process each mobile payment separately as individual transactions.
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-semibold transition-all"
          >Cancel</button>
          <button
            onClick={handlePay}
            disabled={loading || !canProcess}
            className="flex-2 flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-xl text-sm font-black transition-all active:scale-95"
          >
            {loading ? 'Processing…' : `Collect ৳${total.toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
