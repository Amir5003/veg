const express = require('express');
const { registerUser, authUser, logout, verifyEmail, resendVerificationCode, registerVendorProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', protect, logout);
router.post('/verify-email', verifyEmail);
router.post('/verify-email/resend', resendVerificationCode);
router.post('/vendor-setup', protect, registerVendorProfile);

module.exports = router;
