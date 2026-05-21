const multer = require('multer');
const path = require('path');

// Storage config
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, `${req.user ? req.user.id : 'temp'}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter (only images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.', false));
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB
    },
    fileFilter: fileFilter
});

module.exports = upload;
