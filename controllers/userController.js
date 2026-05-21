const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                success: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    profilePic: user.profilePic
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            
            if (req.body.password) {
                user.password = req.body.password;
            }

            if (req.file) {
                user.profilePic = `/uploads/${req.file.filename}`;
            }

            const updatedUser = await user.save();

            res.json({
                success: true,
                user: {
                    id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    profilePic: updatedUser.profilePic
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all students
// @route   GET /api/users/students
// @access  Private/Librarian
const getStudents = async (req, res) => {
    try {
        // Implementation logic for pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        let query = { role: 'student' };
        
        // Search by name or email
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const students = await User.find(query).skip(startIndex).limit(limit);

        res.json({
            success: true,
            count: students.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a student
// @route   DELETE /api/users/:id
// @access  Private/Librarian
const deleteStudent = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role === 'librarian') {
            return res.status(400).json({ success: false, message: 'Cannot delete a librarian' });
        }

        await user.deleteOne();
        res.json({ success: true, message: 'User removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getStudents,
    deleteStudent
};
