const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        vendors: [
            {
                vendor: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: 'Vendor',
                },
                items: [
                    {
                        name: { type: String, required: true },
                        quantity: { type: Number, required: true },
                        image: { type: String, required: true },
                        price: { type: Number, required: true },
                        product: {
                            type: mongoose.Schema.Types.ObjectId,
                            required: true,
                            ref: 'Product',
                        },
                    },
                ],
                vendorSubtotal: {
                    type: Number,
                    required: true,
                    default: 0.0,
                },
                commissionAmount: {
                    type: Number,
                    default: 0.0,
                },
                vendorEarnings: {
                    type: Number,
                    default: 0.0,
                },
                vendorStatus: {
                    type: String,
                    enum: ['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'],
                    default: 'pending',
                },
                vendorShippingAddress: {
                    address: { type: String },
                    city: { type: String },
                    postalCode: { type: String },
                    country: { type: String },
                },
                shippingPrice: {
                    type: Number,
                    default: 0.0,
                },
                tracking: {
                    trackingNumber: String,
                    carrier: String,
                    estimatedDelivery: Date,
                },
            },
        ],
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentResult: {
            id: { type: String },
            status: { type: String },
            update_time: { type: String },
            email_address: { type: String },
        },
        taxPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        shippingPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        totalPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        paidAt: {
            type: Date,
        },
        isDelivered: {
            type: Boolean,
            required: true,
            default: false,
        },
        deliveredAt: {
            type: Date,
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
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

// Normalize status fields to lowercase before validation
orderSchema.pre('validate', function (next) {
    if (this.orderStatus) {
        this.orderStatus = this.orderStatus.toLowerCase();
    }

    if (Array.isArray(this.vendors)) {
        this.vendors = this.vendors.map((vendorOrder) => {
            if (vendorOrder.vendorStatus) {
                vendorOrder.vendorStatus = vendorOrder.vendorStatus.toLowerCase();
            }
            if (vendorOrder.tracking && vendorOrder.tracking.status) {
                vendorOrder.tracking.status = vendorOrder.tracking.status.toLowerCase();
            }
            return vendorOrder;
        });
    }

    next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
