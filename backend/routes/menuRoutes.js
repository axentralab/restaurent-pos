const express   = require('express');
const router    = express.Router();
const menuCtrl  = require('../controllers/menuController');
const { authenticate, authorize } = require('../middleware/auth');

// Public read routes
router.get('/categories', menuCtrl.getCategories);
router.get('/',           menuCtrl.getMenu);
router.get('/:id',        menuCtrl.getMenuItem);

// Protected write routes
router.post('/',        authenticate, authorize('admin'), menuCtrl.createMenuItem);
router.put('/:id',      authenticate, authorize('admin'), menuCtrl.updateMenuItem);
router.delete('/:id',   authenticate, authorize('admin'), menuCtrl.deleteMenuItem);

module.exports = router;
