const express = require('express');
const { registerUser, authUser, logout } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', logout);

module.exports = router;
