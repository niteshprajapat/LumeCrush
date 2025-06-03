import express from "express";
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { startVideoCall } from "../controllers/videocall.controller.js";


const router = express.Router();

router.post("/start-video-call", isAuthenticated, startVideoCall);


export default router;