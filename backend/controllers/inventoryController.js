const { query } = require('../config/db');

// ─── GET ALL INGREDIENTS ───────────────────────────────────────
exports.getInventory = async (req, res) => {
  try {
    const { low_stock } = req.query;
    let sql = `SELECT * FROM ingredients ORDER BY name`;
    if (low_stock === 'true') {
      sql = `SELECT * FROM ingredients WHERE quantity <= threshold_alert ORDER BY quantity ASC`;
    }
    const { rows } = await query(sql);
    res.json({ ingredients: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

// ─── GET LOW STOCK ALERTS ──────────────────────────────────────
exports.getLowStockAlerts = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, COUNT(ri.menu_item_id)::int AS affected_items
       FROM ingredients i
       LEFT JOIN recipe_ingredients ri ON ri.ingredient_id = i.id
       WHERE i.quantity <= i.threshold_alert
       GROUP BY i.id
       ORDER BY (i.quantity / NULLIF(i.threshold_alert, 0)) ASC`
    );
    res.json({ alerts: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// ─── CREATE INGREDIENT
exports.createIngredient = async (req, res) => {
  const { name, unit, quantity = 0, threshold_alert = 0, cost_per_unit = 0, supplier } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'Name and unit required' });

  try {
    const { rows: [ing] } = await query(
      `INSERT INTO ingredients (name, unit, quantity, threshold_alert, cost_per_unit, supplier)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, unit, quantity, threshold_alert, cost_per_unit, supplier]
    );
    res.status(201).json({ ingredient: ing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
};

// ─── RESTOCK (ADD QUANTITY) ────────────────────────────────────
exports.restockIngredient = async (req, res) => {
  const { quantity, cost_per_unit } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

  try {
    const updates = [`quantity = quantity + $1`, `updated_at = NOW()`];
    const params = [quantity, req.params.id];
    if (cost_per_unit !== undefined) {
      updates.push(`cost_per_unit = $3`);
      params.splice(2, 0, cost_per_unit);
    }

    const { rows: [ing] } = await query(
      `UPDATE ingredients SET ${updates.join(', ')} WHERE id = $2 RETURNING *`,
      params
    );
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });
    res.json({ ingredient: ing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restock' });
  }
};

// ─── UPDATE INGREDIENT ─────────────────────────────────────────
exports.updateIngredient = async (req, res) => {
  const fields = ['name','unit','threshold_alert','cost_per_unit','supplier'];
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
    const { rows: [ing] } = await query(
      `UPDATE ingredients SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });
    res.json({ ingredient: ing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
};

// ─── LINK RECIPE INGREDIENT ────────────────────────────────────
exports.setRecipeIngredient = async (req, res) => {
  const { menu_item_id, ingredient_id, qty_required } = req.body;
  try {
    await query(
      `INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, qty_required)
       VALUES ($1,$2,$3)
       ON CONFLICT (menu_item_id, ingredient_id)
       DO UPDATE SET qty_required = $3`,
      [menu_item_id, ingredient_id, qty_required]
    );
    res.json({ message: 'Recipe ingredient saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save recipe ingredient' });
  }
};
