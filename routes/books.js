const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getBooks, getBook, createBook, updateBook, deleteBook } = require('../controllers/bookController');

router.use(protect);

router.route('/')
    .get(getBooks)
    .post(authorize('librarian'), createBook);

router.route('/:id')
    .get(getBook)
    .put(authorize('librarian'), updateBook)
    .delete(authorize('librarian'), deleteBook);

module.exports = router;
