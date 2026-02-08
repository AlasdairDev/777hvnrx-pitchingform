const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Import controllers
const userController = require('./controllers/userController');
const adminController = require('./controllers/adminController');

// ==================== SECURITY CONFIGURATION ====================

// Security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Remove X-Powered-By header
app.disable('x-powered-by');

// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ==================== MIDDLEWARE ====================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with enhanced security
app.use(session({
    secret: process.env.SESSION_SECRET || '777heaven-secret-key-CHANGE-THIS-IN-PRODUCTION',
    resave: false,
    saveUninitialized: false,
    name: 'admin.sid', // Don't use default 'connect.sid'
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // CSRF protection
    },
    rolling: true // Reset expiration on each request
}));

// Flash message middleware
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

// ==================== VIEW ENGINE ====================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==================== RATE LIMITING ====================

const rateLimit = require('express-rate-limit');

// Login rate limiter - prevents brute force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).render('admin/login', {
            error: 'Too many login attempts from this IP. Please try again in 15 minutes.'
        });
    },
    // Skip rate limiting for successful logins
    skipSuccessfulRequests: true
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});

// ==================== USER ROUTES ====================

app.get('/', userController.showForm);
app.post('/submit', userController.submitForm);
app.get('/success', userController.showSuccess);

// ==================== ADMIN AUTH ROUTES ====================

app.get('/admin/login', adminController.showLogin);
app.post('/admin/login', loginLimiter, adminController.login);
app.get('/admin/logout', adminController.logout);

// ==================== ADMIN PROTECTED ROUTES ====================
// Apply rate limiting to all admin routes
app.use('/admin', apiLimiter);

// ==================== ADMIN ROUTES ====================

// Redirect /admin to /admin/login
app.get('/admin', (req, res) => {
    res.redirect('/admin/login');
});

// Use the adminRoutes file - handles all admin panel routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/admin')) {
        res.status(404).render('admin/error', {
            message: 'Page not found',
            admin: req.admin || null
        });
    } else {
        res.status(404).send('Page not found');
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    if (req.path.startsWith('/admin')) {
        res.status(500).render('admin/error', {
            message: 'An error occurred. Please try again.',
            admin: req.admin || null
        });
    } else {
        res.status(500).send('Something went wrong!');
    }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎵 777 Heaven Records Portal');
    console.log('='.repeat(60));
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`📝 User Form: http://localhost:${PORT}`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/admin/login`);
    console.log('='.repeat(60));
    console.log('📊 Default Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@777!');
    console.log('='.repeat(60));
    console.log('⚠️  SECURITY REMINDERS:');
    console.log('   1. Change default admin password immediately!');
    console.log('   2. Set SESSION_SECRET in .env file');
    console.log('   3. Enable HTTPS in production');
    console.log('   4. Run "npm audit" regularly');
    console.log('='.repeat(60));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;
