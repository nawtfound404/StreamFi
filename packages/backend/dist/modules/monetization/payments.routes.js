"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const environment_1 = require("../../config/environment");
const express_2 = __importDefault(require("express"));
const mongo_1 = require("../../lib/mongo");
const socket_1 = require("../../lib/socket");
const crypto_1 = __importDefault(require("crypto"));
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
            await (0, mongo_1.connectMongo)();
            const tx = await mongo_1.TransactionModel.create(txData).catch(() => void 0);
            if (pi.metadata?.streamId) {
                (0, socket_1.emitToStream)(String(pi.metadata.streamId), 'donation', {
                    amount: txData.amount,
                    currency: txData.currency,
                    from: txData.userId || 'anon',
                    message: pi.metadata?.message || '',
                });
            }
        }
        res.json({ received: true });
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
exports.default = router;
// ----- UPI (mock provider example) -----
const upiRouter = (0, express_1.Router)();
// Create UPI intent (mock)
upiRouter.post('/intent', async (req, res) => {
    const { amount, currency, streamId, userId } = req.body;
    if (!amount)
        return res.status(400).json({ message: 'amount required' });
    const id = crypto_1.default.randomUUID();
    // In real integration, generate UPI deeplink / QR and return
    return res.status(200).json({ intentId: id, deeplink: `upi://pay?pa=demo@bank&am=${amount}&cu=${(currency || 'INR').toUpperCase()}`, streamId, userId });
});
// Webhook (mock confirmation)
upiRouter.post('/webhook', async (req, res) => {
    const evt = req.body;
    if (evt?.type === 'upi.payment_succeeded') {
        const meta = evt.data || {};
        await (0, mongo_1.connectMongo)();
        const tx = await mongo_1.TransactionModel.create({
            amount: Number(meta.amount || 0),
            currency: String(meta.currency || 'INR').toUpperCase(),
            type: 'DONATION',
            status: 'COMPLETED',
            provider: 'UPI',
            userId: String(meta.userId || ''),
            streamId: meta.streamId ? String(meta.streamId) : undefined,
            metadata: meta,
        }).catch(() => null);
        if (meta.streamId)
            (0, socket_1.emitToStream)(String(meta.streamId), 'donation', { amount: Number(meta.amount || 0), currency: String(meta.currency || 'INR').toUpperCase(), from: String(meta.userId || 'anon') });
    }
    return res.json({ ok: true });
});
router.use('/upi', upiRouter);
// ----- PayPal (mock provider example) -----
const paypalRouter = (0, express_1.Router)();
// Create PayPal order (mock)
paypalRouter.post('/intent', async (req, res) => {
    const { amount, currency, streamId, userId } = req.body;
    if (!amount)
        return res.status(400).json({ message: 'amount required' });
    const id = crypto_1.default.randomUUID();
    // Real flow would create an order via PayPal REST API and return approval link
    return res.status(200).json({ orderId: id, approveUrl: `https://paypal.com/checkoutnow?token=${id}`, streamId, userId });
});
// Webhook (mock capture)
paypalRouter.post('/webhook', async (req, res) => {
    const evt = req.body;
    if (evt?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = evt.resource || {};
        const meta = resource.custom_id ? JSON.parse(resource.custom_id) : {};
        const amountVal = Number(resource?.amount?.value || meta?.amount || 0);
        const currency = String(resource?.amount?.currency_code || meta?.currency || 'USD').toUpperCase();
        await (0, mongo_1.connectMongo)();
        const tx = await mongo_1.TransactionModel.create({
            amount: amountVal,
            currency,
            type: 'DONATION',
            status: 'COMPLETED',
            provider: 'PAYPAL',
            userId: String(meta.userId || ''),
            streamId: meta.streamId ? String(meta.streamId) : undefined,
            metadata: resource,
        }).catch(() => null);
        if (meta.streamId)
            (0, socket_1.emitToStream)(String(meta.streamId), 'donation', { amount: amountVal, currency, from: String(meta.userId || 'anon') });
    }
    return res.json({ ok: true });
});
router.use('/paypal', paypalRouter);
//# sourceMappingURL=payments.routes.js.map