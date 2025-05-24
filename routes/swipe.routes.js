import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getLikesReceived, getSwipeHistoryOfUser, swipeUser } from '../controllers/swipe.controller.js';


const router = express.Router();



router.post("/swipeUser", isAuthenticated, swipeUser);
router.get("/get-swipe-history", isAuthenticated, getSwipeHistoryOfUser);
router.get("/get-likes-received", isAuthenticated, getLikesReceived);




export default router;

