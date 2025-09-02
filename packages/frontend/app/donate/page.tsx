"use client";
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { createStripeDonation } from '@/modules/monetization';

const stripePromise = typeof window !== 'undefined' ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '') : (null as unknown as Promise<import('@stripe/stripe-js').Stripe | null>);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/donate' },
      redirect: 'if_required',
    });
    if (error) setMessage(error.message || 'Payment failed');
    else setMessage('Payment succeeded');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <PaymentElement />
      <button disabled={loading || !stripe || !elements} className="px-4 py-2 bg-black text-white rounded">
        {loading ? 'Processing…' : 'Donate'}
      </button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  );
}

export default function DonatePage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  async function init(amount = 5, currency = 'USD') {
    const res = await createStripeDonation(amount, currency);
    setClientSecret(res.clientSecret);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Support the Stream</h1>
      <div className="flex gap-2">
        <button className="px-3 py-1 border rounded" onClick={() => init(5)}>Donate $5</button>
        <button className="px-3 py-1 border rounded" onClick={() => init(10)}>Donate $10</button>
        <button className="px-3 py-1 border rounded" onClick={() => init(25)}>Donate $25</button>
      </div>
      {clientSecret && stripePromise && (
        <Elements options={{ clientSecret }} stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      )}
    </div>
  );
}
