const User = require('../models/User');
const Book = require('../models/Book');
const IssueRequest = require('../models/IssueRequest');
const IssuedBook = require('../models/IssuedBook');
const Review = require('../models/Review');
const Category = require('../models/Category');

// Helper to calculate fines to display
const { calculateFine } = require('../utils/helpers');

// --- Librarian Views ---

const renderLibrarianDashboard = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalBooks = await Book.countDocuments();
        const issuedBooksCount = await IssuedBook.countDocuments({ status: { $in: ['issued', 'overdue'] } });
        const pendingRequestsCount = await IssueRequest.countDocuments({ status: 'pending' });

        const recentRequests = await IssueRequest.find({ status: 'pending' })
            .populate('student', 'name profilePic')
            .populate('book', 'title')
            .sort({ requestDate: -1 })
            .limit(5);

        const overdueAlerts = await IssuedBook.find({ status: 'overdue' }) // We can dynamically calculate overdue or rely on status
            .populate('student', 'name')
            .populate('book', 'title')
            .limit(5);

        // Calculate if any are practically overdue based on date but not yet updated in DB
        const now = new Date();
        const potentialOverdues = await IssuedBook.find({ status: 'issued', dueDate: { $lt: now } })
            .populate('student', 'name')
            .populate('book', 'title')
            .limit(5);

        res.render('librarian/dashboard', {
            stats: { totalStudents, totalBooks, issuedBooksCount, pendingRequestsCount },
            recentRequests,
            overdueAlerts: [...overdueAlerts, ...potentialOverdues]
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const renderLibrarianStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
        
        // Populate counts for each student (advanced aggregation or simple map)
        const studentsWithStats = await Promise.all(students.map(async (student) => {
            const issuedCount = await IssuedBook.countDocuments({ student: student._id, status: { $in: ['issued', 'overdue'] } });
            
            // Calculate total fines
            const issuedBooks = await IssuedBook.find({ student: student._id, status: { $in: ['issued', 'overdue'] } });
            let totalFines = 0;
            const now = new Date();
            issuedBooks.forEach(ib => {
                if(now > ib.dueDate) {
                    totalFines += calculateFine(ib.dueDate, now);
                }
            });

            return {
                ...student._doc,
                issuedCount,
                totalFines
            };
        }));

        res.render('librarian/students', { students: studentsWithStats });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderLibrarianBooks = async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        const categories = await Category.find().sort({ name: 1 });
        res.render('librarian/books', { books, categories });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderLibrarianFines = async (req, res) => {
    try {
        const now = new Date();
        const CustomFine = require('../models/CustomFine');

        const records = await IssuedBook.find({
            $or: [
                { dueDate: { $lt: now }, status: { $in: ['issued', 'overdue'] } },
                { fineAmount: { $gt: 0 } }
            ]
        })
        .populate('student', 'name email profilePic')
        .populate('book', 'title')
        .sort({ dueDate: 1 });

        const fines = records.map(ib => {
            const overdueDays = ib.dueDate < now && ib.status !== 'returned'
                ? Math.ceil((now - ib.dueDate) / 86400000) : 0;
            const fineAmount = ib.fineAmount > 0 ? ib.fineAmount : overdueDays;
            return { ...ib._doc, overdueDays, fineAmount };
        });

        const totalOutstanding = fines.filter(f => !f.finePaid).reduce((s, f) => s + f.fineAmount, 0);
        const totalCollected   = fines.filter(f =>  f.finePaid).reduce((s, f) => s + f.fineAmount, 0);

        // Custom fines
        const customFines = await CustomFine.find()
            .populate('student', 'name email profilePic')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        const customOutstanding = customFines.filter(f => !f.paid).reduce((s, f) => s + f.amount, 0);
        const customCollected   = customFines.filter(f =>  f.paid).reduce((s, f) => s + f.amount, 0);

        // All students for the "Add Custom Fine" dropdown
        const students = await User.find({ role: 'student' }).select('name email profilePic').sort({ name: 1 });

        res.render('librarian/fines', {
            fines, totalOutstanding, totalCollected,
            customFines, customOutstanding, customCollected,
            students, now
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderLibrarianCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        // Use case-insensitive regex so books match regardless of casing/trimming
        const withBooks = await Promise.all(categories.map(async cat => {
            const regex = new RegExp(`^\\s*${cat.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
            const books = await Book.find({ category: { $regex: regex } })
                .select('title author availableCopies totalCopies')
                .sort({ title: 1 });
            return { ...cat._doc, bookCount: books.length, books };
        }));
        res.render('librarian/categories', { categories: withBooks });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderLibrarianRequests = async (req, res) => {
    try {
        const requests = await IssueRequest.find({ status: 'pending' })
            .populate('student', 'name profilePic')
            .populate('book', 'title category')
            .sort({ requestDate: -1 });

        res.render('librarian/requests', { requests });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderLibrarianIssued = async (req, res) => {
    try {
        const issuedBooks = await IssuedBook.find({ status: { $in: ['issued', 'overdue'] } })
            .populate('student', 'name')
            .populate('book', 'title')
            .sort({ dueDate: 1 }); // Soonest due first

        res.render('librarian/issued', { issuedBooks, now: new Date(), calculateFine });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};


// --- Student Views ---

const renderStudentDashboard = async (req, res) => {
    try {
        const studentId  = req.user._id;
        const CustomFine = require('../models/CustomFine');

        const booksIssued      = await IssuedBook.countDocuments({ student: studentId, status: { $in: ['issued', 'overdue'] } });
        const pendingRequests  = await IssueRequest.countDocuments({ student: studentId, status: 'pending' });

        const now          = new Date();
        const activeIssues = await IssuedBook.find({ student: studentId, status: { $in: ['issued', 'overdue'] } })
            .populate('book', 'title author');

        let overdueCount  = 0;
        let overdueFines  = 0;
        activeIssues.forEach(ib => {
            if (now > ib.dueDate) {
                overdueCount++;
                overdueFines += calculateFine(ib.dueDate, now);
            }
        });

        // Custom fines (unpaid only)
        const customFines = await CustomFine.find({ student: studentId, paid: false })
            .sort({ createdAt: -1 });
        const customFineTotal = customFines.reduce((s, f) => s + f.amount, 0);

        const totalFines = overdueFines + customFineTotal;

        const upcomingDue      = [...activeIssues].sort((a, b) => a.dueDate - b.dueDate).slice(0, 3);
        const recommendedBooks = await Book.find({ availableCopies: { $gt: 0 } }).limit(2);

        res.render('student/dashboard', {
            stats: { booksIssued, pendingRequests, overdueCount, totalFines },
            upcomingDue,
            recommendedBooks,
            customFines,
            customFineTotal,
            now
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderStudentBrowse = async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        const categories = await Category.find().sort({ name: 1 });
        // Attach student's own review to each book if exists
        const bookIds = books.map(b => b._id);
        const myReviews = await Review.find({ student: req.user._id, book: { $in: bookIds } });
        const reviewMap = {};
        myReviews.forEach(r => { reviewMap[r.book.toString()] = r; });
        const booksWithReviews = books.map(b => ({ ...b._doc, myReview: reviewMap[b._id.toString()] || null }));
        res.render('student/browse', { books: booksWithReviews, categories });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderStudentMyBooks = async (req, res) => {
    try {
        const studentId  = req.user._id;
        const now        = new Date();
        const CustomFine = require('../models/CustomFine');

        // Active (issued / overdue) books
        const activeIssues = await IssuedBook.find({ student: studentId, status: { $in: ['issued', 'overdue'] } })
            .populate('book', 'title author category averageRating numReviews')
            .sort({ dueDate: 1 });

        let overdueFines = 0;
        activeIssues.forEach(ib => {
            if (now > ib.dueDate) overdueFines += calculateFine(ib.dueDate, now);
        });

        // Unpaid custom fines
        const unpaidCustomFines = await CustomFine.find({ student: studentId, paid: false });
        const customFineTotal   = unpaidCustomFines.reduce((s, f) => s + f.amount, 0);
        const totalFines        = overdueFines + customFineTotal;

        // Recently returned books (last 30 days) for rating
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const returnedBooks  = await IssuedBook.find({
            student: studentId,
            status: 'returned',
            returnDate: { $gte: thirtyDaysAgo }
        })
        .populate('book', 'title author category averageRating numReviews')
        .sort({ returnDate: -1 })
        .limit(6);

        // Attach the student's own review to each returned book
        const returnedBookIds = returnedBooks.map(ib => ib.book?._id).filter(Boolean);
        const myReviews       = await Review.find({ student: studentId, book: { $in: returnedBookIds } });
        const reviewMap       = {};
        myReviews.forEach(r => { reviewMap[r.book.toString()] = r; });
        const returnedWithReviews = returnedBooks.map(ib => ({
            ...ib._doc,
            book: ib.book,
            myReview: ib.book ? reviewMap[ib.book._id.toString()] || null : null
        }));

        res.render('student/mybooks', {
            issuedBooks: activeIssues,
            returnedBooks: returnedWithReviews,
            totalFines,
            now,
            calculateFine
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderStudentRequests = async (req, res) => {
    try {
        const requests = await IssueRequest.find({ student: req.user._id })
            .populate('book', 'title author')
            .sort({ requestDate: -1 });
            
        res.render('student/requests', { requests });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const renderStudentRequestNew = (req, res) => {
    res.render('student/request_new');
};

// --- Shared Profile View ---
const renderProfile = async (req, res) => {
    try {
        const user = await require('../models/User').findById(req.user._id);
        if (!user) return res.redirect('/login');
        res.render('profile', { user, path: '/profile' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// ── Librarian Analytics ──────────────────────────────────────────────────────
const renderLibrarianAnalytics = async (req, res) => {
    try {
        const now = new Date();

        // ── 1. Top 5 most-borrowed books ──────────────────────────────────
        const topBooks = await IssuedBook.aggregate([
            { $group: { _id: '$book', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
            { $unwind: '$book' },
            { $project: { title: '$book.title', author: '$book.author', count: 1 } }
        ]);

        // ── 2. Top 5 most-active students ─────────────────────────────────
        const topStudents = await IssuedBook.aggregate([
            { $group: { _id: '$student', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
            { $unwind: '$student' },
            { $project: { name: '$student.name', email: '$student.email', profilePic: '$student.profilePic', count: 1 } }
        ]);

        // ── 3. Monthly issues — last 6 months ────────────────────────────
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyRaw = await IssuedBook.aggregate([
            { $match: { issueDate: { $gte: sixMonthsAgo } } },
            { $group: {
                _id: { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } },
                issued: { $sum: 1 }
            }},
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const monthlyReturnsRaw = await IssuedBook.aggregate([
            { $match: { returnDate: { $gte: sixMonthsAgo }, status: 'returned' } },
            { $group: {
                _id: { year: { $year: '$returnDate' }, month: { $month: '$returnDate' } },
                returned: { $sum: 1 }
            }},
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Build 6-month label array
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthLabels = [];
        const issuedArr   = [];
        const returnedArr = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const y = d.getFullYear(), m = d.getMonth() + 1;
            monthLabels.push(monthNames[m - 1] + ' ' + y);
            const ir = monthlyRaw.find(r => r._id.year === y && r._id.month === m);
            const rr = monthlyReturnsRaw.find(r => r._id.year === y && r._id.month === m);
            issuedArr.push(ir ? ir.issued : 0);
            returnedArr.push(rr ? rr.returned : 0);
        }

        // ── 4. Category distribution ──────────────────────────────────────
        const catDist = await IssuedBook.aggregate([
            { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'book' } },
            { $unwind: '$book' },
            { $group: { _id: '$book.category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);

        // ── 5. Summary KPIs ───────────────────────────────────────────────
        const totalIssued    = await IssuedBook.countDocuments();
        const totalReturned  = await IssuedBook.countDocuments({ status: 'returned' });
        const totalActive    = await IssuedBook.countDocuments({ status: { $in: ['issued', 'overdue'] } });
        const totalOverdue   = await IssuedBook.countDocuments({ status: { $in: ['issued','overdue'] }, dueDate: { $lt: now } });
        const totalStudents  = await User.countDocuments({ role: 'student' });
        const totalBooks     = await Book.countDocuments();

        res.render('librarian/analytics', {
            topBooks, topStudents,
            chart: {
                labels:   JSON.stringify(monthLabels),
                issued:   JSON.stringify(issuedArr),
                returned: JSON.stringify(returnedArr),
                catLabels: JSON.stringify(catDist.map(c => c._id || 'Unknown')),
                catData:   JSON.stringify(catDist.map(c => c.count))
            },
            kpis: { totalIssued, totalReturned, totalActive, totalOverdue, totalStudents, totalBooks }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports = {
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
};
