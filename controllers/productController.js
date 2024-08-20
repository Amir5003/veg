const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');

// Add a new product
// const addProduct = asyncHandler(async (req, res) => {
//     const { name, description, price } = req.body;
//     const image = req.file ? req.file.path : null;
//     console.log("asas--->",req.body , image)

//     if (!name || !description || !price || !image) {
//         res.status(400);
//         throw new Error('Please provide all required fields');
//     }

//     const product = new Product({
//         name,
//         description,
//         price,
//         image,
//     });

//     const createdProduct = await product.save();
//     res.status(201).json(createdProduct);
// });
const addProduct = asyncHandler(async (req, res) => {
    const { name, description, price, category, quantity } = req.body;
    const image = req.file ? req.file.path : null;

    // Validate each field
    if (!name) {
        res.status(400);
        throw new Error('Product name is required');
    }
    if (!description) {
        res.status(400);
        throw new Error('Product description is required');
    }
    if (!price) {
        res.status(400);
        throw new Error('Product price is required');
    }
    if (!category) {
        res.status(400);
        throw new Error('Product category is required');
    }
    if (!quantity) {
        res.status(400);
        throw new Error('Product quantity is required');
    }
    if (!image) {
        res.status(400);
        throw new Error('Product image is required');
    }

    // If all fields are valid, create the product
    const product = new Product({
        name,
        description,
        price,
        category,
        quantity,
        image,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});
// Get all products
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({});
    res.json(products);
});

// Get product by ID
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    res.json(product);
});

module.exports = {
    addProduct,
    getProducts,
    getProductById,
};
