const asyncHandler = require('express-async-handler');
const Vendor = require('../models/vendorModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const ShopReview = require('../models/shopReviewModel');

// @desc    Get vendor profile
// @route   GET /api/vendor/profile
// @access  Private - Vendor only
const getVendorProfile = asyncHandler(async (req, res) => {
    const vendor = req.vendor;

    res.json(vendor);
});

// @desc    Update vendor profile
// @route   PUT /api/vendor/profile
// @access  Private - Vendor only
const updateVendorProfile = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { businessName, businessDescription, phoneNumber, address } = req.body;

    if (businessName) vendor.businessName = businessName;
    if (businessDescription) vendor.businessDescription = businessDescription;
    if (phoneNumber) vendor.phoneNumber = phoneNumber;
    if (address) {
        vendor.address = {
            ...vendor.address,
            ...address,
        };
    }

    if (req.files) {
        if (req.files.logo) {
            vendor.logo = req.files.logo[0].path;
        }
        if (req.files.banner) {
            vendor.banner = req.files.banner[0].path;
        }
    }

    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
});

// @desc    Update bank details
// @route   PUT /api/vendor/bank-details
// @access  Private - Vendor only
const updateBankDetails = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { accountHolderName, accountNumber, bankName, ifscCode, accountType } = req.body;

    if (!accountNumber || !bankName) {
        res.status(400);
        throw new Error('Account number and bank name are required');
    }

    vendor.bankDetails = {
        accountHolderName: accountHolderName || vendor.bankDetails.accountHolderName,
        accountNumber,
        bankName,
        ifscCode: ifscCode || vendor.bankDetails.ifscCode,
        accountType: accountType || vendor.bankDetails.accountType,
    };

    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
});

// @desc    Get vendor dashboard stats
// @route   GET /api/vendor/dashboard
// @access  Private - Vendor only
const getVendorDashboard = asyncHandler(async (req, res) => {
    const vendor = req.vendor;

    // Get stats
    const totalProducts = await Product.countDocuments({ vendor: vendor._id });
    const totalOrders = await Order.countDocuments({ 'vendors.vendor': vendor._id });
    const totalSales = vendor.totalSales || 0;

    // Get recent orders
    const recentOrders = await Order.find({ 'vendors.vendor': vendor._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id createdAt orderStatus vendors totalPrice')
        .populate('customer', 'name email');

    // Get wallet info
    let wallet = await Wallet.findOne({ vendor: vendor._id });
    if (!wallet) {
        wallet = await Wallet.create({ vendor: vendor._id });
    }

    // Get ratings
    const reviews = await ShopReview.find({ vendor: vendor._id });
    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
        : 0;

    res.json({
        vendor: {
            id: vendor._id,
            businessName: vendor.businessName,
            isApproved: vendor.isApproved,
            isActive: vendor.isActive,
        },
        stats: {
            totalProducts,
            totalOrders,
            totalSales,
            avgRating,
            totalReviews: reviews.length,
        },
        wallet: {
            balance: wallet.balance,
            totalEarnings: wallet.totalEarnings,
            totalCommissionPaid: wallet.totalCommissionPaid,
        },
        recentOrders,
    });
});

// @desc    Get vendor's orders
// @route   GET /api/vendor/orders
// @access  Private - Vendor only
const getVendorOrders = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { 'vendors.vendor': vendor._id };

    if (status) {
        filter['vendors.vendorStatus'] = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customer', 'name email')
        .select('_id createdAt orderStatus totalPrice vendors');

    const totalOrders = await Order.countDocuments(filter);

    res.json({
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
        orders,
    });
});

// @desc    Update vendor order status
// @route   PUT /api/vendor/orders/:orderId/status
// @access  Private - Vendor only
const updateVendorOrderStatus = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { orderId } = req.params;
    const { status, trackingNumber, carrier, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findById(orderId);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Find vendor's items in order
    const vendorOrder = order.vendors.find((vo) => vo.vendor.toString() === vendor._id.toString());
    if (!vendorOrder) {
        res.status(403);
        throw new Error('Not authorized to update this order');
    }

    // Update vendor order status
    vendorOrder.vendorStatus = status;

    if (trackingNumber) {
        vendorOrder.tracking = {
            trackingNumber,
            carrier: carrier || 'Unknown',
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        };
    }

    if (notes) {
        order.notes = notes;
    }

    // Update main order status if all vendors have delivered
    const allDelivered = order.vendors.every((vo) => vo.vendorStatus === 'delivered');
    if (allDelivered) {
        order.orderStatus = 'delivered';
        order.isDelivered = true;
        order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
});

// @desc    Get vendor earnings
// @route   GET /api/vendor/earnings
// @access  Private - Vendor only
const getVendorEarnings = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { period = 'month' } = req.query; // 'day', 'week', 'month', 'year'

    let dateFilter = {};
    const now = new Date();

    if (period === 'day') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        dateFilter = { createdAt: { $gte: startOfWeek } };
    } else if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
    } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { $gte: startOfYear } };
    }

    // Get wallet
    const wallet = await Wallet.findOne({ vendor: vendor._id });

    // Get completed orders
    const orders = await Order.find({
        'vendors.vendor': vendor._id,
        'vendors.vendorStatus': 'delivered',
        ...dateFilter,
    });

    let totalEarnings = 0;
    let totalOrders = 0;
    let totalCommission = 0;

    orders.forEach((order) => {
        const vendorOrder = order.vendors.find((vo) => vo.vendor.toString() === vendor._id.toString());
        if (vendorOrder) {
            totalEarnings += vendorOrder.vendorEarnings || 0;
            totalCommission += vendorOrder.commissionAmount || 0;
            totalOrders++;
        }
    });

    res.json({
        period,
        totalOrders,
        totalEarnings,
        totalCommission,
        averageOrderValue: totalOrders > 0 ? (totalEarnings / totalOrders).toFixed(2) : 0,
        wallet: {
            balance: wallet?.balance || 0,
            totalEarnings: wallet?.totalEarnings || 0,
            totalCommissionPaid: wallet?.totalCommissionPaid || 0,
        },
    });
});

// @desc    Request payout
// @route   POST /api/vendor/payout-request
// @access  Private - Vendor only
const requestPayout = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { amount, notes } = req.body;

    const wallet = await Wallet.findOne({ vendor: vendor._id });

    if (!wallet || wallet.balance < amount) {
        res.status(400);
        throw new Error('Insufficient balance for payout');
    }

    if (!vendor.bankDetails.accountNumber) {
        res.status(400);
        throw new Error('Bank details not configured');
    }

    const Payout = require('../models/payoutModel');
    const payout = await Payout.create({
        vendor: vendor._id,
        amount,
        bankDetails: vendor.bankDetails,
        notes,
    });

    res.status(201).json({
        message: 'Payout request submitted successfully',
        payout,
    });
});

// @desc    Get vendor reviews
// @route   GET /api/vendor/reviews
// @access  Private - Vendor only
const getVendorReviews = asyncHandler(async (req, res) => {
    const vendor = req.vendor;
    const { page = 1, limit = 10, status = 'approved' } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await ShopReview.find({ vendor: vendor._id, status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customer', 'name');

    const totalReviews = await ShopReview.countDocuments({ vendor: vendor._id, status });

    res.json({
        totalReviews,
        totalPages: Math.ceil(totalReviews / limit),
        currentPage: page,
        reviews,
    });
});

module.exports = {
    getVendorProfile,
    updateVendorProfile,
    updateBankDetails,
    getVendorDashboard,
    getVendorOrders,
    updateVendorOrderStatus,
    getVendorEarnings,
    requestPayout,
    getVendorReviews,
};
