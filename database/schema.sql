-- ============================================================
-- Restaurant POS — PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & ROLES
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'waiter', 'chef');

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'waiter',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESTAURANT TABLES
-- ============================================================
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');

CREATE TABLE restaurant_tables (
  id          SERIAL PRIMARY KEY,
  table_number VARCHAR(10) UNIQUE NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 4,
  status      table_status DEFAULT 'available',
  floor       VARCHAR(50) DEFAULT 'Ground',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES & MENU
-- ============================================================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(50),
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE menu_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  image_url     TEXT,
  is_featured   BOOLEAN DEFAULT FALSE,
  is_available  BOOLEAN DEFAULT TRUE,
  prep_time_min INTEGER DEFAULT 10,
  calories      INTEGER,
  tags          TEXT[], -- e.g. {'spicy','vegan','gluten-free'}
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE item_modifiers (
  id          SERIAL PRIMARY KEY,
  item_id     UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL, -- e.g. "Extra Cheese"
  price_delta NUMERIC(8,2) DEFAULT 0
);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE ingredients (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  unit            VARCHAR(30) NOT NULL, -- kg, litre, pcs
  quantity        NUMERIC(12,3) DEFAULT 0,
  threshold_alert NUMERIC(12,3) DEFAULT 0,
  cost_per_unit   NUMERIC(10,2) DEFAULT 0,
  supplier        VARCHAR(150),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
  menu_item_id  UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  qty_required  NUMERIC(10,3) NOT NULL,
  PRIMARY KEY (menu_item_id, ingredient_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TYPE order_type   AS ENUM ('dine_in', 'takeaway', 'delivery');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cooking', 'ready', 'served', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bkash', 'rocket', 'nagad', 'split');

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    VARCHAR(20) UNIQUE NOT NULL,
  table_id        INTEGER REFERENCES restaurant_tables(id),
  type            order_type NOT NULL DEFAULT 'dine_in',
  status          order_status DEFAULT 'pending',
  payment_status  payment_status DEFAULT 'unpaid',
  payment_method  payment_method,
  waiter_id       UUID REFERENCES users(id),
  cashier_id      UUID REFERENCES users(id),
  subtotal        NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount      NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  customer_name   VARCHAR(150),
  customer_phone  VARCHAR(20),
  delivery_address TEXT,
  kot_printed     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID REFERENCES menu_items(id),
  item_name     VARCHAR(150) NOT NULL, -- snapshot at time of order
  unit_price    NUMERIC(10,2) NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  modifiers     JSONB DEFAULT '[]', -- [{name, price_delta}]
  special_note  TEXT,
  subtotal      NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  status        order_status DEFAULT 'pending'
);

-- ============================================================
-- DISCOUNTS
-- ============================================================
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

CREATE TABLE discounts (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50) UNIQUE,
  name        VARCHAR(100) NOT NULL,
  type        discount_type NOT NULL,
  value       NUMERIC(10,2) NOT NULL,
  min_order   NUMERIC(10,2) DEFAULT 0,
  max_uses    INTEGER,
  used_count  INTEGER DEFAULT 0,
  valid_from  DATE,
  valid_until DATE,
  is_active   BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- PAYMENTS & INVOICES
-- ============================================================
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID REFERENCES orders(id),
  method      payment_method NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  reference   VARCHAR(100), -- transaction ID for mobile payments
  processed_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIFT LOGS
-- ============================================================
CREATE TABLE shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  opening_cash NUMERIC(12,2) DEFAULT 0,
  closing_cash NUMERIC(12,2),
  notes       TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_orders_status       ON orders(status);
CREATE INDEX idx_orders_created_at   ON orders(created_at);
CREATE INDEX idx_orders_table        ON orders(table_id);
CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Burgers',    '🍔', 1),
  ('Pizza',      '🍕', 2),
  ('Pasta',      '🍝', 3),
  ('Drinks',     '🥤', 4),
  ('Desserts',   '🍰', 5),
  ('Starters',   '🥗', 6);

INSERT INTO restaurant_tables (table_number, capacity, floor) VALUES
  ('T1',  4, 'Ground'), ('T2',  2, 'Ground'), ('T3',  4, 'Ground'),
  ('T4',  6, 'Ground'), ('T5',  4, 'Ground'), ('T6',  2, 'Ground'),
  ('T7',  4, 'First'),  ('T8',  8, 'First'),  ('T9',  4, 'First'),
  ('T10', 4, 'First'),  ('VIP', 10, 'VIP');

INSERT INTO menu_items (category_id, name, description, price, is_featured, prep_time_min) VALUES
  (1, 'Classic Smash Burger',  'Double smash patty, cheddar, pickles, special sauce',        350, TRUE,  12),
  (1, 'BBQ Bacon Burger',      'Crispy bacon, caramelised onions, BBQ sauce',                420, TRUE,  14),
  (1, 'Veggie Burger',         'Black bean patty, avocado, fresh greens',                   290, FALSE, 10),
  (2, 'Margherita Pizza',      'San Marzano tomato, fresh mozzarella, basil',               550, TRUE,  20),
  (2, 'Pepperoni Feast',       'Double pepperoni, chilli oil drizzle',                      620, TRUE,  22),
  (3, 'Spaghetti Carbonara',   'Guanciale, egg yolk, pecorino, black pepper',               480, FALSE, 15),
  (3, 'Penne Arrabbiata',      'Spicy tomato, garlic, fresh chilli',                        380, FALSE, 12),
  (4, 'Fresh Lemonade',        'Squeezed lemon, mint, sugar syrup',                         120, FALSE,  3),
  (4, 'Cold Brew Coffee',      '18-hour cold brew, served over ice',                        180, TRUE,   2),
  (5, 'Chocolate Lava Cake',   'Warm molten centre, vanilla ice cream',                     250, TRUE,  15),
  (6, 'Loaded Fries',          'Crispy fries, melted cheese, jalapeños, sour cream',        220, TRUE,   8),
  (6, 'Chicken Wings (6pc)',   'Honey-glazed or buffalo — your choice',                     380, TRUE,  15);
