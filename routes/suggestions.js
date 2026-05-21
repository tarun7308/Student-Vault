const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { suggestBook, getSuggestions, approveSuggestion, rejectSuggestion } = require('../controllers/suggestionController');

router.use(protect);

router.route('/')
    .post(authorize('student'), suggestBook)
    .get(authorize('librarian'), getSuggestions);

router.put('/:id/approve', authorize('librarian'), approveSuggestion);
router.put('/:id/reject', authorize('librarian'), rejectSuggestion);

module.exports = router;
