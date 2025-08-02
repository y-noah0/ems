const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Ensure upload directory exists with absolute path
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'schools');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|svg|gif/;
        const extValid = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeValid = allowed.test(file.mimetype);
        if (extValid && mimeValid) return cb(null, true);
        cb(new Error('Only image files are allowed (jpeg, jpg, png, svg, gif)'));
    }
});

module.exports = upload;
