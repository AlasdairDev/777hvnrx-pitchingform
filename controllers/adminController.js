const Admin = require('../models/Admin');
const Submission = require('../models/Submission');

// ==================== AUTHENTICATION ====================

exports.showLogin = (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { error: null });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const admin = await Admin.verify(username, password);
        
        if (admin) {
            req.session.isAuthenticated = true;
            req.session.adminId = admin.id;
            req.session.username = admin.username;
            req.session.role = admin.role;
            
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.render('admin/login', { error: 'Session error. Please try again.' });
                }
                res.redirect('/admin/dashboard');
            });
        } else {
            res.render('admin/login', { error: 'Invalid credentials or account is disabled' });
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
    
    // Attach admin info to request
    const admin = Admin.getAdminById(req.session.adminId);
    if (!admin || !admin.isActive) {
        req.session.destroy();
        return res.redirect('/admin/login');
    }
    
    req.admin = admin;
    next();
};

exports.requirePermission = (action) => {
    return (req, res, next) => {
        if (!Admin.hasPermission(req.admin, action)) {
            return res.status(403).render('admin/error', {
                message: 'You do not have permission to perform this action',
                admin: req.admin
            });
        }
        next();
    };
};

// ==================== DASHBOARD ====================

exports.showDashboard = (req, res) => {
    const view = req.query.view || 'active';
    const search = req.query.search || '';
    const filterGenre = req.query.genre || '';
    const filterStatus = req.query.status || '';
    
    let submissions;
    
    if (view === 'archived') {
        submissions = Submission.getArchived();
    } else if (view === 'deleted') {
        submissions = Submission.getDeleted();
    } else if (view === 'all') {
        submissions = Submission.getAll();
    } else {
        submissions = Submission.getActive();
    }
    
    // Apply search and filters
    if (search || filterGenre || filterStatus) {
        submissions = Submission.search(search, {
            genre: filterGenre,
            status: filterStatus,
            archived: view === 'archived'
        });
    }
    
    const stats = Submission.getStats();
    const recentLogs = Submission.getAuditLogs(10);
    
    res.render('admin/dashboard', { 
        submissions,
        stats,
        recentLogs,
        admin: req.admin,
        currentView: view,
        search,
        filterGenre,
        filterStatus
    });
};

// ==================== SUBMISSION MANAGEMENT ====================

exports.viewSubmission = (req, res) => {
    const submission = Submission.getById(req.params.id);
    
    if (!submission) {
        return res.redirect('/admin/dashboard');
    }
    
    const auditLogs = Submission.getSubmissionAuditLogs(req.params.id);
    
    res.render('admin/submission', { 
        submission,
        auditLogs,
        admin: req.admin
    });
};

exports.archiveSubmission = (req, res) => {
    const success = Submission.archive(req.params.id, req.session.username);
    
    if (success) {
        req.session.message = { type: 'success', text: 'Submission archived successfully' };
    } else {
        req.session.message = { type: 'error', text: 'Failed to archive submission' };
    }
    
    res.redirect('back');
};

exports.unarchiveSubmission = (req, res) => {
    const success = Submission.unarchive(req.params.id, req.session.username);
    
    if (success) {
        req.session.message = { type: 'success', text: 'Submission unarchived successfully' };
    } else {
        req.session.message = { type: 'error', text: 'Failed to unarchive submission' };
    }
    
    res.redirect('back');
};

exports.deleteSubmission = (req, res) => {
    const success = Submission.softDelete(req.params.id, req.session.username);
    
    if (success) {
        req.session.message = { type: 'success', text: 'Submission moved to trash' };
    } else {
        req.session.message = { type: 'error', text: 'Failed to delete submission' };
    }
    
    res.redirect('back');
};

exports.restoreSubmission = (req, res) => {
    const success = Submission.restore(req.params.id, req.session.username);
    
    if (success) {
        req.session.message = { type: 'success', text: 'Submission restored successfully' };
    } else {
        req.session.message = { type: 'error', text: 'Failed to restore submission' };
    }
    
    res.redirect('back');
};

exports.permanentDeleteSubmission = (req, res) => {
    const success = Submission.permanentDelete(req.params.id, req.session.username);
    
    if (success) {
        req.session.message = { type: 'success', text: 'Submission permanently deleted' };
    } else {
        req.session.message = { type: 'error', text: 'Failed to permanently delete submission' };
    }
    
    res.redirect('/admin/dashboard?view=deleted');
};

exports.updateSubmissionStatus = (req, res) => {
    const { status } = req.body;
    const success = Submission.updateStatus(req.params.id, status, req.session.username);
    
    if (success) {
        req.session.message = { type: 'success', text: `Status updated to ${status}` };
    } else {
        req.session.message = { type: 'error', text: 'Failed to update status' };
    }
    
    res.redirect('back');
};

// ==================== BULK OPERATIONS ====================

exports.bulkAction = (req, res) => {
    const { action, submissionIds } = req.body;
    
    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
        req.session.message = { type: 'error', text: 'No submissions selected' };
        return res.redirect('back');
    }
    
    let count = 0;
    
    switch (action) {
        case 'archive':
            count = Submission.bulkArchive(submissionIds, req.session.username);
            req.session.message = { type: 'success', text: `${count} submission(s) archived` };
            break;
        case 'delete':
            count = Submission.bulkDelete(submissionIds, req.session.username);
            req.session.message = { type: 'success', text: `${count} submission(s) moved to trash` };
            break;
        default:
            req.session.message = { type: 'error', text: 'Invalid bulk action' };
    }
    
    res.redirect('back');
};

// ==================== DATA EXPORT ====================

exports.exportData = (req, res) => {
    const format = req.query.format || 'json';
    const view = req.query.view || 'active';
    
    let submissions;
    if (view === 'archived') {
        submissions = Submission.getArchived();
    } else if (view === 'all') {
        submissions = Submission.getAll();
    } else {
        submissions = Submission.getActive();
    }
    
    if (format === 'csv') {
        // Export as CSV
        const csv = this.convertToCSV(submissions);
        const filename = `777heaven-submissions-${view}-${Date.now()}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } else {
        // Export as JSON
        const filename = `777heaven-submissions-${view}-${Date.now()}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(submissions, null, 2));
    }
};

exports.convertToCSV = (submissions) => {
    if (submissions.length === 0) return '';
    
    const headers = ['ID', 'Artist Name', 'Song Title', 'Email', 'Genre', 'Vibe', 'Format', 'Status', 'Release Date', 'Spotify Link', 'Timestamp', 'Archived'];
    
    const rows = submissions.map(sub => [
        sub.id,
        sub.artistName,
        sub.songTitle,
        sub.email,
        sub.genre,
        sub.vibe,
        sub.format,
        sub.status || 'pending',
        sub.releaseDate,
        sub.spotifyLink,
        sub.timestamp,
        sub.archived ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
};

// ==================== ADMIN MANAGEMENT ====================

exports.showAdminManagement = (req, res) => {
    const admins = Admin.getAdmins();
    const stats = Admin.getStats();
    
    res.render('admin/admin-management', {
        admins,
        stats,
        admin: req.admin,
        message: req.session.message
    });
    
    delete req.session.message;
};

exports.showCreateAdmin = (req, res) => {
    res.render('admin/create-admin', {
        admin: req.admin,
        error: null
    });
};

exports.createAdmin = async (req, res) => {
    const { username, email, password, confirmPassword, role } = req.body;
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
        return res.render('admin/create-admin', {
            admin: req.admin,
            error: 'All fields are required'
        });
    }
    
    if (password !== confirmPassword) {
        return res.render('admin/create-admin', {
            admin: req.admin,
            error: 'Passwords do not match'
        });
    }
    
    if (password.length < 8) {
        return res.render('admin/create-admin', {
            admin: req.admin,
            error: 'Password must be at least 8 characters'
        });
    }
    
    const result = await Admin.createAdmin({ username, email, password, role });
    
    if (result.success) {
        req.session.message = { type: 'success', text: 'Admin account created successfully' };
        res.redirect('/admin/admins');
    } else {
        res.render('admin/create-admin', {
            admin: req.admin,
            error: result.error
        });
    }
};

exports.toggleAdminStatus = (req, res) => {
    const result = Admin.toggleActive(req.params.id);
    
    if (result.success) {
        req.session.message = { 
            type: 'success', 
            text: `Admin account ${result.admin.isActive ? 'activated' : 'deactivated'}` 
        };
    } else {
        req.session.message = { type: 'error', text: result.error };
    }
    
    res.redirect('/admin/admins');
};

exports.deleteAdmin = (req, res) => {
    const result = Admin.deleteAdmin(req.params.id, req.session.adminId);
    
    if (result.success) {
        req.session.message = { type: 'success', text: 'Admin account deleted successfully' };
    } else {
        req.session.message = { type: 'error', text: result.error };
    }
    
    res.redirect('/admin/admins');
};

exports.showChangePassword = (req, res) => {
    res.render('admin/change-password', {
        admin: req.admin,
        error: null,
        success: null
    });
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.render('admin/change-password', {
            admin: req.admin,
            error: 'All fields are required',
            success: null
        });
    }
    
    if (newPassword !== confirmPassword) {
        return res.render('admin/change-password', {
            admin: req.admin,
            error: 'New passwords do not match',
            success: null
        });
    }
    
    if (newPassword.length < 8) {
        return res.render('admin/change-password', {
            admin: req.admin,
            error: 'Password must be at least 8 characters',
            success: null
        });
    }
    
    // Verify current password
    const isValid = await Admin.verify(req.session.username, currentPassword);
    
    if (!isValid) {
        return res.render('admin/change-password', {
            admin: req.admin,
            error: 'Current password is incorrect',
            success: null
        });
    }
    
    // Update password
    const result = await Admin.updatePassword(req.session.adminId, newPassword);
    
    if (result.success) {
        res.render('admin/change-password', {
            admin: req.admin,
            error: null,
            success: 'Password changed successfully'
        });
    } else {
        res.render('admin/change-password', {
            admin: req.admin,
            error: 'Failed to change password',
            success: null
        });
    }
};

// ==================== AUDIT LOGS ====================

exports.showAuditLogs = (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const logs = Submission.getAuditLogs(limit);
    
    res.render('admin/audit-logs', {
        logs,
        admin: req.admin
    });
};
