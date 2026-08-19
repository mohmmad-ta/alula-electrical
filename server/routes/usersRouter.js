const { Router } = require('express');
const { deleteMe, getMe, updateMe } = require('../controllers/auth/userController');
const {
    getMeAdmin,
    adminDeleteUser,
    adminGetAllUsers,
    adminUpdateUser,
    adminGetUser,
    adminGetAllOrders,
    adminGetOrder,
    adminUpdateOrder,
    adminDeleteOrder,
    adminGetAllProduct,
    adminGetProduct,
    adminCreateProduct,
    adminUpdateProduct,
    adminDeleteProduct
} = require('../controllers/auth/adminController');
const {
    signupUser,
    loginAdmin,
    loginUser,
    logout,
    updatePassword,
    protect,
    restrictTo,
    checkToken
} = require('../controllers/auth/authController');
const { authLoginLimiter, authSignupLimiter } = require('../utils/securityRateLimiters');
const Admin = require('./../models/auth/adminModel');
const User = require('./../models/auth/userModel');
const { parseProductMultipartFields, uploadProductImages } = require('../utils/productImageUpload');

const router = Router();

router.post('/user/signup', authSignupLimiter, signupUser);
router.post('/user/login', authLoginLimiter, loginUser);

router.post('/admin/login', authLoginLimiter, loginAdmin);

router.get('/logout', logout);
router.get('/checkToken', checkToken);

router.get('/user/me', protect(User), restrictTo('user'), getMe);
router.patch('/user/updateMe', protect(User), restrictTo('user'), updateMe);
router.delete('/user/deleteMe', protect(User), restrictTo('user'), deleteMe);
router.patch('/user/updateMyPassword', protect(User), restrictTo('user'), updatePassword);

router.use(protect(Admin), restrictTo('admin'));

router.get('/admin/getMe', getMeAdmin);
router.get('/admin/user', adminGetAllUsers);
router.get('/admin/order', adminGetAllOrders);

router
    .route('/admin/product')
    .get(adminGetAllProduct)
    .post(uploadProductImages, parseProductMultipartFields, adminCreateProduct);

router
    .route('/admin/product/:id')
    .get(adminGetProduct)
    .patch(uploadProductImages, parseProductMultipartFields, adminUpdateProduct)
    .delete(adminDeleteProduct);

router
    .route('/admin/user/:id')
    .get(adminGetUser)
    .patch(adminUpdateUser)
    .delete(adminDeleteUser);

router
    .route('/admin/order/:id')
    .get(adminGetOrder)
    .patch(adminUpdateOrder)
    .delete(adminDeleteOrder);

module.exports = router;
