const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    addProduct,
    getVendorProducts,
    getProductsByVendor,
    updateProduct,
    deleteProduct,
} = require('../controllers/productController');
const { protect, vendorOnly, vendorOwnsProduct } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getProducts);  // Get all products
router.get('/vendor/:vendorId', getProductsByVendor);  // Get products by specific vendor

// Protected routes - Vendor only
router.post('/', protect, vendorOnly, addProduct);  // Add new product (vendor only)
router.get('/my-products', protect, vendorOnly, getVendorProducts);  // Get vendor's products

// Product detail (public)
router.get('/:id', getProductById);

// Vendor product management (vendor only)
router.put('/:id', protect, vendorOnly, vendorOwnsProduct, updateProduct);  // Update own product
router.delete('/:id', protect, vendorOnly, vendorOwnsProduct, deleteProduct);  // Delete own product

module.exports = router;
