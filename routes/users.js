const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getUserProfile, updateUserProfile, getStudents, deleteStudent } = require('../controllers/userController');

router.use(protect);

router.route('/profile')
    .get(getUserProfile)
    .put(upload.single('profilePic'), updateUserProfile);

// Librarian only routes
router.use(authorize('librarian'));

router.route('/students')
    .get(getStudents);

router.route('/:id')
    .delete(deleteStudent);

module.exports = router;
