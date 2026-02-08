// Enhanced Routes for 777 Heaven Records Admin Panel
// This file includes all admin routes with proper security and permission checks

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.js.backup'); 
const { loginLimiter, apiLimiter } = require('../config/security'); 

// ==================== PUBLIC ROUTES ====================

// Login page
router.get('/login', adminController.showLogin);

// Login handler with rate limiting
router.post('/login', loginLimiter, adminController.login);

// Logout
router.get('/logout', adminController.logout);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication

// Dashboard
router.get('/dashboard', 
    adminController.requireAuth, 
    apiLimiter,
    adminController.showDashboard
);

// ==================== SUBMISSION ROUTES ====================

// NOTE: The GET route for /submission/:id has been removed
// Submission details are now displayed in a modal popup within the dashboard
// All POST routes below are still needed for the modal's form submissions

// Update submission status
router.post('/submission/:id/status',
    adminController.requireAuth,
    adminController.requirePermission('edit'),
    adminController.updateSubmissionStatus
);

// Archive submission
router.post('/submission/:id/archive',
    adminController.requireAuth,
    adminController.requirePermission('archive'),
    adminController.archiveSubmission
);

// Unarchive submission
router.post('/submission/:id/unarchive',
    adminController.requireAuth,
    adminController.requirePermission('archive'),
    adminController.unarchiveSubmission
);

// Soft delete submission
router.post('/submission/:id/delete',
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.deleteSubmission
);

// Restore submission
router.post('/submission/:id/restore',
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.restoreSubmission
);

// Permanent delete submission
router.post('/submission/:id/permanent-delete',
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.permanentDeleteSubmission
);

// ==================== BULK OPERATIONS ====================

router.post('/bulk-action',
    adminController.requireAuth,
    adminController.requirePermission('archive'),
    adminController.bulkAction
);

// ==================== EXPORT ROUTES ====================

router.get('/export',
    adminController.requireAuth,
    adminController.requirePermission('export'),
    adminController.exportData
);

// ==================== ADMIN MANAGEMENT ROUTES ====================

// List admins
router.get('/admins',
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.showAdminManagement
);

// Create admin handler (form is now a modal in admin management page)
router.post('/admins/create',
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.createAdmin
);

// Toggle admin status
router.post('/admins/:id/toggle-status',
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.toggleAdminStatus
);

// Delete admin
router.post('/admins/:id/delete',
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.deleteAdmin
);

// ==================== PASSWORD MANAGEMENT ====================

// Change password form
router.get('/change-password',
    adminController.requireAuth,
    adminController.showChangePassword
);

// Change password handler
router.post('/change-password',
    adminController.requireAuth,
    adminController.changePassword
);

// ==================== AUDIT LOGS ====================

router.get('/audit-logs',
    adminController.requireAuth,
    adminController.requirePermission('view'),
    adminController.showAuditLogs
);

// ==================== ERROR HANDLING ====================

// 404 handler for admin routes
router.use((req, res) => {
    res.status(404).render('admin/error', {
        message: 'Page not found',
        admin: req.admin || null
    });
});

// Error handler
router.use((err, req, res, next) => {
    console.error('Admin route error:', err);
    res.status(500).render('admin/error', {
        message: 'An error occurred',
        admin: req.admin || null
    });
});

module.exports = router;