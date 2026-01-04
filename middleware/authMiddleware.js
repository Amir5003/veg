// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Vendor = require('../models/vendorModel');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Check if token is blacklisted
            const isBlacklisted = await TokenBlacklist.findOne({ token });
            if (isBlacklisted) {
                res.status(401);
                throw new Error('Token has been blacklisted');
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user.isVerified) {
                res.status(401);
                throw new Error('Please verify your email.');
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

// Middleware to check if user is a vendor
const vendorOnly = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'vendor') {
        res.status(403);
        throw new Error('Only vendors can access this resource');
    }

    // Get vendor profile
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
        res.status(404);
        throw new Error('Vendor profile not found');
    }

    if (!vendor.isApproved) {
        res.status(403);
        throw new Error('Your vendor profile is not approved yet');
    }

    if (!vendor.isActive) {
        res.status(403);
        throw new Error('Your vendor account is suspended');
    }

    req.vendor = vendor;
    next();
});

// Middleware to check if user is an admin
const adminOnly = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Only administrators can access this resource');
    }
    next();
});

// Middleware to verify vendor owns the product
const vendorOwnsProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    // Check if product belongs to the vendor
    if (product.vendor.toString() !== req.vendor._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to update this product');
    }

    req.product = product;
    next();
});

// Middleware to verify vendor owns the order
const vendorOwnsOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Check if vendor has items in this order
    const vendorOrder = order.vendors.find(
        (vo) => vo.vendor.toString() === req.vendor._id.toString()
    );

    if (!vendorOrder) {
        res.status(403);
        throw new Error('Not authorized to access this order');
    }

    req.order = order;
    req.vendorOrder = vendorOrder;
    next();
});

module.exports = { protect, vendorOnly, adminOnly, vendorOwnsProduct, vendorOwnsOrder };

