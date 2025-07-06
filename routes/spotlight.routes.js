import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { activateSpotlight, getSpotlights, purchaseSpotlight } from '../controllers/spotlight.controller.js';

const router = express.Router();




router.post("/purchase-spotlight", isAuthenticated, purchaseSpotlight);
router.post("/activate-spotlight", isAuthenticated, activateSpotlight);
router.get("/get-spotlight", isAuthenticated, getSpotlights);

export default router;

