require('dotenv').config();
const express    = require('express');
const path       = require('path');
const cookieParser = require('cookie-parser');
const passport   = require('passport');
const session    = require('express-session');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');

// Load configurations
require('./config/passport');

// Connect to Database
connectDB();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failed attempts
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', generalLimiter);

// Session for Passport (Google OAuth requires session support to store state temporarily)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth/login',   authLimiter);  // strict limiter on login
app.use('/api/auth/signup',  authLimiter);  // strict limiter on signup
app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/book-requests', require('./routes/suggestions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/fines',         require('./routes/fines'));
app.use('/api/password',      require('./routes/password'));

// View Routes
app.use('/', require('./routes/views'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
