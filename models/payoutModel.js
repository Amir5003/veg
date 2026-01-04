const mongoose = require('mongoose');

const payoutSchema = mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Vendor',
        },
        amount: {
            type: Number,
            required: [true, 'Please provide payout amount'],
        },
        bankDetails: {
            accountHolderName: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String,
            accountType: String,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'],
            default: 'pending',
        },
        transactionId: {
            type: String,
            default: null,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
        },
        rejectionReason: {
            type: String,
            default: null,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Admin user
            default: null,
        },
        notes: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
