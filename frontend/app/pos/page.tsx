'use client';
import { useEffect, useState, useCallback } from 'react';
import { menu, orders } from '@/lib/api';
import type { MenuItem, Category, RestaurantTable } from '@/lib/api';
import MenuCard from '@/components/MenuCard';
import Cart, { CartItem } from '@/components/Cart';
import TableSelector from '@/components/TableSelector';
import { clsx } from 'clsx';

// Mock data for demo
const MOCK_CATEGORIES: Category[] = [
  { id: 0, name: 'All', icon: '⊞', item_count: 12 },
  { id: 1, name: 'Burgers',  icon: '🍔', item_count: 3 },
  { id: 2, name: 'Pizza',    icon: '🍕', item_count: 2 },
  { id: 3, name: 'Pasta',    icon: '🍝', item_count: 2 },
  { id: 4, name: 'Drinks',   icon: '🥤', item_count: 2 },
  { id: 5, name: 'Desserts', icon: '🍰', item_count: 1 },
  { id: 6, name: 'Starters', icon: '🥗', item_count: 2 },
];
const MOCK_ITEMS: MenuItem[] = [
  { id:'1', category_id:1, name:'Classic Smash Burger', description:'Double smash patty, cheddar, pickles, special sauce', price:350, is_featured:true,  is_available:true,  prep_time_min:12, category_name:'Burgers',  modifiers:[], tags:[] },
  { id:'2', category_id:1, name:'BBQ Bacon Burger',     description:'Crispy bacon, caramelised onions, BBQ sauce',          price:420, is_featured:true,  is_available:true,  prep_time_min:14, category_name:'Burgers',  modifiers:[], tags:[] },
  { id:'3', category_id:1, name:'Veggie Burger',        description:'Black bean patty, avocado, fresh greens',              price:290, is_featured:false, is_available:true,  prep_time_min:10, category_name:'Burgers',  modifiers:[], tags:['vegan'] },
  { id:'4', category_id:2, name:'Margherita Pizza',     description:'San Marzano tomato, fresh mozzarella, basil',         price:550, is_featured:true,  is_available:true,  prep_time_min:20, category_name:'Pizza',    modifiers:[], tags:[] },
  { id:'5', category_id:2, name:'Pepperoni Feast',      description:'Double pepperoni, chilli oil drizzle',                price:620, is_featured:true,  is_available:true,  prep_time_min:22, category_name:'Pizza',    modifiers:[], tags:['spicy'] },
  { id:'6', category_id:3, name:'Spaghetti Carbonara',  description:'Guanciale, egg yolk, pecorino, black pepper',         price:480, is_featured:false, is_available:true,  prep_time_min:15, category_name:'Pasta',    modifiers:[], tags:[] },
  { id:'7', category_id:3, name:'Penne Arrabbiata',     description:'Spicy tomato, garlic, fresh chilli',                  price:380, is_featured:false, is_available:true,  prep_time_min:12, category_name:'Pasta',    modifiers:[], tags:['spicy'] },
  { id:'8', category_id:4, name:'Fresh Lemonade',       description:'Squeezed lemon, mint, sugar syrup',                   price:120, is_featured:false, is_available:true,  prep_time_min:3,  category_name:'Drinks',   modifiers:[], tags:[] },
  { id:'9', category_id:4, name:'Cold Brew Coffee',     description:'18-hour cold brew, served over ice',                  price:180, is_featured:true,  is_available:true,  prep_time_min:2,  category_name:'Drinks',   modifiers:[], tags:[] },
  { id:'10',category_id:5, name:'Chocolate Lava Cake',  description:'Warm molten centre, vanilla ice cream',               price:250, is_featured:true,  is_available:true,  prep_time_min:15, category_name:'Desserts', modifiers:[], tags:[] },
  { id:'11',category_id:6, name:'Loaded Fries',         description:'Crispy fries, melted cheese, jalapeños, sour cream', price:220, is_featured:true,  is_available:true,  prep_time_min:8,  category_name:'Starters', modifiers:[], tags:[] },
  { id:'12',category_id:6, name:'Chicken Wings (6pc)',  description:'Honey-glazed or buffalo — your choice',               price:380, is_featured:true,  is_available:true,  prep_time_min:15, category_name:'Starters', modifiers:[], tags:[] },
];
const MOCK_TABLES: RestaurantTable[] = [
  { id:1,  table_number:'T1',  capacity:4, status:'available', floor:'Ground' },
  { id:2,  table_number:'T2',  capacity:2, status:'occupied',  floor:'Ground', order_total:780 },
  { id:3,  table_number:'T3',  capacity:4, status:'available', floor:'Ground' },
  { id:4,  table_number:'T4',  capacity:6, status:'available', floor:'Ground' },
  { id:5,  table_number:'T5',  capacity:4, status:'occupied',  floor:'Ground', order_total:1380 },
  { id:6,  table_number:'T6',  capacity:2, status:'cleaning',  floor:'Ground' },
  { id:7,  table_number:'T7',  capacity:4, status:'available', floor:'First'  },
  { id:8,  table_number:'T8',  capacity:8, status:'reserved',  floor:'First'  },
  { id:9,  table_number:'T9',  capacity:4, status:'available', floor:'First'  },
  { id:10, table_number:'T10', capacity:4, status:'available', floor:'First'  },
  { id:11, table_number:'VIP', capacity:10,status:'available', floor:'VIP'   },
];

type View = 'tables' | 'menu';
type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export default function POSPage() {
  const [view, setView]               = useState<View>('tables');
  const [orderType, setOrderType]     = useState<OrderType>('dine_in');
  const [categories, setCategories]   = useState<Category[]>(MOCK_CATEGORIES);
  const [items, setItems]             = useState<MenuItem[]>(MOCK_ITEMS);
  const [tables, setTables]           = useState<RestaurantTable[]>(MOCK_TABLES);
  const [selectedCat, setSelectedCat] = useState<number>(0);
  const [search, setSearch]           = useState('');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');

  useEffect(() => {
    menu.getCategories()
      .then(d => setCategories([{ id: 0, name: 'All', icon: '⊞', item_count: d.categories.reduce((s, c) => s + c.item_count, 0) }, ...d.categories]))
      .catch(() => {});
    menu.getAll()
      .then(d => setItems(d.items))
      .catch(() => {});
    orders.getTables()
      .then(d => setTables(d.tables))
      .catch(() => {});
  }, []);

  const filtered = items.filter(i =>
    (selectedCat === 0 || i.category_id === selectedCat) &&
    (search === '' || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) {
        return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        menu_item_id: item.id,
        item_name:    item.name,
        unit_price:   item.price,
        quantity:     1,
        modifiers:    [],
        item,
      }];
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setCart(prev => prev.map(c => c.menu_item_id === id ? { ...c, quantity: qty } : c));
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.menu_item_id !== id));
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTable) {
      alert('Please select a table first');
      setView('tables');
      return;
    }
    setLoading(true);
    try {
      await orders.create({
        table_id: selectedTable?.id,
        type: orderType,
        items: cart.map(c => ({ menu_item_id: c.menu_item_id, quantity: c.quantity, modifiers: c.modifiers })),
      });
      setSuccessMsg(`Order placed! KOT sent to kitchen 🎉`);
      setCart([]);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Menu panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800 space-y-3">
          {/* Order type + view toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {(['dine_in','takeaway','delivery'] as OrderType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                    orderType === t ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                  )}
                >{t.replace('_',' ')}</button>
              ))}
            </div>
            <button
              onClick={() => setView(v => v === 'tables' ? 'menu' : 'tables')}
              className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
            >
              {view === 'tables' ? '⊞ Show Menu' : '⊟ Tables'}
            </button>
          </div>

          {/* Search */}
          {view === 'menu' && (
            <input
              type="text"
              placeholder="Search menu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === 'tables' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Select Table</h2>
                {selectedTable && (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-sm font-semibold">Table {selectedTable.table_number} selected</span>
                    <button onClick={() => setView('menu')} className="px-3 py-1 bg-amber-500 text-black rounded-lg text-xs font-bold">
                      Go to Menu →
                    </button>
                  </div>
                )}
              </div>
              <TableSelector
                tables={tables}
                selectedId={selectedTable?.id}
                onSelect={(t) => { setSelectedTable(t); setTimeout(() => setView('menu'), 300); }}
              />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Category tabs */}
              <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-zinc-900 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                      selectedCat === cat.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className={clsx('text-[10px]', selectedCat === cat.id ? 'opacity-70' : 'text-zinc-600')}>
                      {cat.item_count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedTable && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <span className="text-amber-400 text-xs">📍 Table {selectedTable.table_number}</span>
                    <button onClick={() => setView('tables')} className="text-zinc-500 hover:text-white text-xs ml-auto">Change</button>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map(item => (
                    <MenuCard key={item.id} item={item} onAdd={addToCart} />
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-zinc-600">
                      <p className="text-3xl mb-2">🔍</p>
                      <p className="text-sm">No items found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-72 xl:w-80 flex-shrink-0">
        <Cart
          items={cart}
          onUpdate={updateQty}
          onRemove={removeItem}
          onCheckout={handleCheckout}
          tableNumber={selectedTable?.table_number}
          loading={loading}
        />
        {successMsg && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 font-semibold">
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
