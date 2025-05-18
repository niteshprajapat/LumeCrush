import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getMessagesByMatchId, sendMessage } from '../controllers/message.controller.js';


const router = express.Router();



router.post("/send-message", isAuthenticated, sendMessage);
router.get("/get-messages-by-matchId/:matchId", isAuthenticated, getMessagesByMatchId);



export default router;

