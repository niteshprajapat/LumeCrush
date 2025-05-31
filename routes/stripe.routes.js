import express from 'express';
import { handleStripeWebhook } from '../controllers/user.controller.js';

const router = express.Router();

// Webhook endpoint (no authentication, Stripe signs requests)
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;