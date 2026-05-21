const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Please provide a rating'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        maxlength: [500, 'Review cannot exceed 500 characters'],
        default: ''
    }
}, { timestamps: true });

// One review per student per book
reviewSchema.index({ book: 1, student: 1 }, { unique: true });

// After save, recompute book's average rating
reviewSchema.post('save', async function () {
    await this.constructor.calcAverageRating(this.book);
});
reviewSchema.post('deleteOne', { document: true }, async function () {
    await this.constructor.calcAverageRating(this.book);
});

reviewSchema.statics.calcAverageRating = async function (bookId) {
    const stats = await this.aggregate([
        { $match: { book: bookId } },
        { $group: { _id: '$book', avgRating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
    ]);
    const Book = require('./Book');
    if (stats.length > 0) {
        await Book.findByIdAndUpdate(bookId, {
            averageRating: Math.round(stats[0].avgRating * 10) / 10,
            numReviews: stats[0].numReviews
        });
    } else {
        await Book.findByIdAndUpdate(bookId, { averageRating: 0, numReviews: 0 });
    }
};

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
