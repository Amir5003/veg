const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Please provide vendor'],
            ref: 'Vendor',
        },
        name: {
            type: String,
            required: [true, 'Please enter the product name'],
        },
        sku: {
            type: String,
            unique: true,
            sparse: true,
        },
        price: {
            type: Number,
            required: [true, 'Please enter the product price'],
        },
        description: {
            type: String,
            required: [true, 'Please enter the product description'],
        },
        quantity: {
            type: Number,
            required: [true, 'Please enter the product quantity'],
        },
        image: {
            type: String, // URL or path to the image
            required: [true, 'Please provide the product image URL'],
        },
        images: [
            {
                type: String,
            },
        ],
        category: {
            type: String, // Product category
            required: [true, 'Please enter the product category'],
        },
        rating: {
            type: Number, // Product rating
            default: 0,
            min: [0, 'Rating cannot be below 0'],
            max: [5, 'Rating cannot be above 5'],
        },
        totalReviews: {
            type: Number,
            default: 0,
        },
        stock: {
            type: Boolean, // Stock availability
            default: true,
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

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
