const mongoose = require('mongoose');

const customFineSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Fine amount is required'],
        min: [1, 'Amount must be at least ₹1']
    },
    reason: {
        type: String,
        required: [true, 'A reason is required'],
        trim: true
    },
    issuedBook: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IssuedBook',
        default: null   // optional — can be tied to a specific issue
    },
    paid: {
        type: Boolean,
        default: false
    },
    paidDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'     // librarian who added it
    }
}, { timestamps: true });

const CustomFine = mongoose.model('CustomFine', customFineSchema);
module.exports = CustomFine;
