const IssuedBook  = require('../models/IssuedBook');
const CustomFine  = require('../models/CustomFine');
const User        = require('../models/User');

// @desc   Mark a fine as paid
// @route  PUT /api/fines/:issuedBookId/pay
// @access Private/Librarian
const markFinePaid = async (req, res) => {
    try {
        const ib = await IssuedBook.findById(req.params.id)
            .populate('student', 'name email')
            .populate('book', 'title');

        if (!ib) return res.status(404).json({ success: false, message: 'Issue record not found' });

        const now = new Date();
        const isOverdue = now > ib.dueDate;
        const diffDays  = isOverdue ? Math.ceil((now - ib.dueDate) / 86400000) : 0;
        const fineAmt   = ib.fineAmount > 0 ? ib.fineAmount : diffDays;

        if (fineAmt <= 0) {
            return res.status(400).json({ success: false, message: 'No fine to mark as paid' });
        }
        if (ib.finePaid) {
            return res.status(400).json({ success: false, message: 'Fine already marked as paid' });
        }

        ib.finePaid     = true;
        ib.finePaidDate = now;
        ib.fineAmount   = fineAmt;
        await ib.save();

        res.json({
            success: true,
            message: `Fine of ₹${fineAmt} marked as paid for ${ib.student.name}`,
            data: ib
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get fine summary — all overdue with paid/unpaid status
// @route  GET /api/fines
// @access Private/Librarian
const getFineSummary = async (req, res) => {
    try {
        const now = new Date();

        // All issued records that are overdue OR have a recorded fineAmount
        const records = await IssuedBook.find({
            $or: [
                { dueDate: { $lt: now }, status: { $in: ['issued', 'overdue'] } },
                { fineAmount: { $gt: 0 } }
            ]
        })
        .populate('student', 'name email')
        .populate('book', 'title')
        .sort({ dueDate: 1 });

        const data = records.map(ib => {
            const overdueDays = ib.dueDate < now && ib.status !== 'returned'
                ? Math.ceil((now - ib.dueDate) / 86400000)
                : 0;
            const fineAmt = ib.fineAmount > 0 ? ib.fineAmount : overdueDays;
            return {
                _id:        ib._id,
                student:    ib.student,
                book:       ib.book,
                dueDate:    ib.dueDate,
                returnDate: ib.returnDate,
                status:     ib.status,
                overdueDays,
                fineAmount: fineAmt,
                finePaid:   ib.finePaid,
                finePaidDate: ib.finePaidDate
            };
        });

        const totalOutstanding = data.filter(d => !d.finePaid).reduce((s, d) => s + d.fineAmount, 0);
        const totalCollected   = data.filter(d => d.finePaid).reduce((s, d) => s + d.fineAmount, 0);

        res.json({
            success: true,
            stats: { totalOutstanding, totalCollected },
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { markFinePaid, getFineSummary, addCustomFine, payCustomFine, deleteCustomFine };

// ── Custom Fines ──────────────────────────────────────────────────────────────

// @desc   Librarian adds a custom fine to a student
// @route  POST /api/fines/custom
// @access Private/Librarian
async function addCustomFine(req, res) {
    try {
        const { studentId, amount, reason, issuedBookId } = req.body;
        if (!studentId || !amount || !reason) {
            return res.status(400).json({ success: false, message: 'studentId, amount, and reason are required' });
        }
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        const fine = await CustomFine.create({
            student: studentId, amount: Number(amount), reason,
            issuedBook: issuedBookId || null, createdBy: req.user._id
        });
        await fine.populate('student', 'name email');
        res.status(201).json({ success: true, message: `Custom fine of ₹${amount} added for ${student.name}`, data: fine });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// @desc   Mark a custom fine as paid
// @route  PUT /api/fines/custom/:id/pay
// @access Private/Librarian
async function payCustomFine(req, res) {
    try {
        const fine = await CustomFine.findById(req.params.id).populate('student', 'name');
        if (!fine) return res.status(404).json({ success: false, message: 'Custom fine not found' });
        if (fine.paid) return res.status(400).json({ success: false, message: 'Fine already paid' });
        fine.paid = true; fine.paidDate = new Date(); await fine.save();
        res.json({ success: true, message: `₹${fine.amount} marked as paid for ${fine.student.name}`, data: fine });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// @desc   Delete a custom fine
// @route  DELETE /api/fines/custom/:id
// @access Private/Librarian
async function deleteCustomFine(req, res) {
    try {
        const fine = await CustomFine.findByIdAndDelete(req.params.id);
        if (!fine) return res.status(404).json({ success: false, message: 'Custom fine not found' });
        res.json({ success: true, message: 'Custom fine deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
