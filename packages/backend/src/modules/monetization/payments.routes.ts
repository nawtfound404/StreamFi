import { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/environment';
import express from 'express';
import { prisma } from '../../lib/prisma';

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
      await prisma.transaction.create({ data: txData }).catch(() => void 0);
    }
    res.json({ received: true });
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }
});

export default router;
