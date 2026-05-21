const Category = require('../models/Category');

// @desc   Get all categories
// @route  GET /api/categories
// @access Private
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Create a category
// @route  POST /api/categories
// @access Private/Librarian
const createCategory = async (req, res) => {
    try {
        const { name, color, icon } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

        const exists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (exists) return res.status(400).json({ success: false, message: 'Category already exists' });

        const category = await Category.create({ name, color: color || '#3b82f6', icon: icon || 'fa-book' });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Update a category
// @route  PUT /api/categories/:id
// @access Private/Librarian
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete a category
// @route  DELETE /api/categories/:id
// @access Private/Librarian
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Seed default categories if empty
// @route  POST /api/categories/seed
// @access Private/Librarian
const seedDefaults = async (req, res) => {
    try {
        const count = await Category.countDocuments();
        if (count > 0) return res.json({ success: true, message: 'Categories already seeded' });

        const defaults = [
            { name: 'Computer Science', color: '#3b82f6', icon: 'fa-laptop-code' },
            { name: 'Mathematics',      color: '#8b5cf6', icon: 'fa-square-root-variable' },
            { name: 'Physics',          color: '#06b6d4', icon: 'fa-atom' },
            { name: 'Chemistry',        color: '#10b981', icon: 'fa-flask' },
            { name: 'Literature',       color: '#ec4899', icon: 'fa-feather' },
            { name: 'History',          color: '#f59e0b', icon: 'fa-landmark' },
            { name: 'Biology',          color: '#22c55e', icon: 'fa-dna' },
            { name: 'Economics',        color: '#f97316', icon: 'fa-chart-line' },
            { name: 'Engineering',      color: '#6366f1', icon: 'fa-gears' },
            { name: 'Other',            color: '#94a3b8', icon: 'fa-book' },
        ];
        await Category.insertMany(defaults);
        const all = await Category.find().sort({ name: 1 });
        res.status(201).json({ success: true, data: all });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, seedDefaults };
