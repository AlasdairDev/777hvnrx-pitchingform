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
    secret: '777heaven-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true with HTTPS in production
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
// User routes (no authentication needed)
app.get('/', userController.showForm);
app.post('/submit', userController.submitForm);
app.get('/success', userController.showSuccess);

// Admin routes (authentication required)
app.get('/admin/login', adminController.showLogin);
app.post('/admin/login', adminController.login);
app.get('/admin/logout', adminController.logout);
app.get('/admin/dashboard', adminController.requireAuth, adminController.showDashboard);
app.get('/admin/submission/:id', adminController.requireAuth, adminController.viewSubmission);
app.post('/admin/submission/:id/delete', adminController.requireAuth, adminController.deleteSubmission);
app.get('/admin/export', adminController.requireAuth, adminController.exportData);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎵 777heaven Records Portal running on http://localhost:${PORT}`);
    console.log(`📝 User Form: http://localhost:${PORT}`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/admin/login`);
});
