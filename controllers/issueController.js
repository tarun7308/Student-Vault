const IssueRequest = require('../models/IssueRequest');
const IssuedBook = require('../models/IssuedBook');
const Book = require('../models/Book');

// @desc    Request to issue a book
// @route   POST /api/issues/request
// @access  Private/Student
const requestIssue = async (req, res) => {
    try {
        const { bookId } = req.body;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        if (book.availableCopies <= 0) {
            return res.status(400).json({ success: false, message: 'Book is currently out of stock' });
        }

        // Check if user already requested this book and it's pending
        const existingRequest = await IssueRequest.findOne({
            student: req.user._id,
            book: bookId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'You already have a pending request for this book' });
        }

        // Check if user already has this book issued and not returned
        const existingIssue = await IssuedBook.findOne({
            student: req.user._id,
            book: bookId,
            status: { $in: ['issued', 'overdue'] }
        });

        if (existingIssue) {
            return res.status(400).json({ success: false, message: 'You already have this book issued' });
        }

        const issueRequest = await IssueRequest.create({
            student: req.user._id,
            book: bookId
        });

        res.status(201).json({ success: true, data: issueRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all pending requests
// @route   GET /api/issues/pending
// @access  Private/Librarian
const getPendingRequests = async (req, res) => {
    try {
        const requests = await IssueRequest.find({ status: 'pending' })
            .populate('student', 'name email profilePic')
            .populate('book', 'title category')
            .sort({ requestDate: -1 });

        res.json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student's own requests
// @route   GET /api/issues/my-requests
// @access  Private/Student
const getMyRequests = async (req, res) => {
    try {
        const requests = await IssueRequest.find({ student: req.user._id })
            .populate('book', 'title author')
            .sort({ requestDate: -1 });

        res.json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve an issue request
// @route   PUT /api/issues/:id/approve
// @access  Private/Librarian
const approveRequest = async (req, res) => {
    try {
        const request = await IssueRequest.findById(req.params.id);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Valid pending request not found' });
        }

        const book = await Book.findById(request.book);
        if (book.availableCopies <= 0) {
            request.status = 'rejected';
            await request.save();
            return res.status(400).json({ success: false, message: 'Cannot approve: Book out of stock. Request rejected.' });
        }

        // Use custom dueDate if provided, otherwise default to 14 days
        let dueDate;
        if (req.body && req.body.dueDate) {
            dueDate = new Date(req.body.dueDate);
            // Validate it's in the future
            if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
                dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);
            }
        } else {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
        }

        // Create the IssuedBook document first to ensure it succeeds before modifying other documents
        const issuedBook = await IssuedBook.create({
            student: request.student,
            book: request.book,
            dueDate
        });

        // Decrease available copies
        book.availableCopies -= 1;
        await book.save();

        // Update request status
        request.status = 'approved';
        await request.save();

        res.json({ success: true, message: 'Request approved and book issued', data: issuedBook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reject an issue request
// @route   PUT /api/issues/:id/reject
// @access  Private/Librarian
const rejectRequest = async (req, res) => {
    try {
        const request = await IssueRequest.findById(req.params.id);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Valid pending request not found' });
        }

        request.status = 'rejected';
        await request.save();

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all issued books
// @route   GET /api/issued
// @access  Private/Librarian
const getIssuedBooks = async (req, res) => {
    try {
        const issuedBooks = await IssuedBook.find()
            .populate('student', 'name email profilePic')
            .populate('book', 'title author')
            .sort({ issueDate: -1 });

        res.json({ success: true, count: issuedBooks.length, data: issuedBooks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student's issued books
// @route   GET /api/issued/my-books
// @access  Private/Student
const getMyIssuedBooks = async (req, res) => {
    try {
        const issuedBooks = await IssuedBook.find({ student: req.user._id })
            .populate('book', 'title author category')
            .sort({ dueDate: 1 });

        res.json({ success: true, count: issuedBooks.length, data: issuedBooks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Return an issued book
// @route   PUT /api/issued/:id/return
// @access  Private/Librarian
const returnBook = async (req, res) => {
    try {
        const issuedBook = await IssuedBook.findById(req.params.id);

        if (!issuedBook || issuedBook.status === 'returned') {
            return res.status(404).json({ success: false, message: 'Valid active issue record not found' });
        }

        // Security check: Students can only return their own books
        if (req.user.role === 'student' && issuedBook.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to return this book' });
        }

        issuedBook.status = 'returned';
        issuedBook.returnDate = new Date();
        
        // Fine logic could go here if paying fine at return time

        await issuedBook.save();

        // Increase available copies
        const book = await Book.findById(issuedBook.book);
        if (book) {
            book.availableCopies += 1;
            await book.save();
        }

        res.json({ success: true, message: 'Book returned successfully', data: issuedBook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Renew a book (extend due date by 7 days)
// @route   PUT /api/issues/issued/:id/renew
// @access  Private/Student
const renewBook = async (req, res) => {
    try {
        const issuedBook = await IssuedBook.findById(req.params.id).populate('book', 'title');

        if (!issuedBook || issuedBook.status === 'returned') {
            return res.status(404).json({ success: false, message: 'Active issue record not found' });
        }

        // Students can only renew their own books
        if (req.user.role === 'student' && issuedBook.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to renew this book' });
        }

        if (issuedBook.renewalCount >= issuedBook.maxRenewals) {
            return res.status(400).json({
                success: false,
                message: `Max renewals (${issuedBook.maxRenewals}) reached for this book`
            });
        }

        // Extend due date by 7 days from current due date (or from now if overdue)
        const base = issuedBook.dueDate > new Date() ? issuedBook.dueDate : new Date();
        const newDueDate = new Date(base);
        newDueDate.setDate(newDueDate.getDate() + 7);

        issuedBook.dueDate       = newDueDate;
        issuedBook.renewalCount += 1;
        issuedBook.status        = 'issued'; // reset overdue status on renewal
        await issuedBook.save();

        res.json({
            success: true,
            message: `Book renewed! New due date: ${newDueDate.toLocaleDateString('en-IN')}`,
            data: issuedBook
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    requestIssue,
    getPendingRequests,
    getMyRequests,
    approveRequest,
    rejectRequest,
    getIssuedBooks,
    getMyIssuedBooks,
    returnBook,
    renewBook
};
