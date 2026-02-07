const Submission = require('../models/Submission');

exports.showForm = (req, res) => {
    res.render('user/form');
};

exports.submitForm = (req, res) => {
    try {
        const submission = Submission.create(req.body);
        
        // Store submission ID in session for success page
        req.session.submissionId = submission.id;
        
        res.redirect('/success');
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).send('Error submitting form. Please try again.');
    }
};

exports.showSuccess = (req, res) => {
    const submissionId = req.session.submissionId;
    
    if (!submissionId) {
        return res.redirect('/');
    }
    
    const submission = Submission.getById(submissionId);
    
    if (!submission) {
        return res.redirect('/');
    }
    
    // Clear session
    delete req.session.submissionId;
    
    res.render('user/success', { submission });
};
