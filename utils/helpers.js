const calculateFine = (dueDate, returnDate = new Date()) => {
    // 0 fine if returned before due date
    if (returnDate <= dueDate) {
        return 0;
    }

    // Calculate days diff
    const diffTime = Math.abs(returnDate - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Fine is 1 unit per day overdue (configurable)
    const finePerDay = 1;
    return diffDays * finePerDay;
};

// Generates a JWT token
const jwt = require('jsonwebtoken');
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

module.exports = {
    calculateFine,
    generateToken
};
