const mongoose = require('mongoose');

const walletSchema = mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Vendor',
            unique: true,
        },
        balance: {
            type: Number,
            default: 0,
        },
        totalEarnings: {
            type: Number,
            default: 0,
        },
        totalCommissionPaid: {
            type: Number,
            default: 0,
        },
        totalRefunds: {
            type: Number,
            default: 0,
        },
        transactions: [
            {
                type: {
                    type: String,
                    enum: ['credit', 'debit', 'refund', 'commission'],
                    required: true,
                },
                amount: {
                    type: Number,
                    required: true,
                },
                description: String,
                order: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Order',
                },
                payout: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Payout',
                },
                date: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
