const User = require('../models/userModel');
const Vendor = require('../models/vendorModel');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/apiResponse');

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
        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store verification code in user document (expires in 15 minutes)
        user.verificationCode = verificationCode;
        user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        // Send verification email with 6-digit code
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            host: "smtp.gmail.com",
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'Email Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Email Verification</h2>
                    <p>Hi ${name},</p>
                    <p>Thank you for registering! Please use the following code to verify your email:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #4CAF50; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't register, please ignore this email.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json(
            sendSuccess(
                201,
                'User registered successfully. Please check your email for the 6-digit verification code.',
                {
                    userId: user._id,
                    role: user.role,
                    email: user.email,
                }
            )
        );
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

        res.status(200).json(
            sendSuccess(
                200,
                'Login successful',
                {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id),
                    vendorSlug: user.role === 'vendor' && user.vendorProfile ? user.vendorProfile.storeSlug : null,
                }
            )
        );
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

    res.status(200).json(
        sendSuccess(200, 'Logged out successfully')
    );
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { email, verificationCode } = req.body;

    // Validate inputs
    if (!email || !verificationCode) {
        res.status(400);
        throw new Error('Email and verification code are required');
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // If user doesn't have a verification code (old user or new code needed)
    if (!user.verificationCode) {

        // Generate new 6-digit verification code
        const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store verification code in user document (expires in 15 minutes)
        user.verificationCode = newVerificationCode;
        user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        // Send verification email with new 6-digit code
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            host: "smtp.gmail.com",
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'Email Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Email Verification</h2>
                    <p>Hi ${user.name},</p>
                    <p>Here is your verification code:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #4CAF50; letter-spacing: 5px; margin: 0;">${newVerificationCode}</h1>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't register, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.log('Email sending failed, but code was generated:', emailError.message);
        }

        res.status(400);
        throw new Error('No verification code found. A new code has been sent to your email. Please check your inbox.');
    }

    // Check if verification code matches (convert both to string for comparison)
    if (String(user.verificationCode) !== String(verificationCode)) {
        res.status(400);
        throw new Error('Invalid verification code');
    }

    // Check if code has expired
    if (user.verificationCodeExpires && new Date() > new Date(user.verificationCodeExpires)) {
        res.status(400);
        throw new Error('Verification code has expired. Please request a new code.');
    }

    // Mark email as verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    res.status(200).json(
        sendSuccess(
            200,
            'Email verified successfully. You can now log in.',
            {
                userId: user._id,
                email: user.email,
            }
        )
    );
});

// @desc    Resend verification code to email
// @route   POST /api/auth/verify-email/resend
// @access  Public
const resendVerificationCode = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Validate input
    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check if user is already verified
    if (user.isVerified) {
        res.status(400);
        throw new Error('Email is already verified. Please login.');
    }

    // Generate new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update verification code with new expiration time (15 minutes from now)
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send verification email with new 6-digit code
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        host: "smtp.gmail.com",
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: 'Email Verification Code (Resend)',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">Email Verification</h2>
                <p>Hi ${user.name},</p>
                <p>Here is your new verification code:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #4CAF50; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json(
        sendSuccess(
            200,
            'Verification code resent successfully. Please check your email.',
            { email: user.email }
        )
    );
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

    res.status(201).json(
        sendSuccess(
            201,
            'Vendor profile created successfully. Awaiting admin approval.',
            {
                vendor: {
                    _id: vendor._id,
                    storeSlug: vendor.storeSlug,
                    businessName: vendor.businessName,
                    storeUrl: `http://localhost:3000/store/${vendor.storeSlug}`,
                    isApproved: vendor.isApproved,
                }
            }
        )
    );
});

module.exports = {
    registerUser,
    authUser,
    logout,
    verifyEmail,
    resendVerificationCode,
    registerVendorProfile,
};
