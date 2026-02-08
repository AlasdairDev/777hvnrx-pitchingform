// Security Middleware and Configuration for 777 Heaven Records Admin Panel
// This file provides essential security enhancements

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');

// ==================== RATE LIMITING ====================

// Login rate limiter - prevents brute force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).render('admin/login', {
            error: 'Too many login attempts. Please try again in 15 minutes.'
        });
    }
});

// API rate limiter - general protection
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});

// ==================== INPUT VALIDATION ====================

class InputValidator {
    // Sanitize and validate email
    static sanitizeEmail(email) {
        if (!email) return null;
        email = email.trim().toLowerCase();
        return validator.isEmail(email) ? validator.normalizeEmail(email) : null;
    }

    // Sanitize username
    static sanitizeUsername(username) {
        if (!username) return null;
        username = username.trim();
        // Only allow alphanumeric, underscore, and hyphen
        return /^[a-zA-Z0-9_-]{3,20}$/.test(username) ? username : null;
    }

    // Validate password strength
    static validatePassword(password) {
        if (!password || password.length < 8) {
            return { valid: false, error: 'Password must be at least 8 characters' };
        }
        
        // Optional: Add more strength requirements
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        // Weak password check
        if (!hasUpperCase && !hasNumbers && !hasSpecialChar) {
            return { 
                valid: false, 
                error: 'Password is too weak. Include uppercase, numbers, or special characters.' 
            };
        }
        
        return { valid: true };
    }

    // Sanitize general text input (prevent XSS)
    static sanitizeText(text) {
        if (!text) return '';
        // Escape HTML special characters
        return validator.escape(text.trim());
    }

    // Validate and sanitize Spotify URL
    static sanitizeSpotifyUrl(url) {
        if (!url) return null;
        url = url.trim();
        
        if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
            return null;
        }
        
        // Check if it's a valid Spotify URL
        if (!url.includes('spotify.com')) {
            return null;
        }
        
        return url;
    }

    // Validate submission form data
    static validateSubmissionData(data) {
        const errors = [];

        if (!data.artistName || data.artistName.trim().length === 0) {
            errors.push('Artist name is required');
        }

        if (!data.songTitle || data.songTitle.trim().length === 0) {
            errors.push('Song title is required');
        }

        const email = this.sanitizeEmail(data.email);
        if (!email) {
            errors.push('Valid email is required');
        }

        if (!data.genre) {
            errors.push('Genre is required');
        }

        const spotifyUrl = this.sanitizeSpotifyUrl(data.spotifyLink);
        if (!spotifyUrl) {
            errors.push('Valid Spotify link is required');
        }

        return {
            valid: errors.length === 0,
            errors,
            sanitizedData: {
                ...data,
                artistName: this.sanitizeText(data.artistName),
                songTitle: this.sanitizeText(data.songTitle),
                email: email,
                spotifyLink: spotifyUrl,
                keywords: data.keywords ? this.sanitizeText(data.keywords) : ''
            }
        };
    }
}

// ==================== SESSION SECURITY ====================

const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'CHANGE-THIS-TO-RANDOM-SECRET-IN-PRODUCTION', // IMPORTANT: Change in production!
    resave: false,
    saveUninitialized: false,
    name: 'admin.sid', // Don't use default 'connect.sid'
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        sameSite: 'strict' // CSRF protection
    }
};

// ==================== HELMET CONFIGURATION ====================

const helmetConfig = {
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
};

// ==================== CSRF PROTECTION ====================

// Simple CSRF token middleware
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET') {
        // Generate CSRF token for GET requests
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        res.locals.csrfToken = req.session.csrfToken;
        return next();
    }
    
    // Validate CSRF token for POST, PUT, DELETE requests
    const token = req.body.csrfToken || req.headers['x-csrf-token'];
    
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).send('Invalid CSRF token');
    }
    
    next();
};

// ==================== SECURITY HEADERS ====================

const securityHeaders = (req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
};

// ==================== PASSWORD POLICY ====================

class PasswordPolicy {
    static MIN_LENGTH = 8;
    static MAX_AGE_DAYS = 90; // Recommend password change after 90 days
    static BCRYPT_ROUNDS = 10;

    static shouldChangePassword(lastChanged) {
        if (!lastChanged) return false;
        
        const daysSinceChange = Math.floor(
            (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return daysSinceChange > this.MAX_AGE_DAYS;
    }

    static generateRandomPassword(length = 16) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        const crypto = require('crypto');
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }
}

// ==================== AUDIT LOGGING ====================

class SecurityAuditLogger {
    static logSecurityEvent(event, details, req) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            adminUsername: req.session?.username || 'anonymous'
        };
        
        console.log('[SECURITY]', JSON.stringify(logEntry));
        
        // In production, you might want to:
        // - Write to a separate security log file
        // - Send to a logging service
        // - Alert administrators for critical events
    }

    static logFailedLogin(username, req) {
        this.logSecurityEvent('FAILED_LOGIN', { username }, req);
    }

    static logSuccessfulLogin(username, req) {
        this.logSecurityEvent('SUCCESSFUL_LOGIN', { username }, req);
    }

    static logUnauthorizedAccess(resource, req) {
        this.logSecurityEvent('UNAUTHORIZED_ACCESS', { resource }, req);
    }

    static logPasswordChange(username, req) {
        this.logSecurityEvent('PASSWORD_CHANGE', { username }, req);
    }

    static logAdminCreation(createdBy, newAdmin, req) {
        this.logSecurityEvent('ADMIN_CREATED', { createdBy, newAdmin }, req);
    }

    static logAdminDeletion(deletedBy, deletedAdmin, req) {
        this.logSecurityEvent('ADMIN_DELETED', { deletedBy, deletedAdmin }, req);
    }
}

// ==================== EXPORTS ====================

module.exports = {
    // Rate limiters
    loginLimiter,
    apiLimiter,
    
    // Input validation
    InputValidator,
    
    // Session config
    sessionConfig,
    
    // Helmet config
    helmetConfig,
    
    // CSRF protection
    csrfProtection,
    
    // Security headers
    securityHeaders,
    
    // Password policy
    PasswordPolicy,
    
    // Security logging
    SecurityAuditLogger
};
