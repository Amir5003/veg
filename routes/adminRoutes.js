const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getAllVendors,
    getVendorDetails,
    approveVendor,
    rejectVendor,
    suspendVendor,
    activateVendor,
    deleteVendor,
    getAllPayouts,
    approvePayout,
    processPayout,
    rejectPayout,
    getAdminDashboard,
} = require('../controllers/adminController');

// Protected admin routes
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getAdminDashboard);

// Vendor management
router.get('/vendors', getAllVendors);
router.get('/vendors/:vendorId', getVendorDetails);
router.put('/vendors/:vendorId/approve', approveVendor);
router.put('/vendors/:vendorId/reject', rejectVendor);
router.put('/vendors/:vendorId/suspend', suspendVendor);
router.put('/vendors/:vendorId/activate', activateVendor);
router.delete('/vendors/:vendorId', deleteVendor);

// Payout management
router.get('/payouts', getAllPayouts);
router.put('/payouts/:payoutId/approve', approvePayout);
router.put('/payouts/:payoutId/process', processPayout);
router.put('/payouts/:payoutId/reject', rejectPayout);

module.exports = router;
