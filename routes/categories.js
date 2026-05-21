const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getCategories, createCategory, updateCategory, deleteCategory, seedDefaults } = require('../controllers/categoryController');

router.use(protect);
router.get('/',           getCategories);
router.post('/',          authorize('librarian'), createCategory);
router.put('/:id',        authorize('librarian'), updateCategory);
router.delete('/:id',     authorize('librarian'), deleteCategory);
router.post('/seed',      authorize('librarian'), seedDefaults);

module.exports = router;
