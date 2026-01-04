const User = require('../models/userModel');
const Product = require('../models/productModel');
const Vendor = require('../models/vendorModel');
const asyncHandler = require('express-async-handler');

// @desc    Add a product to the cart
// @route   POST /api/cart/add
// @access  Private (Customer)
const addToCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
        res.status(400);
        throw new Error('Product ID and quantity are required');
    }

    const product = await Product.findById(productId).populate('vendor');

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    if (!product.vendor || !product.vendor.isApproved) {
        res.status(400);
        throw new Error('Product vendor is not available');
    }

    // Check if product quantity is available
    if (product.quantity < quantity) {
        res.status(400);
        throw new Error('Insufficient product quantity available');
    }

    // Check if product already exists in cart
    const cartItemIndex = user.cart.findIndex(
        (item) => item.product.toString() === productId
    );

    if (cartItemIndex >= 0) {
        // If product already exists in cart, update its quantity
        user.cart[cartItemIndex].quantity += Number(quantity);
    } else {
        // If product doesn't exist in cart, add it with vendor reference
        user.cart.push({
            product: productId,
            vendor: product.vendor._id,
            quantity: Number(quantity),
        });
    }

    await user.save();

    // Return cart with product details
    const populatedCart = await User.findById(user._id)
        .populate('cart.product', 'name price image')
        .populate('cart.vendor', 'businessName logo storeSlug');

    res.status(201).json({
        message: 'Product added to cart',
        cart: populatedCart.cart,
    });
});

// @desc    Remove a product from the cart
// @route   DELETE /api/cart/remove
// @access  Private (Customer)
const removeFromCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { productId } = req.body;

    if (!productId) {
        res.status(400);
        throw new Error('Product ID is required');
    }

    user.cart = user.cart.filter((item) => item.product.toString() !== productId);

    await user.save();

    const populatedCart = await User.findById(user._id)
        .populate('cart.product', 'name price image')
        .populate('cart.vendor', 'businessName logo storeSlug');

    res.status(200).json({
        message: 'Product removed from cart',
        cart: populatedCart.cart,
    });
});

// @desc    Get the user's cart
// @route   GET /api/cart
// @access  Private (Customer)
const getCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('cart.product', 'name price image category')
        .populate('cart.vendor', 'businessName logo storeSlug rating');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Group cart items by vendor
    const groupedByVendor = {};
    let totalPrice = 0;
    let totalItems = 0;

    user.cart.forEach((item) => {
        if (!item.vendor) {
            return; // Skip items without vendor
        }

        const vendorId = item.vendor._id.toString();

        if (!groupedByVendor[vendorId]) {
            groupedByVendor[vendorId] = {
                vendor: {
                    _id: item.vendor._id,
                    businessName: item.vendor.businessName,
                    logo: item.vendor.logo,
                    storeSlug: item.vendor.storeSlug,
                    rating: item.vendor.rating,
                },
                items: [],
                subtotal: 0,
            };
        }

        const itemTotal = item.product.price * item.quantity;
        groupedByVendor[vendorId].items.push({
            product: item.product,
            quantity: item.quantity,
            itemPrice: itemTotal,
        });

        groupedByVendor[vendorId].subtotal += itemTotal;
        totalPrice += itemTotal;
        totalItems += item.quantity;
    });

    const vendorGroups = Object.values(groupedByVendor);

    res.status(200).json({
        totalItems,
        totalPrice,
        cartSummary: vendorGroups,
    });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private (Customer)
const updateCartQuantity = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { quantity, productId } = req.body;

    if (!productId || !quantity) {
        res.status(400);
        throw new Error('Product ID and quantity are required');
    }

    if (quantity <= 0) {
        res.status(400);
        throw new Error('Quantity must be greater than 0');
    }

    // Verify product exists and has sufficient quantity
    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    if (product.quantity < quantity) {
        res.status(400);
        throw new Error('Insufficient product quantity available');
    }

    const cartItemIndex = user.cart.findIndex(
        (item) => item.product.toString() === productId
    );

    if (cartItemIndex >= 0) {
        user.cart[cartItemIndex].quantity = quantity;
    } else {
        res.status(404);
        throw new Error('Product not found in cart');
    }

    await user.save();

    const populatedCart = await User.findById(user._id)
        .populate('cart.product', 'name price image')
        .populate('cart.vendor', 'businessName logo storeSlug');

    res.status(200).json({
        message: 'Cart updated',
        cart: populatedCart.cart,
    });
});

// @desc    Clear user's cart
// @route   DELETE /api/cart
// @access  Private (Customer)
const clearCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();

    res.status(200).json({
        message: 'Cart cleared',
    });
});

module.exports = {
    addToCart,
    removeFromCart,
    getCart,
    updateCartQuantity,
    clearCart,
};
