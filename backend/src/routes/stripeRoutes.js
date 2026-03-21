import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createCheckoutSession, createBillingPortalSession, handleWebhook } from '../controllers/stripeController.js';

const router = Router();

// Authenticated routes
router.post('/create-checkout-session', authenticate, createCheckoutSession);
router.post('/create-billing-portal', authenticate, createBillingPortalSession);

// Webhook – NO auth, raw body is handled in app.js before JSON parser
router.post('/webhook', handleWebhook);

export default router;
