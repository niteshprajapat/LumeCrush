import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getDiscoverUsers } from '../controllers/user.controller.js';


const router = express.Router();



router.get("/discover", isAuthenticated, getDiscoverUsers);




export default router;

