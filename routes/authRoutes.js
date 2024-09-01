const express = require('express');
const { registerUser, authUser, logout, verifyEmail } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', logout);
router.get('/verify-email', verifyEmail); 

module.exports = router;
