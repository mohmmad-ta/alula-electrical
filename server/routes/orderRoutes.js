const express = require('express');
const { createOrder, getMyOrders } = require('../controllers/orderController');
const { protect, restrictTo } = require('../controllers/auth/authController');
const User = require('../models/auth/userModel');

const router = express.Router();

router.use(protect(User), restrictTo('user'));
router.route('/').post(createOrder);
router.get('/me', getMyOrders);

module.exports = router;
