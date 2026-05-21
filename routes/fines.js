const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
    markFinePaid,
    getFineSummary,
    addCustomFine,
    payCustomFine,
    deleteCustomFine
} = require('../controllers/fineController');

router.use(protect, authorize('librarian'));

// Overdue fines (IssuedBook-based)
router.get('/',        getFineSummary);
router.put('/:id/pay', markFinePaid);

// Custom fines (librarian-created)
router.post('/custom',         addCustomFine);
router.put('/custom/:id/pay',  payCustomFine);
router.delete('/custom/:id',   deleteCustomFine);

module.exports = router;
