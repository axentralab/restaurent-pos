'use client';
import { useEffect, useState } from 'react';
import { menu } from '@/lib/api';
import type { MenuItem, Category } from '@/lib/api';
import { clsx } from 'clsx';
import { useSearchParams } from 'next/navigation';

export default function MenuContent() {
  const params     = useSearchParams();
  const tableId    = params.get('table');
  const [items, setItems]         = useState<MenuItem[]>([]);
  const [cats, setCats]           = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState(0);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([menu.getAll(), menu.getCategories()])
      .then(([menuRes, catRes]) => {
        setItems(menuRes.items);
        setCats([{ id: 0, name: 'All', icon: '⊞', item_count: menuRes.items.length }, ...catRes.categories]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = items.filter(i =>
    (activeCat === 0 || i.category_id === activeCat) &&
    (search === '' || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-black text-xs">🍔</div>
            <div>
              <h1 className="text-white font-black text-base leading-none">foodashh</h1>
              {tableId && <p className="text-zinc-500 text-xs mt-0.5">Table {tableId} · Scan to order</p>}
            </div>
          </div>
          <input
            type="text"
            placeholder="Search dishes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto max-w-xl mx-auto">
          {cats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                activeCat === cat.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              )}
            >
              <span>{cat.icon}</span>{cat.name}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-zinc-600 py-16">Loading menu…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayed.map(item => (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="h-28 bg-zinc-800 flex items-center justify-center text-4xl relative">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : (item.category_name === 'Burgers' ? '🍔' :
                       item.category_name === 'Pizza'   ? '🍕' :
                       item.category_name === 'Pasta'   ? '🍝' :
                       item.category_name === 'Drinks'  ? '🥤' :
                       item.category_name === 'Desserts'? '🍰' : '🍽️')}
                  {item.is_featured && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Featured</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white font-semibold text-sm leading-snug">{item.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-amber-400 font-black text-base">৳{item.price.toFixed(0)}</span>
                    <span className="text-zinc-600 text-[10px]">~{item.prep_time_min}min</span>
                  </div>
                </div>
              </div>
            ))}
            {displayed.length === 0 && !loading && (
              <div className="col-span-2 text-center py-16 text-zinc-600">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">No items found</p>
              </div>
            )}
          </div>
        )}
        <p className="text-center text-zinc-700 text-xs mt-8 pb-4">
          Powered by foodashh POS
        </p>
      </div>
    </div>
  );
}
