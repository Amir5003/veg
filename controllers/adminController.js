const asyncHandler = require('express-async-handler');
const Vendor = require('../models/vendorModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Payout = require('../models/payoutModel');
const Wallet = require('../models/walletModel');

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private - Admin only
const getAllVendors = asyncHandler(async (req, res) => {
    const { status = 'all', page = 1, limit = 10, searchTerm } = req.query;

    let filter = {};

    if (status === 'pending') {
        filter.isApproved = false;
    } else if (status === 'approved') {
        filter.isApproved = true;
    } else if (status === 'suspended') {
        filter.isActive = false;
    }

    if (searchTerm) {
        filter.$or = [
            { businessName: { $regex: searchTerm, $options: 'i' } },
            { 'address.city': { $regex: searchTerm, $options: 'i' } },
        ];
    }

    const skip = (page - 1) * limit;

    const vendors = await Vendor.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email');

    const totalVendors = await Vendor.countDocuments(filter);

    res.json({
        totalVendors,
        totalPages: Math.ceil(totalVendors / limit),
        currentPage: parseInt(page),
        vendors,
    });
});

// @desc    Get vendor details
// @route   GET /api/admin/vendors/:vendorId
// @access  Private - Admin only
const getVendorDetails = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.vendorId).populate('user', 'name email');

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    // Get vendor stats
    const Product = require('../models/productModel');
    const ShopReview = require('../models/shopReviewModel');

    const totalProducts = await Product.countDocuments({ vendor: vendor._id });
    const totalOrders = await Order.countDocuments({ 'vendors.vendor': vendor._id });
    const reviews = await ShopReview.find({ vendor: vendor._id });

    res.json({
        ...vendor.toObject(),
        stats: {
            totalProducts,
            totalOrders,
            totalReviews: reviews.length,
            avgRating: reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
                : 0,
        },
    });
});

// @desc    Approve vendor
// @route   PUT /api/admin/vendors/:vendorId/approve
// @access  Private - Admin only
const approveVendor = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.vendorId);

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    if (vendor.isApproved) {
        res.status(400);
        throw new Error('Vendor is already approved');
    }

    vendor.isApproved = true;
    vendor.approvedAt = new Date();
    vendor.rejectionReason = null;

    // Create wallet for vendor if not exists
    const wallet = await Wallet.findOne({ vendor: vendor._id });
    if (!wallet) {
        await Wallet.create({ vendor: vendor._id });
    }

    const approvedVendor = await vendor.save();

    res.json({
        message: 'Vendor approved successfully',
        vendor: approvedVendor,
    });
});

// @desc    Reject vendor
// @route   PUT /api/admin/vendors/:vendorId/reject
// @access  Private - Admin only
const rejectVendor = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.vendorId);
    const { reason } = req.body;

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    if (vendor.isApproved) {
        res.status(400);
        throw new Error('Cannot reject an already approved vendor');
    }

    vendor.rejectionReason = reason || 'No reason provided';

    const rejectedVendor = await vendor.save();

    res.json({
        message: 'Vendor rejected',
        vendor: rejectedVendor,
    });
});

// @desc    Suspend vendor
// @route   PUT /api/admin/vendors/:vendorId/suspend
// @access  Private - Admin only
const suspendVendor = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.vendorId);
    const { reason } = req.body;

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    vendor.isActive = false;
    vendor.suspensionReason = reason || 'No reason provided';

    const suspendedVendor = await vendor.save();

    res.json({
        message: 'Vendor suspended successfully',
        vendor: suspendedVendor,
    });
});

// @desc    Activate vendor
// @route   PUT /api/admin/vendors/:vendorId/activate
// @access  Private - Admin only
const activateVendor = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.vendorId);

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    vendor.isActive = true;
    vendor.suspensionReason = null;

    const activatedVendor = await vendor.save();

    res.json({
        message: 'Vendor activated successfully',
        vendor: activatedVendor,
    });
});

// @desc    Delete vendor
// @route   DELETE /api/admin/vendors/:vendorId
// @access  Private - Admin only
const deleteVendor = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.vendorId);

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    // Delete vendor's products
    const Product = require('../models/productModel');
    await Product.deleteMany({ vendor: vendor._id });

    // Delete vendor wallet
    await Wallet.deleteOne({ vendor: vendor._id });

    // Update user to remove vendor role
    await User.findByIdAndUpdate(vendor.user, { role: 'customer', vendorProfile: null });

    // Delete vendor
    await Vendor.findByIdAndDelete(vendor._id);

    res.json({ message: 'Vendor deleted successfully' });
});

// @desc    Get all payouts
// @route   GET /api/admin/payouts
// @access  Private - Admin only
const getAllPayouts = asyncHandler(async (req, res) => {
    const { status = 'all', page = 1, limit = 10 } = req.query;

    let filter = {};

    if (status !== 'all') {
        filter.status = status;
    }

    const skip = (page - 1) * limit;

    const payouts = await Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('vendor', 'businessName')
        .populate('approvedBy', 'name');

    const totalPayouts = await Payout.countDocuments(filter);

    res.json({
        totalPayouts,
        totalPages: Math.ceil(totalPayouts / limit),
        currentPage: parseInt(page),
        payouts,
    });
});

// @desc    Approve payout
// @route   PUT /api/admin/payouts/:payoutId/approve
// @access  Private - Admin only
const approvePayout = asyncHandler(async (req, res) => {
    const payout = await Payout.findById(req.params.payoutId);

    if (!payout) {
        res.status(404);
        throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
        res.status(400);
        throw new Error('Only pending payouts can be approved');
    }

    payout.status = 'approved';
    payout.approvedAt = new Date();
    payout.approvedBy = req.user._id;

    const approvedPayout = await payout.save();

    res.json({
        message: 'Payout approved successfully',
        payout: approvedPayout,
    });
});

// @desc    Process payout
// @route   PUT /api/admin/payouts/:payoutId/process
// @access  Private - Admin only
const processPayout = asyncHandler(async (req, res) => {
    const payout = await Payout.findById(req.params.payoutId);
    const { transactionId } = req.body;

    if (!payout) {
        res.status(404);
        throw new Error('Payout not found');
    }

    if (payout.status !== 'approved') {
        res.status(400);
        throw new Error('Only approved payouts can be processed');
    }

    payout.status = 'completed';
    payout.processedAt = new Date();
    payout.transactionId = transactionId;

    // Update wallet
    const wallet = await Wallet.findOne({ vendor: payout.vendor });
    if (wallet) {
        wallet.balance -= payout.amount;
        wallet.totalCommissionPaid += payout.amount;
        wallet.transactions.push({
            type: 'debit',
            amount: payout.amount,
            description: 'Payout processed',
            payout: payout._id,
        });
        await wallet.save();
    }

    const processedPayout = await payout.save();

    res.json({
        message: 'Payout processed successfully',
        payout: processedPayout,
    });
});

// @desc    Reject payout
// @route   PUT /api/admin/payouts/:payoutId/reject
// @access  Private - Admin only
const rejectPayout = asyncHandler(async (req, res) => {
    const payout = await Payout.findById(req.params.payoutId);
    const { reason } = req.body;

    if (!payout) {
        res.status(404);
        throw new Error('Payout not found');
    }

    if (payout.status === 'completed' || payout.status === 'cancelled') {
        res.status(400);
        throw new Error('This payout cannot be rejected');
    }

    payout.status = 'rejected';
    payout.rejectionReason = reason || 'No reason provided';

    // Refund to wallet if it was approved/processing
    if (payout.status === 'approved' || payout.status === 'processing') {
        const wallet = await Wallet.findOne({ vendor: payout.vendor });
        if (wallet) {
            wallet.balance += payout.amount;
            wallet.transactions.push({
                type: 'credit',
                amount: payout.amount,
                description: 'Payout rejected and refunded',
                payout: payout._id,
            });
            await wallet.save();
        }
    }

    const rejectedPayout = await payout.save();

    res.json({
        message: 'Payout rejected',
        payout: rejectedPayout,
    });
});

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private - Admin only
const getAdminDashboard = asyncHandler(async (req, res) => {
    const totalVendors = await Vendor.countDocuments();
    const approvedVendors = await Vendor.countDocuments({ isApproved: true });
    const pendingVendors = await Vendor.countDocuments({ isApproved: false });
    const suspendedVendors = await Vendor.countDocuments({ isActive: false });

    const totalOrders = await Order.countDocuments();
    const Product = require('../models/productModel');
    const totalProducts = await Product.countDocuments();

    const totalPayouts = await Payout.countDocuments();
    const pendingPayouts = await Payout.countDocuments({ status: 'pending' });

    // Revenue calculation
    const completedOrders = await Order.find({ isPaid: true });
    let platformRevenue = 0;
    completedOrders.forEach((order) => {
        order.vendors.forEach((vo) => {
            platformRevenue += vo.commissionAmount || 0;
        });
    });

    res.json({
        vendors: {
            total: totalVendors,
            approved: approvedVendors,
            pending: pendingVendors,
            suspended: suspendedVendors,
        },
        products: {
            total: totalProducts,
        },
        orders: {
            total: totalOrders,
        },
        payouts: {
            total: totalPayouts,
            pending: pendingPayouts,
        },
        revenue: {
            platformRevenue: parseFloat(platformRevenue.toFixed(2)),
        },
    });
});

module.exports = {
    getAllVendors,
    getVendorDetails,
    approveVendor,
    rejectVendor,
    suspendVendor,
    activateVendor,
    deleteVendor,
    getAllPayouts,
    approvePayout,
    processPayout,
    rejectPayout,
    getAdminDashboard,
};
