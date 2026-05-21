const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
    requestIssue,
    getPendingRequests,
    getMyRequests,
    approveRequest,
    rejectRequest,
    getIssuedBooks,
    getMyIssuedBooks,
    returnBook,
    renewBook
} = require('../controllers/issueController');

router.use(protect);

// Student Routes
router.post('/request', authorize('student'), requestIssue);
router.get('/my-requests', authorize('student'), getMyRequests);
router.get('/my-books', authorize('student'), getMyIssuedBooks);

// Librarian Routes
router.get('/pending', authorize('librarian'), getPendingRequests);
router.put('/:id/approve', authorize('librarian'), approveRequest);
router.put('/:id/reject', authorize('librarian'), rejectRequest);
router.get('/issued', authorize('librarian'), getIssuedBooks);
router.put('/issued/:id/return', authorize('librarian', 'student'), returnBook);
router.put('/issued/:id/renew',  authorize('student'), renewBook);

module.exports = router;
