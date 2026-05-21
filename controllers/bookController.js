const Book = require('../models/Book');

// @desc    Get all books
// @route   GET /api/books
// @access  Private (Student & Librarian)
const getBooks = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const startIndex = (page - 1) * limit;

        let query = {};
        
        // Search by title or author
        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { author: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Filter by category
        if (req.query.category && req.query.category !== 'All') {
            query.category = req.query.category;
        }

        const total = await Book.countDocuments(query);
        const books = await Book.find(query).skip(startIndex).limit(limit).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: books.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: books
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Private
const getBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new book
// @route   POST /api/books
// @access  Private/Librarian
const createBook = async (req, res) => {
    try {
        const { title, author, category, totalCopies, description } = req.body;
        
        const book = await Book.create({
            title,
            author,
            category,
            totalCopies: totalCopies || 1,
            availableCopies: totalCopies || 1, // Initially available = total
            description
        });

        res.status(201).json({ success: true, data: book });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private/Librarian
const updateBook = async (req, res) => {
    try {
        let book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        // Adjust available copies if total copies changed
        if (req.body.totalCopies !== undefined) {
            const diff = req.body.totalCopies - book.totalCopies;
            req.body.availableCopies = book.availableCopies + diff;
            if (req.body.availableCopies < 0) {
                 return res.status(400).json({ success: false, message: 'Cannot reduce total copies below currently issued copies' });
            }
        }

        book = await Book.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, data: book });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private/Librarian
const deleteBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        if (book.availableCopies !== book.totalCopies) {
            return res.status(400).json({ success: false, message: 'Cannot delete book. Some copies are currently issued.' });
        }

        await book.deleteOne();

        res.json({ success: true, message: 'Book removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getBooks,
    getBook,
    createBook,
    updateBook,
    deleteBook
};
