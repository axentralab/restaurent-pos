// ─── routes/inventoryRoutes.js ─────────────────────────────────
const express   = require('express');
const router    = express.Router();
const invCtrl   = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/alerts',       invCtrl.getLowStockAlerts);
router.get('/',             invCtrl.getInventory);
router.post('/',            authorize('admin'), invCtrl.createIngredient);
router.patch('/:id',        authorize('admin'), invCtrl.updateIngredient);
router.post('/:id/restock', authorize('admin', 'cashier'), invCtrl.restockIngredient);
router.post('/recipe',      authorize('admin'), invCtrl.setRecipeIngredient);

module.exports = router;
