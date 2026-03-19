'use client';
import { MenuItem, OrderItem } from '@/lib/api';
import { clsx } from 'clsx';

export interface CartItem extends OrderItem {
  item: MenuItem;
}

interface Props {
  items: CartItem[];
  onUpdate: (menuItemId: string, qty: number) => void;
  onRemove: (menuItemId: string) => void;
  onCheckout: () => void;
  tableNumber?: string;
  loading?: boolean;
}

export default function Cart({ items, onUpdate, onRemove, onCheckout, tableNumber, loading }: Props) {
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax      = subtotal * 0.05;
  const total    = subtotal + tax;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">Current Order</h2>
          {tableNumber && <p className="text-zinc-500 text-xs">Table {tableNumber}</p>}
        </div>
        <span className="bg-zinc-800 text-amber-400 text-xs px-2 py-1 rounded-full font-semibold">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700 select-none">
            <span className="text-4xl">🛒</span>
            <p className="text-sm">Add items from the menu</p>
          </div>
        ) : (
          items.map((ci) => (
            <div key={ci.menu_item_id} className="px-4 py-2.5 border-b border-zinc-900 group hover:bg-zinc-900/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{ci.item_name}</p>
                  <p className="text-amber-400 text-xs mt-0.5">৳{(ci.unit_price * ci.quantity).toFixed(0)}</p>
                </div>
                <button
                  onClick={() => onRemove(ci.menu_item_id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all ml-1"
                >✕</button>
              </div>
              {/* Qty stepper */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => onUpdate(ci.menu_item_id, ci.quantity - 1)}
                  className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm flex items-center justify-center transition-colors"
                >−</button>
                <span className="text-white text-xs w-4 text-center font-semibold">{ci.quantity}</span>
                <button
                  onClick={() => onUpdate(ci.menu_item_id, ci.quantity + 1)}
                  className="w-6 h-6 rounded bg-zinc-800 hover:bg-amber-500 hover:text-black text-white text-sm flex items-center justify-center transition-colors"
                >+</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals + Checkout */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950">
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Subtotal</span><span>৳{subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>VAT (5%)</span><span>৳{tax.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm text-white font-bold pt-1 border-t border-zinc-800 mt-1">
            <span>Total</span><span className="text-amber-400">৳{total.toFixed(0)}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          className={clsx(
            'w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all',
            items.length > 0 && !loading
              ? 'bg-amber-500 hover:bg-amber-400 text-black active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
        >
          {loading ? 'Placing Order…' : 'Place Order →'}
        </button>
      </div>
    </div>
  );
}
