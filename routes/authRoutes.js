const express = require('express');
const { registerUser, authUser } = require('../controllers/authController');
const router = express.Router();

console.log("aaaa")
router.post('/register', registerUser);
router.post('/login', authUser);

module.exports = router;
