const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── GET ALL MENU ITEMS (FIXED) ────────────────────────────────────────
exports.getMenu = async (req, res) => {
  try {
    const { category_id, featured, search, available } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (category_id) { conditions.push(`m.category_id = $${i++}`); params.push(category_id); }
    if (featured === 'true') { conditions.push(`m.is_featured = TRUE`); }
    if (available !== 'false') { conditions.push(`m.is_available = TRUE`); }
    if (search) {
      conditions.push(`(m.name ILIKE $${i++} OR m.description ILIKE $${i++})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT m.*, c.name AS category_name, c.icon AS category_icon,
              COALESCE(
                json_agg(im.*) FILTER (WHERE im.id IS NOT NULL), '[]'
              ) AS modifiers
       FROM menu_items m
       LEFT JOIN categories c ON c.id = m.category_id
       LEFT JOIN item_modifiers im ON im.item_id = m.id
       ${where}
       GROUP BY m.id, c.name, c.icon, c.sort_order  -- এখানে c.sort_order যোগ করা হয়েছে
       ORDER BY c.sort_order, m.name`,
      params
    );
    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
};

// ─── GET CATEGORIES ────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, COUNT(m.id)::int AS item_count
       FROM categories c
       LEFT JOIN menu_items m ON m.category_id = c.id AND m.is_available = TRUE
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.sort_order`
    );
    res.json({ categories: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// ─── GET SINGLE ITEM ───────────────────────────────────────────
exports.getMenuItem = async (req, res) => {
  try {
    const { rows: [item] } = await query(
      `SELECT m.*, c.name AS category_name,
              COALESCE(json_agg(im.*) FILTER (WHERE im.id IS NOT NULL), '[]') AS modifiers
       FROM menu_items m
       LEFT JOIN categories c ON c.id = m.category_id
       LEFT JOIN item_modifiers im ON im.item_id = m.id
       WHERE m.id = $1
       GROUP BY m.id, c.name`,
      [req.params.id]
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

// ─── CREATE MENU ITEM ──────────────────────────────────────────
exports.createMenuItem = async (req, res) => {
  const {
    category_id, name, description, price, image_url,
    is_featured = false, prep_time_min = 10, calories, tags, modifiers
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const id = uuidv4();
    const { rows: [item] } = await query(
      `INSERT INTO menu_items (id, category_id, name, description, price, image_url,
                               is_featured, prep_time_min, calories, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, category_id, name, description, price, image_url,
       is_featured, prep_time_min, calories, tags]
    );

    // Insert modifiers if provided
    if (modifiers && modifiers.length > 0) {
      for (const mod of modifiers) {
        await query(
          `INSERT INTO item_modifiers (item_id, name, price_delta) VALUES ($1,$2,$3)`,
          [id, mod.name, mod.price_delta || 0]
        );
      }
    }

    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
};

// ─── UPDATE MENU ITEM ──────────────────────────────────────────
exports.updateMenuItem = async (req, res) => {
  const fields = ['category_id','name','description','price','image_url',
                  'is_featured','is_available','prep_time_min','calories','tags'];
  const updates = [];
  const params = [];
  let i = 1;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${i++}`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.push(`updated_at = NOW()`);
  params.push(req.params.id);

  try {
    const { rows: [item] } = await query(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// ─── DELETE MENU ITEM ──────────────────────────────────────────
exports.deleteMenuItem = async (req, res) => {
  try {
    await query(`UPDATE menu_items SET is_available = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Item marked unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
};
