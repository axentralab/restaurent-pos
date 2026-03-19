const express    = require('express');
const router     = express.Router();
const reportCtrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'cashier'));

router.get('/summary',   reportCtrl.getSalesSummary);
router.get('/top-items', reportCtrl.getTopItems);
router.get('/trend',     reportCtrl.getDailyTrend);
router.get('/inventory', reportCtrl.getInventoryValue);

module.exports = router;
