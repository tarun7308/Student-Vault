const mongoose = require('mongoose');

const issuedBookSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date
    },
    fineAmount: {
        type: Number,
        default: 0
    },
    finePaid: {
        type: Boolean,
        default: false
    },
    finePaidDate: {
        type: Date
    },
    renewalCount: {
        type: Number,
        default: 0
    },
    maxRenewals: {
        type: Number,
        default: 2
    },
    status: {
        type: String,
        enum: ['issued', 'returned', 'overdue'],
        default: 'issued'
    }
}, { timestamps: true });

const IssuedBook = mongoose.model('IssuedBook', issuedBookSchema);
module.exports = IssuedBook;
