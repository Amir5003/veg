const User = require('../models/userModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');

// @desc    Add a product to the cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const cartItemIndex = user.cart.findIndex((item) => item.product.toString() === productId);

    if (cartItemIndex >= 0) {
        // If product already exists in cart, update its quantity
        user.cart[cartItemIndex].quantity += Number(quantity);
    } else {
        // If product doesn't exist in cart, add it
        user.cart.push({ product: productId, quantity });
    }

    await user.save();

    res.status(201).json(user.cart);
});

// @desc    Remove a product from the cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { productId } = req.body;
    user.cart = user.cart.filter((item) => item.product.toString() !== productId);

    await user.save();

    res.status(200).json(user.cart);
});

// @desc    Get the user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('cart.product', 'name price');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json(user.cart);
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:productId
// @access  Private
const updateCartQuantity = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { quantity, productId } = req.body;

    const cartItemIndex = user.cart.findIndex((item) => item.product.toString() === productId);

    if (cartItemIndex >= 0) {
        user.cart[cartItemIndex].quantity = quantity;
    } else {
        res.status(404);
        throw new Error('Product not found in cart');
    }

    await user.save();

    res.status(200).json(user.cart);
});

module.exports = {
    addToCart,
    removeFromCart,
    getCart,
    updateCartQuantity,
};
