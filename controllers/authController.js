const crypto      = require('crypto');
const nodemailer  = require('nodemailer');
const User = require('../models/User');
const { generateToken } = require('../utils/helpers');

// Reusable email transporter
const createTransporter = () => nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 2500, // 2.5 seconds
    greetingTimeout: 2500,
    socketTimeout: 3000
});

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const assignedRole = role || 'student';

        let profilePic = '';
        if (req.file) {
            profilePic = `/uploads/${req.file.filename}`;
        }

        // Generate a secure verification token
        const rawToken   = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const user = await User.create({
            name,
            email,
            password,
            role: assignedRole,
            profilePic,
            isEmailVerified: false,
            emailVerificationToken: hashedToken
        });

        // Send verification email
        const verifyURL = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${rawToken}`;
        let emailSent = false;

        // Check email is properly configured (not placeholder values)
        const emailConfigured = process.env.EMAIL_USER &&
                                process.env.EMAIL_PASS &&
                                !process.env.EMAIL_USER.includes('your_email') &&
                                !process.env.EMAIL_USER.includes('your_real_gmail') &&
                                !process.env.EMAIL_PASS.includes('your_app_password') &&
                                !process.env.EMAIL_PASS.includes('abcdefghijklmnop');

        if (emailConfigured) {
            try {
                const transporter = createTransporter();
                await transporter.sendMail({
                    from: `"StudentVault Library" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: 'Verify Your Email – StudentVault',
                    html: `
                        <div style="font-family:Outfit,sans-serif;max-width:560px;margin:auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
                            <div style="background:linear-gradient(135deg,#1485e0,#0e3a5e);padding:32px;text-align:center;">
                                <h1 style="color:white;margin:0;font-size:24px;">✉️ Verify Your Email</h1>
                                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">StudentVault Library System</p>
                            </div>
                            <div style="padding:32px;">
                                <p style="color:#334155;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
                                <p style="color:#64748b;">Thanks for registering! Please click the button below to verify your email address before logging in. This link expires in <strong>24 hours</strong>.</p>
                                <div style="text-align:center;margin:32px 0;">
                                    <a href="${verifyURL}" style="background:linear-gradient(135deg,#1485e0,#0e3a5e);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                                        ✅ Verify My Email
                                    </a>
                                </div>
                                <p style="color:#94a3b8;font-size:13px;">If you didn't create this account, you can safely ignore this email.</p>
                                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                                <p style="color:#94a3b8;font-size:12px;">Or copy this link: <a href="${verifyURL}" style="color:#1485e0;">${verifyURL}</a></p>
                            </div>
                        </div>
                    `
                });
                emailSent = true;
            } catch (emailErr) {
                console.error('Verification email failed (auto-verifying user):', emailErr.message);
            }
        } else {
            console.log('⚠️  Email not configured — auto-verifying user:', user.email);
        }

        // Auto-verify if email was not (or could not be) sent
        if (!emailSent) {
            user.isEmailVerified        = true;
            user.emailVerificationToken = undefined;
            await user.save({ validateBeforeSave: false });
        }

        res.cookie('jwt', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
        res.status(201).json({
            success: true,
            emailSent,
            message: emailSent
                ? 'Account created! Please check your email to verify your account before logging in.'
                : 'Account created successfully! You can now sign in.',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Block login if email not verified
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before logging in. Check your inbox for the verification link.',
                notVerified: true
            });
        }

        if (role && user.role !== role) {
            return res.status(401).json({ success: false, message: 'Invalid role selection for this account' });
        }

        const token = generateToken(user._id);
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
const logout = (req, res) => {
    res.cookie('jwt', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    
    // For API calls return JSON, for normal browsing redirect
    if (req.originalUrl.startsWith('/api')) {
        res.status(200).json({ success: true, message: 'User logged out' });
    } else {
        res.redirect('/login');
    }
};

// @desc    Google Auth Callback handler
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = (req, res) => {
    if (!req.user) return res.redirect('/login?error=auth_failed');

    // Google already verified the email — mark as verified
    if (!req.user.isEmailVerified) {
        User.findByIdAndUpdate(req.user._id, { isEmailVerified: true }).catch(() => {});
    }

    const token = generateToken(req.user._id);
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    if (req.user.role === 'librarian') {
        res.redirect('/librarian/dashboard');
    } else {
        res.redirect('/student/dashboard');
    }
};

// @desc   Verify email via token link
// @route  GET /api/auth/verify-email/:token
// @access Public
const verifyEmail = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({ emailVerificationToken: hashedToken }).select('+emailVerificationToken');

        if (!user) {
            return res.redirect('/verify-email?status=invalid');
        }

        user.isEmailVerified       = true;
        user.emailVerificationToken = undefined;
        await user.save({ validateBeforeSave: false });

        res.redirect('/verify-email?status=success');
    } catch (error) {
        res.redirect('/verify-email?status=error');
    }
};

module.exports = { signup, login, logout, googleCallback, verifyEmail };
