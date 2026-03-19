'use client';
import { useEffect, useState } from 'react';
import { inventory } from '@/lib/api';
import type { Ingredient } from '@/lib/api';
import { clsx } from 'clsx';

const MOCK: Ingredient[] = [
  {id:1,name:'Chicken Breast',unit:'kg',quantity:12.5,threshold_alert:5,cost_per_unit:320,supplier:'Fresh Farm BD'},
  {id:2,name:'Beef Mince',unit:'kg',quantity:8.2,threshold_alert:5,cost_per_unit:450,supplier:'Agora Meat'},
  {id:3,name:'Pizza Dough',unit:'pcs',quantity:40,threshold_alert:20,cost_per_unit:45,supplier:'Local Bakery'},
  {id:4,name:'Mozzarella',unit:'kg',quantity:3.1,threshold_alert:3,cost_per_unit:780,supplier:'Milk Vita'},
  {id:5,name:'Tomato Sauce',unit:'litre',quantity:9,threshold_alert:3,cost_per_unit:120,supplier:'Pran Foods'},
  {id:6,name:'Burger Buns',unit:'pcs',quantity:85,threshold_alert:30,cost_per_unit:12,supplier:'Golden Bakery'},
  {id:7,name:'Spaghetti',unit:'kg',quantity:6.4,threshold_alert:2,cost_per_unit:95,supplier:'Imported'},
  {id:8,name:'Coffee Beans',unit:'kg',quantity:1.2,threshold_alert:1,cost_per_unit:1200,supplier:'Roaster BD'},
  {id:9,name:'Chocolate',unit:'kg',quantity:0.8,threshold_alert:1,cost_per_unit:650,supplier:'Imported'},
  {id:10,name:'French Fries',unit:'kg',quantity:15,threshold_alert:5,cost_per_unit:180,supplier:'Pran Foods'},
  {id:11,name:'Pepperoni',unit:'kg',quantity:2.1,threshold_alert:2,cost_per_unit:950,supplier:'Imported'},
  {id:12,name:'Lemons',unit:'kg',quantity:2.8,threshold_alert:2,cost_per_unit:80,supplier:'Karwan Bazar'},
];

interface Restock { ingredient: Ingredient; qty: string; }

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(MOCK);
  const [search, setSearch]   = useState('');
  const [restock, setRestock] = useState<Restock | null>(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    inventory.getAll().then(d => setIngredients(d.ingredients)).catch(()=>{});
  }, []);

  const displayed = ingredients.filter(i =>
    search === '' || i.name.toLowerCase().includes(search.toLowerCase())
  );
  const lowCount = ingredients.filter(i => i.quantity <= i.threshold_alert).length;

  const level = (i: Ingredient) => i.quantity <= i.threshold_alert ? 'low' : i.quantity <= i.threshold_alert * 2 ? 'mid' : 'ok';
  const LC: Record<string,string> = { low:'text-red-400', mid:'text-orange-400', ok:'text-green-400' };
  const BC: Record<string,string> = { low:'bg-red-500', mid:'bg-orange-400', ok:'bg-green-500' };

  const handleRestock = async () => {
    if (!restock || !restock.qty) return;
    setSaving(true);
    const qty = parseFloat(restock.qty);
    try { await inventory.restock(restock.ingredient.id, qty); } catch {}
    setIngredients(prev => prev.map(i => i.id === restock.ingredient.id ? { ...i, quantity: Math.round((i.quantity + qty) * 10) / 10 } : i));
    setRestock(null);
    setSaving(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white">Inventory</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{ingredients.length} ingredients tracked</p>
        </div>
        <button className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold transition-all">
          + Add
        </button>
      </div>

      {/* Alert */}
      {lowCount > 0 && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
          <span className="text-orange-400 text-base">⚠️</span>
          <div>
            <p className="text-orange-400 font-semibold text-sm">{lowCount} item{lowCount > 1 ? 's' : ''} running low</p>
            <p className="text-orange-400/60 text-xs">Restock soon</p>
          </div>
        </div>
      )}

      {/* Search */}
      <input type="text" placeholder="Search ingredients…" value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50" />

      {/* Table — scrollable on mobile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Ingredient</th>
                <th className="text-left px-4 py-3 font-medium">Stock</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Alert At</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Cost/Unit</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {displayed.map(ing => {
                const lv = level(ing);
                const pct = Math.min(100, ing.threshold_alert > 0 ? Math.round((ing.quantity / (ing.threshold_alert * 3)) * 100) : 100);
                return (
                  <tr key={ing.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium text-sm">{ing.name}</p>
                      <p className="text-zinc-600 text-xs">{ing.unit}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={clsx('font-semibold text-sm', LC[lv])}>{ing.quantity}</span>
                      </div>
                      <div className="mt-1 h-1 w-16 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full', BC[lv])} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{ing.threshold_alert} {ing.unit}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{ing.supplier || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">৳{ing.cost_per_unit}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setRestock({ ingredient: ing, qty: '' })}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-400 rounded-lg text-xs font-semibold transition-all">
                        Restock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-1">Restock: {restock.ingredient.name}</h3>
            <p className="text-zinc-500 text-xs mb-4">Current: {restock.ingredient.quantity} {restock.ingredient.unit}</p>
            <label className="text-zinc-400 text-xs block mb-1.5">Quantity to add</label>
            <input type="number" value={restock.qty} onChange={e => setRestock({ ...restock, qty: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 mb-4"
              placeholder="e.g. 10" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setRestock(null)} className="flex-1 py-2.5 bg-zinc-800 text-zinc-400 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={handleRestock} disabled={saving || !restock.qty}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
