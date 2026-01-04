const User = require('../models/userModel');
const Vendor = require('../models/vendorModel');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Helper function to generate vendor slug
const generateSlug = (businessName) => {
    return businessName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        + '-' + crypto.randomBytes(4).toString('hex');
};

// @desc    Register a new user (Customer or Vendor)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role = 'customer' } = req.body;

    // Validate role
    if (!['customer', 'vendor'].includes(role)) {
        res.status(400);
        throw new Error('Invalid role. Must be customer or vendor');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
        isVerified: false,
    });

    if (user) {
        // Generate verification token
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
            userId: user._id,
            role: user.role,
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

    const user = await User.findOne({ email }).populate('vendorProfile');

    if (user && (await user.matchPassword(password))) {
        if (!user.isVerified) {
            res.status(401);
            throw new Error('Please verify your email before logging in.');
        }

        // Check if vendor is approved (if vendor role)
        if (user.role === 'vendor' && user.vendorProfile) {
            if (!user.vendorProfile.isApproved) {
                res.status(403);
                throw new Error('Your vendor account is pending approval. Please wait for admin confirmation.');
            }
            if (user.vendorProfile.isSuspended) {
                res.status(403);
                throw new Error('Your vendor account has been suspended.');
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            vendorSlug: user.role === 'vendor' && user.vendorProfile ? user.vendorProfile.storeSlug : null,
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

// @desc    Register vendor profile (After email verification)
// @route   POST /api/auth/vendor-setup
// @access  Private (Verified Vendor User Only)
const registerVendorProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { businessName, businessDescription, businessLicense, phoneNumber, address } = req.body;

    // Validate user is a vendor
    const user = await User.findById(userId);
    if (!user || user.role !== 'vendor') {
        res.status(403);
        throw new Error('Only users with vendor role can create vendor profile');
    }

    // Check if vendor already exists
    if (user.vendorProfile) {
        res.status(400);
        throw new Error('Vendor profile already exists for this user');
    }

    // Validate required fields
    if (!businessName || !businessLicense || !phoneNumber || !address) {
        res.status(400);
        throw new Error('Please provide all required vendor details: businessName, businessLicense, phoneNumber, address');
    }

    // Generate unique store slug
    const storeSlug = generateSlug(businessName);

    // Create vendor profile
    const vendor = await Vendor.create({
        user: userId,
        businessName,
        businessDescription: businessDescription || '',
        businessLicense,
        phoneNumber,
        address,
        storeSlug,
        isApproved: false, // Require admin approval
        isSuspended: false,
        commissionPercentage: 10, // Default 10% commission
    });

    // Link vendor to user
    user.vendorProfile = vendor._id;
    await user.save();

    // Notify admin about new vendor registration
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        host: "smtp.gmail.com",
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: adminEmail,
        subject: `New Vendor Registration: ${businessName}`,
        html: `<h4>New vendor has registered:</h4>
               <p><strong>Business Name:</strong> ${businessName}</p>
               <p><strong>Contact Email:</strong> ${user.email}</p>
               <p><strong>Phone:</strong> ${phoneNumber}</p>
               <p>Please review and approve in the admin dashboard.</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log('Email notification failed:', error.message);
    }

    res.status(201).json({
        message: 'Vendor profile created successfully. Awaiting admin approval.',
        vendor: {
            _id: vendor._id,
            storeSlug: vendor.storeSlug,
            businessName: vendor.businessName,
            storeUrl: `http://localhost:3000/store/${vendor.storeSlug}`,
            isApproved: vendor.isApproved,
        },
    });
});

module.exports = {
    registerUser,
    authUser,
    logout,
    verifyEmail,
    registerVendorProfile,
};
