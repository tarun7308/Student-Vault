const BookRequest = require('../models/BookRequest');

// @desc    Suggest a new book
// @route   POST /api/book-requests
// @access  Private/Student
const suggestBook = async (req, res) => {
    try {
        const { title, author, reason } = req.body;

        const suggestion = await BookRequest.create({
            student: req.user._id,
            title,
            author,
            reason
        });

        res.status(201).json({ success: true, data: suggestion });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get all book suggestions
// @route   GET /api/book-requests
// @access  Private/Librarian
const getSuggestions = async (req, res) => {
    try {
        const suggestions = await BookRequest.find()
            .populate('student', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: suggestions.length, data: suggestions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve a suggestion
// @route   PUT /api/book-requests/:id/approve
// @access  Private/Librarian
const approveSuggestion = async (req, res) => {
    try {
        const suggestion = await BookRequest.findById(req.params.id);

        if (!suggestion || suggestion.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Valid pending suggestion not found' });
        }

        suggestion.status = 'approved';
        await suggestion.save();

        res.json({ success: true, message: 'Suggestion approved', data: suggestion });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reject a suggestion
// @route   PUT /api/book-requests/:id/reject
// @access  Private/Librarian
const rejectSuggestion = async (req, res) => {
    try {
        const suggestion = await BookRequest.findById(req.params.id);

        if (!suggestion || suggestion.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Valid pending suggestion not found' });
        }

        suggestion.status = 'rejected';
        await suggestion.save();

        res.json({ success: true, message: 'Suggestion rejected', data: suggestion });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    suggestBook,
    getSuggestions,
    approveSuggestion,
    rejectSuggestion
};
