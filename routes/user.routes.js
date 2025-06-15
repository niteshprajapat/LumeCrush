import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { cancelSubscription, createCheckoutSession, getBillingDetails, getDiscoverUsers, getInvoices, getUsersByCommonReligionCommunity, getUsersBySameDatingGoals, getUsersBySameInterests, meProfile, requestRefund, updatePreferences, userProfileByUserId } from '../controllers/user.controller.js';


const router = express.Router();



router.get("/discover", isAuthenticated, getDiscoverUsers);

router.get("/me-profile", isAuthenticated, meProfile);
router.get("/user-profile/:userId", isAuthenticated, userProfileByUserId);
router.put("/update-preferences", isAuthenticated, updatePreferences);
// router.put("/update-profile", isAuthenticated, updateProfile);


// Filtered based apis
router.get("/discover/dating-goals", isAuthenticated, getUsersBySameDatingGoals);
router.get("/discover/common-religion-community", isAuthenticated, getUsersByCommonReligionCommunity);
router.get("/discover/interests", isAuthenticated, getUsersBySameInterests);


router.post("/create-checkout-session", isAuthenticated, createCheckoutSession);
router.post("/cancel-subscription", isAuthenticated, cancelSubscription);
router.post("/request-refund", isAuthenticated, requestRefund);


// New Billing Routes
router.get("/billing-details", isAuthenticated, getBillingDetails);
router.get("/invoices", isAuthenticated, getInvoices);

export default router;

