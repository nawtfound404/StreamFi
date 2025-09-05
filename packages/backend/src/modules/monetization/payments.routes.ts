import { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/environment';
import express from 'express';
import { TransactionModel, connectMongo } from '../../lib/mongo';
import { emitToStream } from '../../lib/socket';
import crypto from 'crypto';

const router = Router();
const stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' }) : null;

router.post('/stripe/create-payment-intent', async (req, res) => {
  if (!stripe) return res.status(501).json({ message: 'Stripe not configured' });
  const { amount, currency } = req.body as { amount: number; currency: string };
  if (!amount || !currency) return res.status(400).json({ message: 'amount and currency required' });
  const pi = await stripe.paymentIntents.create({ amount: Math.round(amount * 100), currency });
  res.json({ clientSecret: pi.client_secret });
});

// Stripe webhook (set STRIPE_WEBHOOK_SECRET). Use raw body parser for signature verification.
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(501).send('not configured');
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET as string);
  if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Optionally record donation transaction
      const txData: any = {
        amount: (pi.amount_received ?? pi.amount) / 100,
        currency: (pi.currency || 'usd').toUpperCase(),
        type: 'DONATION',
        status: 'COMPLETED',
        provider: 'STRIPE',
        metadata: pi as any,
      };
      if (pi.metadata?.userId) txData.userId = String(pi.metadata.userId);
      if (pi.metadata?.streamId) txData.streamId = String(pi.metadata.streamId);
  await connectMongo();
  const tx = await TransactionModel.create(txData).catch(() => void 0);
      if (pi.metadata?.streamId) {
        emitToStream(String(pi.metadata.streamId), 'donation', {
          amount: txData.amount,
          currency: txData.currency,
          from: txData.userId || 'anon',
          message: (pi.metadata?.message as string | undefined) || '',
        });
      }
    }
    res.json({ received: true });
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }
});

export default router;

// ----- UPI (mock provider example) -----
const upiRouter = Router();

// Create UPI intent (mock)
upiRouter.post('/intent', async (req, res) => {
  const { amount, currency, streamId, userId } = req.body as { amount: number; currency?: string; streamId?: string; userId?: string };
  if (!amount) return res.status(400).json({ message: 'amount required' });
  const id = crypto.randomUUID();
  // In real integration, generate UPI deeplink / QR and return
  return res.status(200).json({ intentId: id, deeplink: `upi://pay?pa=demo@bank&am=${amount}&cu=${(currency||'INR').toUpperCase()}`, streamId, userId });
});

// Webhook (mock confirmation)
upiRouter.post('/webhook', async (req, res) => {
  const evt = req.body as any;
  if (evt?.type === 'upi.payment_succeeded') {
    const meta = evt.data || {};
    await connectMongo();
    const tx = await TransactionModel.create({
      amount: Number(meta.amount || 0),
      currency: String(meta.currency || 'INR').toUpperCase(),
      type: 'DONATION',
      status: 'COMPLETED',
      provider: 'UPI',
      userId: String(meta.userId || ''),
      streamId: meta.streamId ? String(meta.streamId) : undefined,
      metadata: meta,
    }).catch(()=>null as any);
    if (meta.streamId) emitToStream(String(meta.streamId), 'donation', { amount: Number(meta.amount||0), currency: String(meta.currency||'INR').toUpperCase(), from: String(meta.userId||'anon') });
  }
  return res.json({ ok: true });
});

router.use('/upi', upiRouter);

// ----- PayPal (mock provider example) -----
const paypalRouter = Router();

// Create PayPal order (mock)
paypalRouter.post('/intent', async (req, res) => {
  const { amount, currency, streamId, userId } = req.body as { amount: number; currency?: string; streamId?: string; userId?: string };
  if (!amount) return res.status(400).json({ message: 'amount required' });
  const id = crypto.randomUUID();
  // Real flow would create an order via PayPal REST API and return approval link
  return res.status(200).json({ orderId: id, approveUrl: `https://paypal.com/checkoutnow?token=${id}`, streamId, userId });
});

// Webhook (mock capture)
paypalRouter.post('/webhook', async (req, res) => {
  const evt = req.body as any;
  if (evt?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const resource = evt.resource || {};
    const meta = resource.custom_id ? JSON.parse(resource.custom_id) : {};
    const amountVal = Number(resource?.amount?.value || meta?.amount || 0);
    const currency = String(resource?.amount?.currency_code || meta?.currency || 'USD').toUpperCase();
    await connectMongo();
    const tx = await TransactionModel.create({
      amount: amountVal,
      currency,
      type: 'DONATION',
      status: 'COMPLETED',
      provider: 'PAYPAL',
      userId: String(meta.userId || ''),
      streamId: meta.streamId ? String(meta.streamId) : undefined,
      metadata: resource,
    }).catch(()=>null as any);
    if (meta.streamId) emitToStream(String(meta.streamId), 'donation', { amount: amountVal, currency, from: String(meta.userId||'anon') });
  }
  return res.json({ ok: true });
});

router.use('/paypal', paypalRouter);
