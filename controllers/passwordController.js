const crypto      = require('crypto');
const nodemailer  = require('nodemailer');
const User        = require('../models/User');

// Create reusable transporter
const createTransporter = () => nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// @desc   Request password reset — sends email with token link
// @route  POST /api/password/forgot
// @access Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) {
            // Security: don't reveal whether the email exists
            return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate a secure random token
        const resetToken  = crypto.randomBytes(32).toString('hex');
        const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

        user.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpiry = resetExpiry;
        await user.save({ validateBeforeSave: false });

        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        // Send email (graceful failure)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = createTransporter();
                await transporter.sendMail({
                    from: `"StudentVault Library" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: 'Password Reset Request – StudentVault',
                    html: `
                        <div style="font-family:Outfit,sans-serif;max-width:560px;margin:auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
                            <div style="background:linear-gradient(135deg,#1485e0,#0e3a5e);padding:32px;text-align:center;">
                                <h1 style="color:white;margin:0;font-size:24px;">🔐 Password Reset</h1>
                                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">StudentVault Library System</p>
                            </div>
                            <div style="padding:32px;">
                                <p style="color:#334155;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
                                <p style="color:#64748b;">You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
                                <div style="text-align:center;margin:32px 0;">
                                    <a href="${resetURL}" style="background:linear-gradient(135deg,#1485e0,#0e3a5e);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                                        Reset My Password
                                    </a>
                                </div>
                                <p style="color:#94a3b8;font-size:13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
                                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                                <p style="color:#94a3b8;font-size:12px;">Or copy this link: <a href="${resetURL}" style="color:#1485e0;">${resetURL}</a></p>
                            </div>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error('Email send failed:', emailErr.message);
                // Clear the token since email failed
                user.resetPasswordToken  = undefined;
                user.resetPasswordExpiry = undefined;
                await user.save({ validateBeforeSave: false });
                return res.status(500).json({ success: false, message: 'Failed to send reset email. Check your email config.' });
            }
        } else {
            // Dev mode: return the token directly
            console.log('⚠️  EMAIL not configured. Reset URL:', resetURL);
        }

        res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Reset password using token from email link
// @route  POST /api/password/reset/:token
// @access Public
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Hash the incoming token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken:  hashedToken,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
        }

        user.password            = password;
        user.resetPasswordToken  = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { forgotPassword, resetPassword };
