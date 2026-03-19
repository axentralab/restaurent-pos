const { query, withTransaction } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/** Generate a readable order number like POS-240315-0042 */
const generateOrderNumber = () => {
  const date = new Date();
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `POS-${datePart}-${rand}`;
};

// ─── GET ALL ORDERS ────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const { status, type, date, table_id, limit = 50, offset = 0 } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (status)   { conditions.push(`o.status = $${i++}`);      params.push(status); }
    if (type)     { conditions.push(`o.type = $${i++}`);        params.push(type); }
    if (table_id) { conditions.push(`o.table_id = $${i++}`);    params.push(table_id); }
    if (date)     { conditions.push(`DATE(o.created_at) = $${i++}`); params.push(date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT o.*,
              rt.table_number,
              u.name AS waiter_name,
              COUNT(oi.id)::int AS item_count
       FROM orders o
       LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
       LEFT JOIN users u ON u.id = o.waiter_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id, rt.table_number, u.name
       ORDER BY o.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]
    );
    res.json({ orders: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// ─── GET SINGLE ORDER ──────────────────────────────────────────
exports.getOrder = async (req, res) => {
  try {
    const { rows: [order] } = await query(
      `SELECT o.*, rt.table_number, u.name AS waiter_name
       FROM orders o
       LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
       LEFT JOIN users u ON u.id = o.waiter_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { rows: items } = await query(
      `SELECT oi.*, mi.image_url FROM order_items oi
       LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = $1`,
      [order.id]
    );
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// ─── CREATE ORDER ──────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  const { table_id, type = 'dine_in', items, notes, customer_name, customer_phone, delivery_address } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must have at least one item' });
  }

  try {
    const result = await withTransaction(async (client) => {
      // Fetch menu item prices
      const itemIds = items.map(i => i.menu_item_id);
      const { rows: menuItems } = await client.query(
        `SELECT id, name, price, is_available FROM menu_items WHERE id = ANY($1)`,
        [itemIds]
      );

      const menuMap = Object.fromEntries(menuItems.map(m => [m.id, m]));

      // Validate all items exist & are available
      for (const item of items) {
        const m = menuMap[item.menu_item_id];
        if (!m) throw new Error(`Menu item ${item.menu_item_id} not found`);
        if (!m.is_available) throw new Error(`${m.name} is currently unavailable`);
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = items.map(item => {
        const m = menuMap[item.menu_item_id];
        const modDelta = (item.modifiers || []).reduce((s, mod) => s + (mod.price_delta || 0), 0);
        const unitPrice = parseFloat(m.price) + modDelta;
        subtotal += unitPrice * item.quantity;
        return { ...item, unit_price: unitPrice, item_name: m.name };
      });

      const taxRate = 0.05; // 5% VAT
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // If table, mark as occupied
      if (table_id) {
        await client.query(
          `UPDATE restaurant_tables SET status = 'occupied' WHERE id = $1`,
          [table_id]
        );
      }

      const orderId = uuidv4();
      const orderNumber = generateOrderNumber();

      const { rows: [order] } = await client.query(
        `INSERT INTO orders (id, order_number, table_id, type, notes, waiter_id,
                             customer_name, customer_phone, delivery_address,
                             subtotal, tax_amount, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [orderId, orderNumber, table_id || null, type, notes || null,
         req.user?.id || null, customer_name || null,
         customer_phone || null, delivery_address || null,
         subtotal, taxAmount, total]
      );

      // Insert order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, modifiers, special_note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uuidv4(), orderId, item.menu_item_id, item.item_name,
           item.unit_price, item.quantity,
           JSON.stringify(item.modifiers || []), item.special_note || null]
        );
      }

      // Deduct inventory
      for (const item of orderItems) {
        await client.query(
          `UPDATE ingredients i
           SET quantity = quantity - (ri.qty_required * $1),
               updated_at = NOW()
           FROM recipe_ingredients ri
           WHERE ri.ingredient_id = i.id
             AND ri.menu_item_id = $2`,
          [item.quantity, item.menu_item_id]
        );
      }

      return order;
    });

    // Emit to kitchen via Socket.IO
    req.io?.emit('new_order', { orderId: result.id, orderNumber: result.order_number });

    res.status(201).json({ order: result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
};

// ─── UPDATE ORDER STATUS ───────────────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending','confirmed','cooking','ready','served','cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const { rows: [order] } = await query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Free table when order is served/cancelled
    if (['served', 'cancelled'].includes(status) && order.table_id) {
      await query(
        `UPDATE restaurant_tables SET status = 'available' WHERE id = $1`,
        [order.table_id]
      );
    }

    req.io?.emit('order_status_update', { orderId: order.id, status });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ─── PROCESS PAYMENT ───────────────────────────────────────────
exports.processPayment = async (req, res) => {
  const { method, amount, discount_code, reference } = req.body;

  try {
    const result = await withTransaction(async (client) => {
      const { rows: [order] } = await client.query(
        `SELECT * FROM orders WHERE id = $1`, [req.params.id]
      );
      if (!order) throw new Error('Order not found');
      if (order.payment_status === 'paid') throw new Error('Order already paid');

      let discountAmount = 0;
      if (discount_code) {
        const { rows: [disc] } = await client.query(
          `SELECT * FROM discounts WHERE code = $1 AND is_active = TRUE
           AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
           AND (max_uses IS NULL OR used_count < max_uses)`,
          [discount_code]
        );
        if (disc) {
          discountAmount = disc.type === 'percentage'
            ? (order.subtotal * disc.value / 100)
            : Math.min(disc.value, order.subtotal);
          await client.query(
            `UPDATE discounts SET used_count = used_count + 1 WHERE id = $1`, [disc.id]
          );
        }
      }

      const finalTotal = Math.max(0, order.total - discountAmount);

      await client.query(
        `UPDATE orders SET payment_status = 'paid', payment_method = $1,
         discount_amount = $2, total = $3, cashier_id = $4, updated_at = NOW()
         WHERE id = $5`,
        [method, discountAmount, finalTotal, req.user?.id || null, order.id]
      );

      await client.query(
        `INSERT INTO payments (id, order_id, method, amount, reference, processed_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), order.id, method, amount, reference || null, req.user?.id || null]
      );

      return { ...order, discount_amount: discountAmount, total: finalTotal };
    });

    res.json({ order: result, message: 'Payment processed successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ─── GET TABLES STATUS ─────────────────────────────────────────
exports.getTables = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT rt.*,
              o.id AS active_order_id,
              o.order_number,
              o.total AS order_total,
              o.status AS order_status,
              o.created_at AS order_started_at
       FROM restaurant_tables rt
       LEFT JOIN orders o ON o.table_id = rt.id
         AND o.status NOT IN ('served', 'cancelled')
         AND o.payment_status != 'paid'
       ORDER BY rt.floor, rt.table_number`
    );
    res.json({ tables: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
};
