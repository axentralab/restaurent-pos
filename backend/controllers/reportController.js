const { query } = require('../config/db');

// ─── SALES SUMMARY ─────────────────────────────────────────────
exports.getSalesSummary = async (req, res) => {
  const { period = 'today' } = req.query;

  const intervals = {
    today:   `DATE(created_at) = CURRENT_DATE`,
    week:    `created_at >= NOW() - INTERVAL '7 days'`,
    month:   `created_at >= NOW() - INTERVAL '30 days'`,
    year:    `EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`,
  };
  const filter = intervals[period] || intervals.today;

  try {
    const { rows: [summary] } = await query(
      `SELECT
         COUNT(*)::int                                        AS total_orders,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int   AS cancelled_orders,
         SUM(total) FILTER (WHERE payment_status = 'paid')   AS total_revenue,
         AVG(total) FILTER (WHERE payment_status = 'paid')   AS avg_order_value,
         SUM(discount_amount)                                 AS total_discounts,
         SUM(tax_amount)                                      AS total_tax
       FROM orders
       WHERE ${filter}`
    );

    // Revenue by payment method
    const { rows: byMethod } = await query(
      `SELECT payment_method, SUM(total) AS amount, COUNT(*)::int AS count
       FROM orders
       WHERE ${filter} AND payment_status = 'paid'
       GROUP BY payment_method`
    );

    // Hourly breakdown (for today)
    const { rows: hourly } = await query(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
              COUNT(*)::int AS orders,
              SUM(total) AS revenue
       FROM orders
       WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'paid'
       GROUP BY hour ORDER BY hour`
    );

    res.json({ summary, byMethod, hourly });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// ─── TOP SELLING ITEMS ─────────────────────────────────────────
exports.getTopItems = async (req, res) => {
  const { period = 'month', limit = 10 } = req.query;
  const intervals = {
    today: `DATE(o.created_at) = CURRENT_DATE`,
    week:  `o.created_at >= NOW() - INTERVAL '7 days'`,
    month: `o.created_at >= NOW() - INTERVAL '30 days'`,
  };
  const filter = intervals[period] || intervals.month;

  try {
    const { rows } = await query(
      `SELECT
         oi.menu_item_id,
         oi.item_name,
         c.name AS category,
         SUM(oi.quantity)::int              AS total_qty,
         SUM(oi.subtotal)                   AS total_revenue,
         COUNT(DISTINCT oi.order_id)::int   AS order_count
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN menu_items m ON m.id = oi.menu_item_id
       LEFT JOIN categories c ON c.id = m.category_id
       WHERE ${filter} AND o.status != 'cancelled'
       GROUP BY oi.menu_item_id, oi.item_name, c.name
       ORDER BY total_qty DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top items' });
  }
};

// ─── DAILY TREND (last 30 days) ────────────────────────────────
exports.getDailyTrend = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         DATE(created_at)          AS date,
         COUNT(*)::int             AS orders,
         SUM(total)                AS revenue,
         AVG(total)                AS avg_value
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '30 days'
         AND payment_status = 'paid'
       GROUP BY date
       ORDER BY date`
    );
    res.json({ trend: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trend' });
  }
};

// ─── INVENTORY VALUE ───────────────────────────────────────────
exports.getInventoryValue = async (req, res) => {
  try {
    const { rows: [val] } = await query(
      `SELECT
         COUNT(*)::int                                       AS total_items,
         SUM(quantity * cost_per_unit)                       AS total_value,
         COUNT(*) FILTER (WHERE quantity <= threshold_alert)::int AS low_stock_count
       FROM ingredients`
    );
    res.json({ inventory: val });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory value' });
  }
};
