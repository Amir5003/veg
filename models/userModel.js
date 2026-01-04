const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        isVerified: {
            type: Boolean,
            default: false, // Initially, the user is not verified
        },
        role: {
            type: String,
            enum: ['customer', 'vendor', 'admin'],
            default: 'customer',
        },
        cart: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                },
                vendor: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Vendor',
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 1,
                },
            },
        ],
        vendorProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            default: null,
        },
        verificationCode: {
            type: String,
            default: null,
        },
        verificationCodeExpires: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
