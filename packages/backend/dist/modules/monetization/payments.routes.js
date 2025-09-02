"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const environment_1 = require("../../config/environment");
const express_2 = __importDefault(require("express"));
const prisma_1 = require("../../lib/prisma");
const router = (0, express_1.Router)();
const stripe = environment_1.env.stripe.secretKey ? new stripe_1.default(environment_1.env.stripe.secretKey, { apiVersion: '2024-06-20' }) : null;
router.post('/stripe/create-payment-intent', async (req, res) => {
    if (!stripe)
        return res.status(501).json({ message: 'Stripe not configured' });
    const { amount, currency } = req.body;
    if (!amount || !currency)
        return res.status(400).json({ message: 'amount and currency required' });
    const pi = await stripe.paymentIntents.create({ amount: Math.round(amount * 100), currency });
    res.json({ clientSecret: pi.client_secret });
});
// Stripe webhook (set STRIPE_WEBHOOK_SECRET). Use raw body parser for signature verification.
router.post('/stripe/webhook', express_2.default.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe)
        return res.status(501).send('not configured');
    const sig = req.headers['stripe-signature'];
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object;
            // Optionally record donation transaction
            const txData = {
                amount: (pi.amount_received ?? pi.amount) / 100,
                currency: (pi.currency || 'usd').toUpperCase(),
                type: 'DONATION',
                status: 'COMPLETED',
                provider: 'STRIPE',
                metadata: pi,
            };
            if (pi.metadata?.userId)
                txData.userId = String(pi.metadata.userId);
            if (pi.metadata?.streamId)
                txData.streamId = String(pi.metadata.streamId);
            await prisma_1.prisma.transaction.create({ data: txData }).catch(() => void 0);
        }
        res.json({ received: true });
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
exports.default = router;
//# sourceMappingURL=payments.routes.js.map