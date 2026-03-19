'use client';
import { MenuItem } from '@/lib/api';
import { clsx } from 'clsx';

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export default function MenuCard({ item, onAdd }: Props) {
  return (
    <button
      onClick={() => onAdd(item)}
      disabled={!item.is_available}
      className={clsx(
        'group relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden',
        'hover:border-amber-500/60 hover:bg-zinc-800/80 transition-all duration-200 text-left',
        !item.is_available && 'opacity-40 cursor-not-allowed'
      )}
    >
      {/* Image / placeholder */}
      <div className="h-28 bg-zinc-800 relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl select-none">
            {item.category_name === 'Burgers'  ? '🍔'
           : item.category_name === 'Pizza'    ? '🍕'
           : item.category_name === 'Pasta'    ? '🍝'
           : item.category_name === 'Drinks'   ? '🥤'
           : item.category_name === 'Desserts' ? '🍰'
           : '🍽️'}
          </div>
        )}
        {item.is_featured && (
          <span className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Featured
          </span>
        )}
        {/* Quick-add overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-amber-500 text-black rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold shadow-lg">+</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-white text-sm font-medium leading-snug line-clamp-1">{item.name}</p>
        {item.description && (
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-amber-400 font-bold text-sm">৳{item.price.toFixed(0)}</span>
          {item.prep_time_min && (
            <span className="text-zinc-600 text-[10px]">~{item.prep_time_min}min</span>
          )}
        </div>
      </div>
    </button>
  );
}
