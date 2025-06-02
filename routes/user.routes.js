import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { cancelSubscription, createCheckoutSession, getDiscoverUsers, meProfile, requestRefund, updatePreferences, userProfileByUserId } from '../controllers/user.controller.js';


const router = express.Router();



router.get("/discover", isAuthenticated, getDiscoverUsers);

router.get("/me-profile", isAuthenticated, meProfile);
router.get("/user-profile/:userId", isAuthenticated, userProfileByUserId);
router.put("/update-preferences", isAuthenticated, updatePreferences);
// router.put("/update-profile", isAuthenticated, updateProfile);

router.post("/create-checkout-session", isAuthenticated, createCheckoutSession);
router.post("/cancel-subscription", isAuthenticated, cancelSubscription);
router.post("/request-refund", isAuthenticated, requestRefund);




export default router;

