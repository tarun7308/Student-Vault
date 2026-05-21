const mongoose = require('mongoose');

const issueRequestSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const IssueRequest = mongoose.model('IssueRequest', issueRequestSchema);
module.exports = IssueRequest;
