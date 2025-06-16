import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';
import { createPost } from '../controllers/post.controller.js';

const router = express.Router();


router.post("/create-post", isAuthenticated, upload.single("image"), createPost);

export default router;