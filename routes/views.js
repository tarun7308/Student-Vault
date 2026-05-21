const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
    renderLibrarianDashboard,
    renderLibrarianStudents,
    renderLibrarianBooks,
    renderLibrarianRequests,
    renderLibrarianIssued,
    renderLibrarianFines,
    renderLibrarianCategories,
    renderLibrarianAnalytics,
    renderStudentDashboard,
    renderStudentBrowse,
    renderStudentMyBooks,
    renderStudentRequests,
    renderStudentRequestNew,
    renderProfile
} = require('../controllers/viewController');

// Public Auth Views
router.get('/login',  (req, res) => res.render('auth/login'));
router.get('/signup', (req, res) => res.render('auth/signup'));
router.get('/',       (req, res) => res.redirect('/login'));
router.get('/forgot-password', (req, res) => res.render('auth/forgot_password'));
router.get('/reset-password/:token', (req, res) =>
    res.render('auth/reset_password', { token: req.params.token })
);
router.get('/verify-email', (req, res) =>
    res.render('auth/verify_email', { status: req.query.status || 'pending' })
);

// Protected Librarian Views
router.use('/librarian', protect, authorize('librarian'));
router.get('/librarian/dashboard',   renderLibrarianDashboard);
router.get('/librarian/students',    renderLibrarianStudents);
router.get('/librarian/books',       renderLibrarianBooks);
router.get('/librarian/requests',    renderLibrarianRequests);
router.get('/librarian/issued',      renderLibrarianIssued);
router.get('/librarian/fines',       renderLibrarianFines);
router.get('/librarian/categories',  renderLibrarianCategories);
router.get('/librarian/analytics',   renderLibrarianAnalytics);

// Protected Student Views
router.use('/student', protect, authorize('student'));
router.get('/student/dashboard', renderStudentDashboard);
router.get('/student/browse', renderStudentBrowse);
router.get('/student/mybooks', renderStudentMyBooks);
router.get('/student/requests', renderStudentRequests);
router.get('/student/request_new', renderStudentRequestNew);

// Shared Profile (all authenticated users)
router.get('/profile', protect, renderProfile);


module.exports = router;
