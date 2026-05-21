const mongoose = require('mongoose');

const bookRequestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please provide the book title'],
        trim: true
    },
    author: {
        type: String,
        required: [true, 'Please provide the author name'],
        trim: true
    },
    reason: {
        type: String,
        required: [true, 'Please provide a reason for the request']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

const BookRequest = mongoose.model('BookRequest', bookRequestSchema);
module.exports = BookRequest;
