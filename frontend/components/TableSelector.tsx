'use client';
import { RestaurantTable } from '@/lib/api';
import { clsx } from 'clsx';

interface Props {
  tables: RestaurantTable[];
  selectedId?: number;
  onSelect: (table: RestaurantTable) => void;
}

const STATUS_STYLES: Record<string, string> = {
  available: 'border-zinc-700 bg-zinc-900 hover:border-amber-500 hover:bg-zinc-800 text-white cursor-pointer',
  occupied:  'border-red-900/60 bg-red-950/40 text-red-300 cursor-pointer hover:border-red-500',
  reserved:  'border-purple-900/60 bg-purple-950/30 text-purple-300 cursor-not-allowed',
  cleaning:  'border-blue-900/60 bg-blue-950/30 text-blue-300 cursor-not-allowed',
};

const STATUS_LABEL: Record<string, string> = {
  available: 'Free',
  occupied:  'Occupied',
  reserved:  'Reserved',
  cleaning:  'Cleaning',
};

export default function TableSelector({ tables, selectedId, onSelect }: Props) {
  const floors = [...new Set(tables.map((t) => t.floor))];

  return (
    <div className="space-y-4">
      {floors.map((floor) => (
        <div key={floor}>
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2 font-semibold">{floor} Floor</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {tables
              .filter((t) => t.floor === floor)
              .map((table) => (
                <button
                  key={table.id}
                  onClick={() => ['available', 'occupied'].includes(table.status) && onSelect(table)}
                  disabled={['reserved', 'cleaning'].includes(table.status)}
                  className={clsx(
                    'relative rounded-xl border-2 p-3 text-center transition-all duration-150',
                    STATUS_STYLES[table.status] || STATUS_STYLES.available,
                    selectedId === table.id && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-black border-amber-500 bg-amber-950/30'
                  )}
                >
                  <p className="font-bold text-sm">{table.table_number}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{table.capacity} seats</p>
                  <p className={clsx(
                    'text-[9px] mt-1 font-semibold uppercase tracking-wide',
                    table.status === 'available' ? 'text-green-500' :
                    table.status === 'occupied'  ? 'text-red-400'   :
                    table.status === 'reserved'  ? 'text-purple-400': 'text-blue-400'
                  )}>
                    {STATUS_LABEL[table.status]}
                  </p>
                  {table.order_total && (
                    <p className="text-[9px] text-amber-400 mt-0.5">৳{Number(table.order_total).toFixed(0)}</p>
                  )}
                </button>
              ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              k === 'available' ? 'bg-green-500' :
              k === 'occupied'  ? 'bg-red-500'   :
              k === 'reserved'  ? 'bg-purple-500' : 'bg-blue-500'
            )} />
            <span className="text-zinc-500 text-[10px]">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
