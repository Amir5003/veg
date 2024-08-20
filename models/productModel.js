const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please enter the product name'],
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
        stock: {
            type: Boolean, // Stock availability
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
