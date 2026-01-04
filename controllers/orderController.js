const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Vendor = require('../models/vendorModel');
const Wallet = require('../models/walletModel');
const asyncHandler = require('express-async-handler');

// @desc    Create new multi-vendor order
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = asyncHandler(async (req, res) => {
    const {
        shippingAddress,
        paymentMethod,
        taxPrice = 0,
        shippingPrice = 0,
    } = req.body;

    // Validate required fields
    if (!shippingAddress || !paymentMethod) {
        res.status(400);
        throw new Error('Shipping address and payment method are required');
    }

    // Get user and cart
    const user = await User.findById(req.user._id)
        .populate('cart.product')
        .populate('cart.vendor');

    if (!user || user.cart.length === 0) {
        res.status(400);
        throw new Error('Cart is empty');
    }

    // Group cart items by vendor
    const vendorOrders = {};
    let totalPrice = 0;

    user.cart.forEach((cartItem) => {
        if (!cartItem.vendor || !cartItem.product) {
            return;
        }

        const vendorId = cartItem.vendor._id.toString();
        const itemTotal = cartItem.product.price * cartItem.quantity;

        if (!vendorOrders[vendorId]) {
            vendorOrders[vendorId] = {
                vendor: cartItem.vendor._id,
                items: [],
                subtotal: 0,
            };
        }

        vendorOrders[vendorId].items.push({
            product: cartItem.product._id,
            name: cartItem.product.name,
            quantity: cartItem.quantity,
            price: cartItem.product.price,
            image: cartItem.product.image,
        });

        vendorOrders[vendorId].subtotal += itemTotal;
        totalPrice += itemTotal;
    });

    // Calculate per-vendor commission and earnings
    const vendorsData = [];
    for (const vendorId in vendorOrders) {
        const vendorData = vendorOrders[vendorId];
        const vendor = await Vendor.findById(vendorId);

        if (!vendor) {
            res.status(400);
            throw new Error('Invalid vendor in cart');
        }

        const commissionAmount = (vendorData.subtotal * vendor.commissionPercentage) / 100;
        const vendorEarnings = vendorData.subtotal - commissionAmount;

        vendorsData.push({
            vendor: vendorId,
            items: vendorData.items,
            vendorSubtotal: vendorData.subtotal,
            commissionAmount,
            commissionPercentage: vendor.commissionPercentage,
            vendorEarnings,
            vendorStatus: 'PENDING',
            vendorShippingAddress: shippingAddress,
            tracking: {
                trackingNumber: null,
                carrier: null,
                status: 'NOT_SHIPPED',
            },
        });
    }

    // Create parent order
    const order = new Order({
        customer: req.user._id,
        vendors: vendorsData,
        shippingAddress,
        paymentMethod,
        taxPrice: parseFloat(taxPrice),
        shippingPrice: parseFloat(shippingPrice),
        totalPrice: totalPrice + parseFloat(taxPrice) + parseFloat(shippingPrice),
        isPaid: true, // Assuming payment is already processed
        paidAt: Date.now(),
        orderStatus: 'PENDING',
    });

    const createdOrder = await order.save();

    // Update product quantities and vendor stats
    for (const cartItem of user.cart) {
        await Product.findByIdAndUpdate(
            cartItem.product._id,
            { $inc: { quantity: -cartItem.quantity } }
        );
    }

    // Update vendor wallet and earnings
    for (const vendorData of vendorsData) {
        let wallet = await Wallet.findOne({ vendor: vendorData.vendor });

        if (!wallet) {
            wallet = await Wallet.create({
                vendor: vendorData.vendor,
                balance: 0,
                totalEarnings: 0,
                totalCommissionPaid: 0,
                transactions: [],
            });
        }

        // Add earnings transaction
        wallet.balance += vendorData.vendorEarnings;
        wallet.totalEarnings += vendorData.vendorEarnings;
        wallet.transactions.push({
            type: 'credit',
            amount: vendorData.vendorEarnings,
            description: `Order ${createdOrder._id}`,
            orderId: createdOrder._id,
            date: new Date(),
        });

        // Add commission transaction
        wallet.totalCommissionPaid += vendorData.commissionAmount;
        wallet.transactions.push({
            type: 'commission',
            amount: vendorData.commissionAmount,
            description: `Commission for order ${createdOrder._id}`,
            orderId: createdOrder._id,
            date: new Date(),
        });

        await wallet.save();

        // Update vendor stats
        await Vendor.findByIdAndUpdate(
            vendorData.vendor,
            { $inc: { totalOrders: 1 } }
        );
    }

    // Clear user's cart
    user.cart = [];
    await user.save();

    // Populate and return order details
    const populatedOrder = await Order.findById(createdOrder._id)
        .populate('customer', 'name email')
        .populate('vendors.vendor', 'businessName logo storeSlug');

    res.status(201).json({
        message: 'Order created successfully. Parent order created, split by vendors.',
        order: populatedOrder,
    });
});

// @desc    Get logged in user's orders (Customer)
// @route   GET /api/orders
// @access  Private (Customer)
const getUserOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ customer: req.user._id })
        .populate('vendors.vendor', 'businessName logo storeSlug')
        .sort({ createdAt: -1 });

    res.json({
        totalOrders: orders.length,
        orders,
    });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (Customer or Vendor)
const getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        res.status(400);
        throw new Error('Order ID is required');
    }

    const order = await Order.findById(id)
        .populate('customer', 'name email')
        .populate('vendors.vendor', 'businessName logo storeSlug');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Check authorization: customer or vendor involved in order
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    let isVendor = false;

    if (req.user.role === 'vendor') {
        isVendor = order.vendors.some(
            (v) => v.vendor._id.toString() === req.user.vendorProfile.toString()
        );
    }

    if (!isCustomer && !isVendor) {
        res.status(403);
        throw new Error('Not authorized to view this order');
    }

    res.json(order);
});

// @desc    Update order status
// @route   PUT /api/orders/:id
// @access  Private (Admin only)
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!id || !orderStatus) {
        res.status(400);
        throw new Error('Order ID and status are required');
    }

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(orderStatus)) {
        res.status(400);
        throw new Error('Invalid order status');
    }

    const order = await Order.findById(id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    order.orderStatus = orderStatus;

    if (orderStatus === 'DELIVERED') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('customer', 'name email')
        .populate('vendors.vendor', 'businessName logo storeSlug');

    res.json({
        message: 'Order status updated',
        order: populatedOrder,
    });
});

// @desc    Get vendor's orders
// @route   GET /api/orders/vendor/orders
// @access  Private (Vendor only)
const getVendorOrders = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;

    const vendor = req.user.vendorProfile;

    let query = { 'vendors.vendor': vendor };

    if (status) {
        const validStatuses = ['PENDING', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        if (validStatuses.includes(status)) {
            query['vendors.vendorStatus'] = status;
        }
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
        .populate('customer', 'name email')
        .populate('vendors.vendor', 'businessName logo')
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.json({
        totalOrders: total,
        currentPage: parseInt(page),
        pages: Math.ceil(total / limit),
        orders,
    });
});

// @desc    Update vendor order status
// @route   PUT /api/orders/:id/vendor-status
// @access  Private (Vendor only)
const updateVendorOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { vendorStatus, trackingNumber, carrier } = req.body;
    const vendor = req.user.vendorProfile;

    if (!id || !vendorStatus) {
        res.status(400);
        throw new Error('Order ID and vendor status are required');
    }

    const validStatuses = ['PENDING', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(vendorStatus)) {
        res.status(400);
        throw new Error('Invalid vendor order status');
    }

    const order = await Order.findById(id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Find vendor's order in this order
    const vendorOrderIndex = order.vendors.findIndex(
        (v) => v.vendor.toString() === vendor.toString()
    );

    if (vendorOrderIndex === -1) {
        res.status(403);
        throw new Error('Vendor not authorized for this order');
    }

    // Update vendor order status
    order.vendors[vendorOrderIndex].vendorStatus = vendorStatus;

    if (trackingNumber) {
        order.vendors[vendorOrderIndex].tracking.trackingNumber = trackingNumber;
    }

    if (carrier) {
        order.vendors[vendorOrderIndex].tracking.carrier = carrier;
    }

    if (vendorStatus === 'SHIPPED') {
        order.vendors[vendorOrderIndex].tracking.status = 'SHIPPED';
    } else if (vendorStatus === 'DELIVERED') {
        order.vendors[vendorOrderIndex].tracking.status = 'DELIVERED';
    }

    // Check if all vendors have delivered - then mark parent order as delivered
    const allDelivered = order.vendors.every((v) => v.vendorStatus === 'DELIVERED');
    if (allDelivered) {
        order.orderStatus = 'DELIVERED';
        order.isDelivered = true;
        order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('customer', 'name email')
        .populate('vendors.vendor', 'businessName logo');

    res.json({
        message: 'Vendor order status updated',
        order: populatedOrder,
    });
});

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    getVendorOrders,
    updateVendorOrderStatus,
};
