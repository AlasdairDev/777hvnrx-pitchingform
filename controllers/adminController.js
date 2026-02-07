const Admin = require('../models/Admin');
const Submission = require('../models/Submission');
const fs = require('fs');
const path = require('path');

exports.showLogin = (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { error: null });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const isValid = await Admin.verify(username, password);
        
        if (isValid) {
            req.session.isAuthenticated = true;
            req.session.username = username;
            
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.render('admin/login', { error: 'Session error. Please try again.' });
                }
                res.redirect('/admin/dashboard');
            });
        } else {
            res.render('admin/login', { error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { error: 'Login error. Check server logs.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
};

exports.requireAuth = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/admin/login');
    }
    next();
};

exports.showDashboard = (req, res) => {
    const view = req.query.view || 'active'; // 'active', 'archived', or 'all'
    
    let submissions;
    if (view === 'archived') {
        submissions = Submission.getArchived();
    } else if (view === 'all') {
        submissions = Submission.getAll();
    } else {
        submissions = Submission.getActive();
    }
    
    const stats = Submission.getStats();
    
    res.render('admin/dashboard', { 
        submissions,
        stats,
        username: req.session.username,
        currentView: view
    });
};

exports.viewSubmission = (req, res) => {
    const submission = Submission.getById(req.params.id);
    
    if (!submission) {
        return res.redirect('/admin/dashboard');
    }
    
    res.render('admin/submission', { submission });
};

exports.archiveSubmission = (req, res) => {
    const success = Submission.archive(req.params.id);
    
    if (success) {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin/dashboard');
    }
};

exports.unarchiveSubmission = (req, res) => {
    const success = Submission.unarchive(req.params.id);
    
    if (success) {
        res.redirect('/admin/dashboard?view=archived');
    } else {
        res.redirect('/admin/dashboard');
    }
};

exports.deleteSubmission = (req, res) => {
    Submission.delete(req.params.id);
    res.redirect('/admin/dashboard');
};

exports.exportData = (req, res) => {
    const submissions = Submission.getAll();
    
    // Export as JSON
    const filename = `777heaven-submissions-${Date.now()}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(submissions, null, 2));
};