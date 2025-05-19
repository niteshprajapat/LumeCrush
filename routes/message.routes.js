import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getMessagesByMatchId, sendMessage, deleteMessagesBymessageId, updateMessagesBymessageId } from '../controllers/message.controller.js';


const router = express.Router();



router.post("/send-message", isAuthenticated, sendMessage);
router.get("/get-messages-by-matchId/:matchId", isAuthenticated, getMessagesByMatchId);
router.put("/update-messages/:messageId", isAuthenticated, updateMessagesBymessageId);
router.delete("/delete-messages/:messageId", isAuthenticated, deleteMessagesBymessageId);



export default router;

