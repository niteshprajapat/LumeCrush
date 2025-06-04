import express from "express";
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { endVideoCall, startVideoCall } from "../controllers/videocall.controller.js";


const router = express.Router();

router.post("/start-video-call", isAuthenticated, startVideoCall);
router.post("/end-video-call", isAuthenticated, endVideoCall);


export default router;