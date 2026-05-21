const Review  = require('../models/Review');
const IssuedBook = require('../models/IssuedBook');

// @desc   Add or update a review
// @route  POST /api/reviews
// @access Private/Student
const addReview = async (req, res) => {
    try {
        const { bookId, rating, comment } = req.body;
        if (!bookId || !rating) {
            return res.status(400).json({ success: false, message: 'bookId and rating are required' });
        }

        // Only students who actually borrowed the book can review
        const hasBorrowed = await IssuedBook.findOne({
            student: req.user._id,
            book: bookId,
            status: 'returned'
        });
        if (!hasBorrowed) {
            return res.status(403).json({ success: false, message: 'You can only review books you have returned.' });
        }

        // Upsert review
        const review = await Review.findOneAndUpdate(
            { book: bookId, student: req.user._id },
            { rating: Number(rating), comment: comment || '' },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        // Recalculate average manually for upsert case
        await Review.calcAverageRating(review.book);

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get reviews for a specific book
// @route  GET /api/reviews/book/:bookId
// @access Private
const getBookReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ book: req.params.bookId })
            .populate('student', 'name profilePic')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get my review for a book
// @route  GET /api/reviews/my/:bookId
// @access Private/Student
const getMyReview = async (req, res) => {
    try {
        const review = await Review.findOne({ book: req.params.bookId, student: req.user._id });
        res.json({ success: true, data: review || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete my review
// @route  DELETE /api/reviews/:reviewId
// @access Private/Student
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        if (review.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await review.deleteOne();
        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { addReview, getBookReviews, getMyReview, deleteReview };
