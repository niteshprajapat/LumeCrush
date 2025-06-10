import express from "express";
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { endVideoCall, getAllVideoCalls, startRecording, startVideoCall, stopRecording } from "../controllers/videocall.controller.js";


const router = express.Router();

router.post("/start-video-call", isAuthenticated, startVideoCall);
router.post("/end-video-call", isAuthenticated, endVideoCall);
router.post("/start-recording", isAuthenticated, startRecording);
router.post("/stop-recording", isAuthenticated, stopRecording);
router.get("/get-all-videocalls", isAuthenticated, getAllVideoCalls);

export default router;