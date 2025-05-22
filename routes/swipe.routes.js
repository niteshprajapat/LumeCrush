import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getSwipeHistoryOfUser, swipeUser } from '../controllers/swipe.controller.js';


const router = express.Router();



router.post("/swipeUser", isAuthenticated, swipeUser);
router.get("/get-swipe-history", isAuthenticated, getSwipeHistoryOfUser);




export default router;

