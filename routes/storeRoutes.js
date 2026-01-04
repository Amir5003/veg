const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getStoreBySlug,
    getStoreProducts,
    getStoreReviews,
    submitStoreReview,
    getMyStoreInfo,
} = require('../controllers/storeController');

const router = express.Router();

// Public routes
router.get('/:slug', getStoreBySlug);
router.get('/:slug/products', getStoreProducts);
router.get('/:slug/reviews', getStoreReviews);

// Private routes
router.post('/:slug/reviews', protect, submitStoreReview);
router.get('/info/me', protect, getMyStoreInfo);

module.exports = router;
