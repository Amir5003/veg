const asyncHandler = require('express-async-handler');
const Vendor = require('../models/vendorModel');
const Product = require('../models/productModel');
const ShopReview = require('../models/shopReviewModel');

// @desc    Get vendor store by slug (Public)
// @route   GET /api/store/:slug
// @access  Public
const getStoreBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    if (!slug) {
        res.status(400);
        throw new Error('Store slug is required');
    }

    const vendor = await Vendor.findOne({ storeSlug: slug });

    if (!vendor) {
        res.status(404);
        throw new Error('Store not found');
    }

    if (!vendor.isApproved || vendor.isSuspended) {
        res.status(403);
        throw new Error('Store is not available');
    }

    // Get store statistics
    const totalProducts = await Product.countDocuments({
        vendor: vendor._id,
        isActive: true,
    });

    const totalOrders = await Product.aggregate([
        {
            $match: { vendor: vendor._id },
        },
    ]);

    // Get average rating from reviews
    const reviewStats = await ShopReview.aggregate([
        {
            $match: { vendor: vendor._id, status: 'approved' },
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
            },
        },
    ]);

    const avgRating = reviewStats.length > 0 ? reviewStats[0].averageRating : 0;
    const totalReviews = reviewStats.length > 0 ? reviewStats[0].totalReviews : 0;

    res.json({
        store: {
            _id: vendor._id,
            businessName: vendor.businessName,
            businessDescription: vendor.businessDescription,
            logo: vendor.logo,
            banner: vendor.banner,
            storeSlug: vendor.storeSlug,
            rating: vendor.rating || avgRating,
            totalProducts,
            totalReviews,
            address: vendor.address,
            phoneNumber: vendor.phoneNumber,
        },
    });
});

// @desc    Get products from vendor store by slug (Public)
// @route   GET /api/store/:slug/products
// @access  Public
const getStoreProducts = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { category, minPrice, maxPrice, searchTerm, page = 1, limit = 10 } = req.query;

    if (!slug) {
        res.status(400);
        throw new Error('Store slug is required');
    }

    const vendor = await Vendor.findOne({ storeSlug: slug });

    if (!vendor) {
        res.status(404);
        throw new Error('Store not found');
    }

    if (!vendor.isApproved || vendor.isSuspended) {
        res.status(403);
        throw new Error('Store is not available');
    }

    // Build filter
    let filter = { vendor: vendor._id, isActive: true };

    if (category) {
        filter.category = category;
    }

    if (searchTerm) {
        filter.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
        ];
    }

    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) {
            filter.price.$gte = parseFloat(minPrice);
        }
        if (maxPrice) {
            filter.price.$lte = parseFloat(maxPrice);
        }
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    // Get unique categories in this store
    const categories = await Product.distinct('category', {
        vendor: vendor._id,
        isActive: true,
    });

    res.json({
        vendor: {
            _id: vendor._id,
            businessName: vendor.businessName,
            logo: vendor.logo,
            storeSlug: vendor.storeSlug,
            rating: vendor.rating,
        },
        filters: {
            categories,
        },
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalProducts: total,
        },
        products,
    });
});

// @desc    Get store reviews (Public)
// @route   GET /api/store/:slug/reviews
// @access  Public
const getStoreReviews = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!slug) {
        res.status(400);
        throw new Error('Store slug is required');
    }

    const vendor = await Vendor.findOne({ storeSlug: slug });

    if (!vendor) {
        res.status(404);
        throw new Error('Store not found');
    }

    const skip = (page - 1) * limit;

    const reviews = await ShopReview.find({
        vendor: vendor._id,
        status: 'approved',
    })
        .populate('customer', 'name')
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });

    const total = await ShopReview.countDocuments({
        vendor: vendor._id,
        status: 'approved',
    });

    res.json({
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalReviews: total,
        },
        reviews,
    });
});

// @desc    Submit review for vendor store (Private - Customer)
// @route   POST /api/store/:slug/reviews
// @access  Private (Customer only)
const submitStoreReview = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { rating, comment } = req.body;

    if (!slug || !rating || !comment) {
        res.status(400);
        throw new Error('Store slug, rating, and comment are required');
    }

    if (rating < 1 || rating > 5) {
        res.status(400);
        throw new Error('Rating must be between 1 and 5');
    }

    const vendor = await Vendor.findOne({ storeSlug: slug });

    if (!vendor) {
        res.status(404);
        throw new Error('Store not found');
    }

    // Check if customer already reviewed this vendor
    const existingReview = await ShopReview.findOne({
        vendor: vendor._id,
        customer: req.user._id,
    });

    if (existingReview) {
        res.status(400);
        throw new Error('You have already reviewed this store');
    }

    const review = await ShopReview.create({
        vendor: vendor._id,
        customer: req.user._id,
        rating,
        comment,
        status: 'pending', // Require approval
    });

    res.status(201).json({
        message: 'Review submitted successfully. Awaiting admin approval.',
        review,
    });
});

// @desc    Get store info and analytics (Private - Vendor only)
// @route   GET /api/store/info/me
// @access  Private (Vendor only)
const getMyStoreInfo = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findOne({ user: req.user._id });

    if (!vendor) {
        res.status(404);
        throw new Error('Vendor profile not found');
    }

    const totalProducts = await Product.countDocuments({ vendor: vendor._id });
    const totalActiveProducts = await Product.countDocuments({
        vendor: vendor._id,
        isActive: true,
    });

    const reviewStats = await ShopReview.aggregate([
        {
            $match: { vendor: vendor._id, status: 'approved' },
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
            },
        },
    ]);

    const storeUrl = `http://localhost:3000/store/${vendor.storeSlug}`;

    res.json({
        store: {
            _id: vendor._id,
            businessName: vendor.businessName,
            businessDescription: vendor.businessDescription,
            logo: vendor.logo,
            banner: vendor.banner,
            storeSlug: vendor.storeSlug,
            storeUrl,
            isApproved: vendor.isApproved,
            isSuspended: vendor.isSuspended,
            rating: vendor.rating,
            totalProducts,
            totalActiveProducts,
            totalReviews: reviewStats.length > 0 ? reviewStats[0].totalReviews : 0,
            averageRating: reviewStats.length > 0 ? reviewStats[0].averageRating : 0,
        },
    });
});

module.exports = {
    getStoreBySlug,
    getStoreProducts,
    getStoreReviews,
    submitStoreReview,
    getMyStoreInfo,
};
