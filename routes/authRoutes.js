const express = require('express');
const { registerUser, authUser, logout, verifyEmail, registerVendorProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', protect, logout);
router.get('/verify-email', verifyEmail);
router.post('/vendor-setup', protect, registerVendorProfile);

module.exports = router;
