const IssueRequest = require('../models/IssueRequest');
const IssuedBook   = require('../models/IssuedBook');
const BookRequest  = require('../models/BookRequest');

// @desc   Get notifications for the logged-in user
// @route  GET /api/notifications
// @access Private
const getNotifications = async (req, res) => {
    try {
        const notifications = [];
        const now = new Date();

        if (req.user.role === 'student') {
            // ── 1. Recently approved requests (last 7 days) ──────────────────
            const approved = await IssueRequest.find({
                student: req.user._id,
                status: 'approved',
                requestDate: { $gte: new Date(Date.now() - 7 * 86400000) }
            }).populate('book', 'title').sort({ requestDate: -1 }).limit(5);

            approved.forEach(r => {
                notifications.push({
                    id: r._id,
                    type: 'success',
                    icon: 'fa-circle-check',
                    title: 'Request Approved',
                    message: `"${r.book.title}" has been approved and issued to you.`,
                    time: r.requestDate,
                    link: '/student/mybooks'
                });
            });

            // ── 2. Recently rejected requests (last 7 days) ──────────────────
            const rejected = await IssueRequest.find({
                student: req.user._id,
                status: 'rejected',
                requestDate: { $gte: new Date(Date.now() - 7 * 86400000) }
            }).populate('book', 'title').sort({ requestDate: -1 }).limit(5);

            rejected.forEach(r => {
                notifications.push({
                    id: r._id,
                    type: 'error',
                    icon: 'fa-circle-xmark',
                    title: 'Request Rejected',
                    message: `Your request for "${r.book.title}" was rejected.`,
                    time: r.requestDate,
                    link: '/student/requests'
                });
            });

            // ── 3. Books due in ≤ 3 days ──────────────────────────────────────
            const threeDaysLater = new Date(Date.now() + 3 * 86400000);
            const dueSoon = await IssuedBook.find({
                student: req.user._id,
                status: { $in: ['issued', 'overdue'] },
                dueDate: { $gte: now, $lte: threeDaysLater }
            }).populate('book', 'title').sort({ dueDate: 1 });

            dueSoon.forEach(ib => {
                const diffDays = Math.ceil((ib.dueDate - now) / 86400000);
                notifications.push({
                    id: ib._id,
                    type: 'warning',
                    icon: 'fa-clock',
                    title: 'Due Soon',
                    message: `"${ib.book.title}" is due in ${diffDays} day${diffDays !== 1 ? 's' : ''}.`,
                    time: ib.dueDate,
                    link: '/student/mybooks'
                });
            });

            // ── 4. Overdue books ──────────────────────────────────────────────
            const overdue = await IssuedBook.find({
                student: req.user._id,
                status: { $in: ['issued', 'overdue'] },
                dueDate: { $lt: now }
            }).populate('book', 'title').sort({ dueDate: 1 });

            overdue.forEach(ib => {
                const diffDays = Math.ceil((now - ib.dueDate) / 86400000);
                const fine = diffDays;
                notifications.push({
                    id: ib._id,
                    type: 'error',
                    icon: 'fa-triangle-exclamation',
                    title: 'Book Overdue!',
                    message: `"${ib.book.title}" is ${diffDays} day${diffDays !== 1 ? 's' : ''} overdue. Fine: ₹${fine}.`,
                    time: ib.dueDate,
                    link: '/student/mybooks'
                });
            });

            // ── 5. Pending requests ───────────────────────────────────────────
            const pending = await IssueRequest.find({
                student: req.user._id,
                status: 'pending'
            }).populate('book', 'title').sort({ requestDate: -1 }).limit(3);

            pending.forEach(r => {
                notifications.push({
                    id: r._id,
                    type: 'info',
                    icon: 'fa-hourglass-half',
                    title: 'Request Pending',
                    message: `Your request for "${r.book.title}" is awaiting librarian approval.`,
                    time: r.requestDate,
                    link: '/student/requests'
                });
            });

            // ── 6. Custom fines applied by librarian ─────────────────────────
            const CustomFine = require('../models/CustomFine');
            const customFines = await CustomFine.find({
                student: req.user._id,
                paid: false
            }).sort({ createdAt: -1 }).limit(5);

            customFines.forEach(f => {
                notifications.push({
                    id: f._id,
                    type: 'error',
                    icon: 'fa-triangle-exclamation',
                    title: `Custom Fine: ₹${f.amount}`,
                    message: `A fine of ₹${f.amount} has been applied to your account. Reason: "${f.reason}".`,
                    time: f.createdAt,
                    link: '/student/mybooks'
                });
            });

        } else if (req.user.role === 'librarian') {
            // ── 1. New pending issue requests ─────────────────────────────────
            const pending = await IssueRequest.find({ status: 'pending' })
                .populate('student', 'name')
                .populate('book', 'title')
                .sort({ requestDate: -1 })
                .limit(8);

            pending.forEach(r => {
                notifications.push({
                    id: r._id,
                    type: 'info',
                    icon: 'fa-inbox',
                    title: 'New Issue Request',
                    message: `${r.student.name} requested "${r.book.title}".`,
                    time: r.requestDate,
                    link: '/librarian/requests'
                });
            });

            // ── 2. Overdue books ──────────────────────────────────────────────
            const overdue = await IssuedBook.find({
                status: { $in: ['issued', 'overdue'] },
                dueDate: { $lt: now }
            })
                .populate('student', 'name')
                .populate('book', 'title')
                .sort({ dueDate: 1 })
                .limit(6);

            overdue.forEach(ib => {
                const diffDays = Math.ceil((now - ib.dueDate) / 86400000);
                notifications.push({
                    id: ib._id,
                    type: 'error',
                    icon: 'fa-triangle-exclamation',
                    title: 'Overdue Alert',
                    message: `${ib.student.name}'s copy of "${ib.book.title}" is ${diffDays} day${diffDays !== 1 ? 's' : ''} overdue.`,
                    time: ib.dueDate,
                    link: '/librarian/issued'
                });
            });

            // ── 3. New book suggestions (last 7 days) ─────────────────────────
            const suggestions = await BookRequest.find({
                status: 'pending',
                createdAt: { $gte: new Date(Date.now() - 7 * 86400000) }
            })
                .populate('student', 'name')
                .sort({ createdAt: -1 })
                .limit(4);

            suggestions.forEach(s => {
                notifications.push({
                    id: s._id,
                    type: 'success',
                    icon: 'fa-lightbulb',
                    title: 'Book Suggestion',
                    message: `${s.student.name} suggested "${s.title}" by ${s.author}.`,
                    time: s.createdAt,
                    link: '/librarian/requests'
                });
            });

            // ── 4. Recently returned books (last 7 days) ──────────────────────
            const returned = await IssuedBook.find({
                status: 'returned',
                returnDate: { $gte: new Date(Date.now() - 7 * 86400000) }
            })
                .populate('student', 'name')
                .populate('book', 'title')
                .sort({ returnDate: -1 })
                .limit(6);

            returned.forEach(ib => {
                if (ib.student && ib.book) {
                    notifications.push({
                        id: ib._id,
                        type: 'success',
                        icon: 'fa-rotate-left',
                        title: 'Book Returned',
                        message: `${ib.student.name} returned "${ib.book.title}".`,
                        time: ib.returnDate,
                        link: '/librarian/issued'
                    });
                }
            });
        }

        // Sort all notifications by time (newest first)
        notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({
            success: true,
            count: notifications.length,
            data: notifications.slice(0, 12)  // max 12
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getNotifications };
