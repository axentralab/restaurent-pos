'use client';
import { useEffect, useState } from 'react';
import { inventory } from '@/lib/api';
import type { Ingredient } from '@/lib/api';
import { clsx } from 'clsx';

const MOCK_INGREDIENTS: Ingredient[] = [
  { id:1,  name:'Chicken Breast',    unit:'kg',    quantity:12.5, threshold_alert:5,   cost_per_unit:320,  supplier:'Fresh Farm BD' },
  { id:2,  name:'Beef Mince',        unit:'kg',    quantity:8.2,  threshold_alert:5,   cost_per_unit:450,  supplier:'Agora Meat' },
  { id:3,  name:'Pizza Dough',       unit:'pcs',   quantity:40,   threshold_alert:20,  cost_per_unit:45,   supplier:'Local Bakery' },
  { id:4,  name:'Mozzarella',        unit:'kg',    quantity:3.1,  threshold_alert:3,   cost_per_unit:780,  supplier:'Milk Vita' },
  { id:5,  name:'Tomato Sauce',      unit:'litre', quantity:9,    threshold_alert:3,   cost_per_unit:120,  supplier:'Pran Foods' },
  { id:6,  name:'Burger Buns',       unit:'pcs',   quantity:85,   threshold_alert:30,  cost_per_unit:12,   supplier:'Golden Bakery' },
  { id:7,  name:'Spaghetti',         unit:'kg',    quantity:6.4,  threshold_alert:2,   cost_per_unit:95,   supplier:'Imported' },
  { id:8,  name:'Fresh Lemons',      unit:'kg',    quantity:2.8,  threshold_alert:2,   cost_per_unit:80,   supplier:'Karwan Bazar' },
  { id:9,  name:'Coffee Beans',      unit:'kg',    quantity:1.2,  threshold_alert:1,   cost_per_unit:1200, supplier:'Roaster BD' },
  { id:10, name:'Chocolate',         unit:'kg',    quantity:0.8,  threshold_alert:1,   cost_per_unit:650,  supplier:'Imported' },
  { id:11, name:'French Fries (frozen)', unit:'kg', quantity:15, threshold_alert:5,   cost_per_unit:180,  supplier:'Pran Foods' },
  { id:12, name:'Pepperoni',         unit:'kg',    quantity:2.1,  threshold_alert:2,   cost_per_unit:950,  supplier:'Imported' },
];

interface RestockModal { ingredient: Ingredient; qty: string; }

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(MOCK_INGREDIENTS);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [search, setSearch]           = useState('');
  const [restock, setRestock]         = useState<RestockModal | null>(null);
  const [restockLoading, setRestockLoading] = useState(false);
  const [addModal, setAddModal]       = useState(false);
  const [newItem, setNewItem]         = useState({ name:'', unit:'kg', quantity:'', threshold_alert:'', cost_per_unit:'', supplier:'' });

  useEffect(() => {
    inventory.getAll(showLowOnly ? { low_stock: 'true' } : {})
      .then(d => setIngredients(d.ingredients))
      .catch(() => {});
  }, [showLowOnly]);

  const displayed = ingredients.filter(i =>
    search === '' || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = ingredients.filter(i => i.quantity <= i.threshold_alert).length;

  const handleRestock = async () => {
    if (!restock || !restock.qty) return;
    setRestockLoading(true);
    try {
      await inventory.restock(restock.ingredient.id, parseFloat(restock.qty));
      setIngredients(prev =>
        prev.map(i => i.id === restock.ingredient.id
          ? { ...i, quantity: i.quantity + parseFloat(restock.qty) }
          : i
        )
      );
      setRestock(null);
    } catch {
      // Optimistic update for demo
      setIngredients(prev =>
        prev.map(i => i.id === restock.ingredient.id
          ? { ...i, quantity: i.quantity + parseFloat(restock.qty) }
          : i
        )
      );
      setRestock(null);
    } finally {
      setRestockLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      await inventory.create({
        name: newItem.name, unit: newItem.unit,
        quantity: parseFloat(newItem.quantity) || 0,
        threshold_alert: parseFloat(newItem.threshold_alert) || 0,
        cost_per_unit: parseFloat(newItem.cost_per_unit) || 0,
        supplier: newItem.supplier,
      });
      setIngredients(prev => [...prev, {
        id: Date.now(), ...newItem,
        quantity: parseFloat(newItem.quantity) || 0,
        threshold_alert: parseFloat(newItem.threshold_alert) || 0,
        cost_per_unit: parseFloat(newItem.cost_per_unit) || 0,
      }]);
      setAddModal(false);
      setNewItem({ name:'', unit:'kg', quantity:'', threshold_alert:'', cost_per_unit:'', supplier:'' });
    } catch {
      alert('Failed to add item');
    }
  };

  const stockLevel = (i: Ingredient) => {
    if (i.quantity === 0) return 'empty';
    if (i.quantity <= i.threshold_alert) return 'low';
    if (i.quantity <= i.threshold_alert * 2) return 'medium';
    return 'ok';
  };

  const STOCK_COLORS = {
    empty:  'text-red-500',
    low:    'text-orange-400',
    medium: 'text-yellow-400',
    ok:     'text-green-400',
  };

  return (
    <div className="p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Inventory</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{ingredients.length} ingredients tracked</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-all active:scale-95"
        >+ Add Ingredient</button>
      </div>

      {/* Alert bar */}
      {lowCount > 0 && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
          <span className="text-orange-400 text-lg kot-pulse">⚠️</span>
          <div>
            <p className="text-orange-400 font-semibold text-sm">{lowCount} item{lowCount > 1 ? 's' : ''} running low</p>
            <p className="text-orange-400/60 text-xs">Restock to avoid menu unavailability</p>
          </div>
          <button
            onClick={() => setShowLowOnly(!showLowOnly)}
            className="ml-auto text-xs text-orange-400 underline underline-offset-2"
          >
            {showLowOnly ? 'Show all' : 'Show only low'}
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search ingredients…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
      />

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">Ingredient</th>
              <th className="text-left px-4 py-3 font-medium">Stock</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Alert At</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Supplier</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Cost/Unit</th>
              <th className="text-right px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {displayed.map(ing => {
              const level = stockLevel(ing);
              const pct = Math.min(100, ing.threshold_alert > 0 ? (ing.quantity / (ing.threshold_alert * 3)) * 100 : 100);
              return (
                <tr key={ing.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium text-sm">{ing.name}</p>
                    <p className="text-zinc-600 text-xs">{ing.unit}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx('font-semibold text-sm', STOCK_COLORS[level])}>
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-20 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all',
                          level === 'ok' ? 'bg-green-500' :
                          level === 'medium' ? 'bg-yellow-400' :
                          level === 'low' ? 'bg-orange-400' : 'bg-red-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                    {ing.threshold_alert} {ing.unit}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">
                    {ing.supplier || '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                    ৳{ing.cost_per_unit}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setRestock({ ingredient: ing, qty: '' })}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-400 hover:text-black rounded-lg text-xs font-semibold transition-all"
                    >Restock</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {restock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-1">Restock: {restock.ingredient.name}</h3>
            <p className="text-zinc-500 text-xs mb-4">Current: {restock.ingredient.quantity} {restock.ingredient.unit}</p>
            <label className="text-zinc-400 text-xs block mb-1.5">Quantity to add ({restock.ingredient.unit})</label>
            <input
              type="number"
              value={restock.qty}
              onChange={e => setRestock({ ...restock, qty: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 mb-4"
              placeholder="e.g. 10"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setRestock(null)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button onClick={handleRestock} disabled={restockLoading || !restock.qty} className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {restockLoading ? 'Saving…' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-white font-bold">Add Ingredient</h3>
            {[
              { label:'Name',         key:'name',            type:'text',   placeholder:'e.g. Chicken Breast' },
              { label:'Unit',         key:'unit',            type:'text',   placeholder:'kg / litre / pcs' },
              { label:'Initial Qty',  key:'quantity',        type:'number', placeholder:'0' },
              { label:'Alert Threshold', key:'threshold_alert', type:'number', placeholder:'5' },
              { label:'Cost per Unit (৳)', key:'cost_per_unit', type:'number', placeholder:'0' },
              { label:'Supplier',     key:'supplier',        type:'text',   placeholder:'Optional' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-zinc-400 text-xs block mb-1">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(newItem as any)[key]}
                  onChange={e => setNewItem(n => ({ ...n, [key]: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAddModal(false)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={handleAddItem} disabled={!newItem.name} className="flex-1 py-2 bg-amber-500 text-black rounded-xl text-sm font-bold disabled:opacity-50">
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
