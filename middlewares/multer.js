import multer from "multer";
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/") // Ensure this folder exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const upload = multer({ storage });
export default upload;