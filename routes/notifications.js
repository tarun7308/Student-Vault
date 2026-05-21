const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications } = require('../controllers/notificationController');

router.use(protect);
router.get('/', getNotifications);

module.exports = router;
