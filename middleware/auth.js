const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check cookies first
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    // Check Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // If it's an API request, return JSON
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        }
        // If it's a view request, redirect to login
        return res.redirect('/login');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        
        if (!req.user) {
            throw new Error('User not found');
        }

        // Pass user object to res.locals so EJS views can use it natively
        res.locals.user = req.user;
        res.locals.role = req.user.role;
        res.locals.path = req.path;
        
        next();
    } catch (err) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        }
        return res.redirect('/login');
    }
};

module.exports = { protect };
