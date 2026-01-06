const express = require('express');
const multer = require('multer');
const path = require('path');
const { registerUser, authUser, logout, verifyEmail, resendVerificationCode, registerVendorProfile, getVendorStatus } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// File upload config for vendor logo
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, 'uploads/'),
	filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', protect, logout);
router.post('/verify-email', verifyEmail);
router.post('/verify-email/resend', resendVerificationCode);
router.post('/vendor-setup', protect, upload.single('logo'), registerVendorProfile);
router.get('/vendor-status', protect, getVendorStatus);

module.exports = router;
