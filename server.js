const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const app = express();

// Import controllers
const userController = require('./controllers/userController');
const adminController = require('./controllers/adminController');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || '777heaven-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash message middleware
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==================== USER ROUTES ====================
app.get('/', userController.showForm);
app.post('/submit', userController.submitForm);
app.get('/success', userController.showSuccess);

// ==================== ADMIN AUTH ROUTES ====================
app.get('/admin/login', adminController.showLogin);
app.post('/admin/login', adminController.login);
app.get('/admin/logout', adminController.logout);

// ==================== ADMIN DASHBOARD & SUBMISSIONS ====================
app.get('/admin/dashboard', 
    adminController.requireAuth, 
    adminController.showDashboard
);

app.get('/admin/submission/:id', 
    adminController.requireAuth, 
    adminController.viewSubmission
);

// Submission actions
app.post('/admin/submission/:id/archive', 
    adminController.requireAuth,
    adminController.requirePermission('archive'),
    adminController.archiveSubmission
);

app.post('/admin/submission/:id/unarchive', 
    adminController.requireAuth,
    adminController.requirePermission('archive'),
    adminController.unarchiveSubmission
);

app.post('/admin/submission/:id/delete', 
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.deleteSubmission
);

app.post('/admin/submission/:id/restore', 
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.restoreSubmission
);

app.post('/admin/submission/:id/permanent-delete', 
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.permanentDeleteSubmission
);

app.post('/admin/submission/:id/status', 
    adminController.requireAuth,
    adminController.requirePermission('edit'),
    adminController.updateSubmissionStatus
);

// Bulk operations
app.post('/admin/bulk-action', 
    adminController.requireAuth,
    adminController.requirePermission('delete'),
    adminController.bulkAction
);

// ==================== DATA EXPORT ====================
app.get('/admin/export', 
    adminController.requireAuth,
    adminController.requirePermission('export'),
    adminController.exportData
);

// ==================== ADMIN MANAGEMENT ====================
app.get('/admin/admins', 
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.showAdminManagement
);

app.get('/admin/admins/create', 
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.showCreateAdmin
);

app.post('/admin/admins/create', 
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.createAdmin
);

app.post('/admin/admins/:id/toggle', 
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.toggleAdminStatus
);

app.post('/admin/admins/:id/delete', 
    adminController.requireAuth,
    adminController.requirePermission('manage_admins'),
    adminController.deleteAdmin
);

// ==================== PASSWORD MANAGEMENT ====================
app.get('/admin/change-password', 
    adminController.requireAuth,
    adminController.showChangePassword
);

app.post('/admin/change-password', 
    adminController.requireAuth,
    adminController.changePassword
);

// ==================== AUDIT LOGS ====================
app.get('/admin/audit-logs', 
    adminController.requireAuth,
    adminController.showAuditLogs
);

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎵 777heaven Records Portal running on http://localhost:${PORT}`);
    console.log(`📝 User Form: http://localhost:${PORT}`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/admin/login`);
    console.log(`📊 Default credentials: admin / Admin@777!`);
    console.log(`⚠️  IMPORTANT: Change default password immediately!`);
});
