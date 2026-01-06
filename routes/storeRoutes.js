const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    listStores,
    validateStoreName,
    getStoreBySlug,
    getStoreProducts,
    getStoreReviews,
    submitStoreReview,
    getMyStoreInfo,
} = require('../controllers/storeController');

const router = express.Router();

// Public routes (specific first)
router.get('/', listStores);
router.get('/validate-name', validateStoreName);
router.get('/:slug/products', getStoreProducts);
router.get('/:slug/reviews', getStoreReviews);
router.get('/:slug', getStoreBySlug);

// Private routes
router.get('/info/me', protect, getMyStoreInfo);
router.post('/:slug/reviews', protect, submitStoreReview);

module.exports = router;
