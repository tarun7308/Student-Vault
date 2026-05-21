const express = require('express');
const router = express.Router();
const passport = require('passport');
const upload = require('../middleware/upload');
const { signup, login, logout, googleCallback, verifyEmail } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/signup', upload.single('profilePic'), signup);
router.post('/login', login);
router.get('/logout', logout);
router.get('/verify-email/:token', verifyEmail);

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleCallback);

module.exports = router;
