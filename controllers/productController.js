const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');
const Vendor = require('../models/vendorModel');
const crypto = require('crypto');

// Add a new product (Vendor only)
const addProduct = asyncHandler(async (req, res) => {
    const { name, description, price, category, quantity, sku } = req.body;
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

    // Get vendor from req (set by vendorOnly middleware)
    const vendor = req.vendor;

    // If all fields are valid, create the product
    const product = new Product({
        vendor: vendor._id,
        name,
        description,
        price,
        category,
        quantity,
        image,
        sku: sku || `SKU-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
    });

    const createdProduct = await product.save();

    // Update vendor's product count
    await Vendor.findByIdAndUpdate(vendor._id, {
        $inc: { totalProducts: 1 },
    });

    res.status(201).json(createdProduct);
});

// Get all products (Public - All vendors)
const getProducts = asyncHandler(async (req, res) => {
    const { category, minPrice, maxPrice, searchTerm } = req.query;

    let filter = { isActive: true };

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

    const products = await Product.find(filter).populate('vendor', 'businessName logo rating');

    res.json(products);
});

// Get product by ID
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('vendor', 'businessName logo rating businessDescription followers');

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    res.json(product);
});

// Get vendor's products (Vendor Dashboard)
const getVendorProducts = asyncHandler(async (req, res) => {
    const vendor = req.vendor;

    const products = await Product.find({ vendor: vendor._id }).select(
        'name price quantity stock rating image category createdAt updatedAt'
    );

    res.json({
        totalProducts: products.length,
        products,
    });
});

// Get products by specific vendor (Public)
const getProductsByVendor = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { category } = req.query;

    // Verify vendor exists and is approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.isApproved) {
        res.status(404);
        throw new Error('Vendor not found or not approved');
    }

    let filter = { vendor: vendorId, isActive: true };

    if (category) {
        filter.category = category;
    }

    const products = await Product.find(filter);

    res.json({
        vendor: {
            id: vendor._id,
            businessName: vendor.businessName,
            logo: vendor.logo,
            rating: vendor.rating,
            totalReviews: vendor.totalReviews,
            followers: vendor.followers,
        },
        products,
    });
});

// Update product (Vendor only - own products)
const updateProduct = asyncHandler(async (req, res) => {
    const product = req.product; // Set by vendorOwnsProduct middleware
    const { name, description, price, category, quantity, sku } = req.body;

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (quantity) product.quantity = quantity;
    if (sku) product.sku = sku;
    if (req.file) product.image = req.file.path;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
});

// Delete product (Vendor only - own products)
const deleteProduct = asyncHandler(async (req, res) => {
    const product = req.product; // Set by vendorOwnsProduct middleware

    await Product.findByIdAndDelete(product._id);

    // Update vendor's product count
    await Vendor.findByIdAndUpdate(req.vendor._id, {
        $inc: { totalProducts: -1 },
    });

    res.json({ message: 'Product deleted successfully' });
});

module.exports = {
    addProduct,
    getProducts,
    getProductById,
    getVendorProducts,
    getProductsByVendor,
    updateProduct,
    deleteProduct,
};
