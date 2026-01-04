const mongoose = require('mongoose');

const shopReviewSchema = mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Vendor',
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        rating: {
            type: Number,
            required: [true, 'Please provide a rating'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        title: {
            type: String,
            required: [true, 'Please provide a review title'],
        },
        comment: {
            type: String,
            required: [true, 'Please provide a comment'],
        },
        helpful: {
            type: Number,
            default: 0,
        },
        notHelpful: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate reviews from same customer for same vendor
shopReviewSchema.index({ vendor: 1, customer: 1 }, { unique: true });

const ShopReview = mongoose.model('ShopReview', shopReviewSchema);

module.exports = ShopReview;
