const express    = require('express');
const router     = express.Router();
const orderCtrl  = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/tables',                              orderCtrl.getTables);
router.get('/',                                    orderCtrl.getOrders);
router.post('/',                                   orderCtrl.createOrder);
router.get('/:id',                                 orderCtrl.getOrder);
router.patch('/:id/status',                        orderCtrl.updateOrderStatus);
router.post('/:id/payment', authorize('admin','cashier'), orderCtrl.processPayment);

module.exports = router;
