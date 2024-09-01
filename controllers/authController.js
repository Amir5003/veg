const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        isVerified: false,
    });

    if (user) {
        // Generate verification token (could also use crypto to generate a random token)
        const verificationToken = generateToken(user._id);

        // Send verification email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            host: "smtp.gmail.com",
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        const verificationUrl = `http://localhost:5001/api/auth/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'Email Verification',
            html: `<h4>Please verify your email by clicking the link below:</h4>
                   <a href="${verificationUrl}">Verify Email</a>`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({
            message: 'User registered successfully. Please check your email for verification.',
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (!user.isVerified) {
            res.status(401);
            throw new Error('Please verify your email before logging in.');
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});


// Logout User

const logout = asyncHandler(async (req, res, next) => {
    const token = req.headers?.authorization?.split(' ')[1];
    
    // Add token to blacklist
    await TokenBlacklist.create({ token });

    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        res.status(400);
        throw new Error('Invalid or missing verification token');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID and update `isVerified` to true
    const user = await User.findById(decoded.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
});


module.exports = {
    registerUser,
    authUser,
    logout,
    verifyEmail,
};
