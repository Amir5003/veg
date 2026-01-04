const mongoose = require('mongoose');

const vendorSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            unique: true,
        },
        businessName: {
            type: String,
            required: [true, 'Please enter business name'],
        },
        businessDescription: {
            type: String,
            default: '',
        },
        storeSlug: {
            type: String,
            unique: true,
            sparse: true,
        },
        businessLicense: {
            type: String,
            required: [true, 'Please provide business license'],
        },
        logo: {
            type: String,
            default: null,
        },
        banner: {
            type: String,
            default: null,
        },
        phoneNumber: {
            type: String,
            required: [true, 'Please provide phone number'],
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            country: { type: String, required: true },
            postalCode: { type: String, required: true },
        },
        bankDetails: {
            accountHolderName: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String,
            accountType: String, // 'savings' or 'current'
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        rejectionReason: {
            type: String,
            default: null,
        },
        isSuspended: {
            type: Boolean,
            default: false,
        },
        suspensionReason: {
            type: String,
            default: null,
        },
        rating: {
            type: Number,
            default: 0,
            min: [0, 'Rating cannot be below 0'],
            max: [5, 'Rating cannot be above 5'],
        },
        totalReviews: {
            type: Number,
            default: 0,
        },
        totalProducts: {
            type: Number,
            default: 0,
        },
        totalSales: {
            type: Number,
            default: 0,
        },
        totalOrders: {
            type: Number,
            default: 0,
        },
        commissionPercentage: {
            type: Number,
            default: 10, // Default 10% commission
        },
        followers: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
