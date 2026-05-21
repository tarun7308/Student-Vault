const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
        
        if (!roles.includes(req.user.role)) {
            if (req.originalUrl.startsWith('/api')) {
                return res.status(403).json({ 
                    success: false, 
                    message: `User role ${req.user.role} is not authorized to access this route`
                });
            }
            // For views, redirect to appropriate dashboard
            if (req.user.role === 'librarian') {
                return res.redirect('/librarian/dashboard');
            } else {
                return res.redirect('/student/dashboard');
            }
        }
        next();
    };
};

module.exports = { authorize };
