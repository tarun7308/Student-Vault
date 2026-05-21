const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { addReview, getBookReviews, getMyReview, deleteReview } = require('../controllers/reviewController');

router.use(protect);
router.post('/',                   authorize('student'),  addReview);
router.get('/book/:bookId',                               getBookReviews);
router.get('/my/:bookId',          authorize('student'),  getMyReview);
router.delete('/:reviewId',        authorize('student'),  deleteReview);

module.exports = router;
