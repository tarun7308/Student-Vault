const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    author: {
        type: String,
        required: [true, 'Please add an author'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Please add a category']
    },
    totalCopies: {
        type: Number,
        required: [true, 'Please add total copies'],
        min: 0
    },
    availableCopies: {
        type: Number,
        required: [true, 'Please add available copies'],
        min: 0
    },
    description: {
        type: String,
        default: ''
    },
    isbn: {
        type: String,
        default: ''
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    numReviews: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;
