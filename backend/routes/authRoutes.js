// ─── routes/authRoutes.js ──────────────────────────────────────
const express = require('express');
const router  = express.Router();
const authCtrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login',    authCtrl.login);
router.post('/register', authCtrl.register);
router.get('/me',        authenticate, authCtrl.me);

module.exports = router;
