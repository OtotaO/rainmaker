/**
 * Stripe Payment Pattern
 * Complete checkout, subscription, and webhook handling
 */

export const pattern = {
  id: 'payment-stripe',
  name: 'Stripe Payment Integration',
  category: 'payments',
  description: 'Production-ready Stripe integration with checkout, subscriptions, and webhooks',
  tags: ['payments', 'stripe', 'subscriptions', 'webhooks'],
  
  code: `
import Stripe from 'stripe';
import { Request, Response } from 'express';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Configuration
const config = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel',
  currency: 'usd',
};

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
}

interface Customer {
  id: string;
  email: string;
  stripeCustomerId?: string;
}

interface CheckoutSession {
  sessionId: string;
  url: string;
}

// Create or retrieve Stripe customer
export const getOrCreateStripeCustomer = async (customer: Customer): Promise<string> => {
  if (customer.stripeCustomerId) {
    return customer.stripeCustomerId;
  }

  const stripeCustomer = await stripe.customers.create({
    email: customer.email,
    metadata: {
      userId: customer.id,
    },
  });

  // Save stripeCustomer.id to your database
  await updateCustomerStripeId(customer.id, stripeCustomer.id);

  return stripeCustomer.id;
};

// Create checkout session for one-time payment
export const createCheckoutSession = async (
  customer: Customer,
  items: Array<{ product: Product; quantity: number }>
): Promise<CheckoutSession> => {
  const stripeCustomerId = await getOrCreateStripeCustomer(customer);

  const lineItems = items.map(item => ({
    price_data: {
      currency: item.product.currency || config.currency,
      product_data: {
        name: item.product.name,
        description: item.product.description,
      },
      unit_amount: Math.round(item.product.price * 100), // Convert to cents
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: config.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: config.cancelUrl,
    metadata: {
      userId: customer.id,
    },
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
};

// Create subscription checkout session
export const createSubscriptionSession = async (
  customer: Customer,
  priceId: string
): Promise<CheckoutSession> => {
  const stripeCustomerId = await getOrCreateStripeCustomer(customer);

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: config.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: config.cancelUrl,
    metadata: {
      userId: customer.id,
    },
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};

// Get customer's subscriptions
export const getCustomerSubscriptions = async (stripeCustomerId: string) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
  });

  return subscriptions.data;
};

// Webhook handler
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body required
      sig,
      config.webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(deletedSubscription);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(failedInvoice);
      break;

    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }

  res.json({ received: true });
};

// Event handlers
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  
  if (session.mode === 'payment') {
    // Handle one-time payment
    await recordPayment({
      userId,
      amount: session.amount_total! / 100,
      currency: session.currency!,
      sessionId: session.id,
    });
  } else if (session.mode === 'subscription') {
    // Handle subscription creation
    const subscriptionId = session.subscription as string;
    await updateUserSubscription(userId!, subscriptionId);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  await updateUserSubscriptionStatus(userId!, subscription.id, subscription.status);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  await removeUserSubscription(userId!, subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Record successful payment
  console.log('Invoice payment succeeded:', invoice.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment (send email, retry, etc.)
  console.log('Invoice payment failed:', invoice.id);
}

// Express route handlers
export const checkoutHandler = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const customer = req.user as Customer; // Assumes authenticated

    const session = await createCheckoutSession(customer, items);
    res.json(session);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const subscribeHandler = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.body;
    const customer = req.user as Customer; // Assumes authenticated

    const session = await createSubscriptionSession(customer, priceId);
    res.json(session);
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

export const cancelSubscriptionHandler = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    await cancelSubscription(subscriptionId);
    res.json({ message: 'Subscription canceled' });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// Placeholder database functions - replace with your ORM
async function updateCustomerStripeId(userId: string, stripeCustomerId: string): Promise<void> {
  // Implement with your database
}

async function recordPayment(payment: any): Promise<void> {
  // Implement with your database
}

async function updateUserSubscription(userId: string, subscriptionId: string): Promise<void> {
  // Implement with your database
}

async function updateUserSubscriptionStatus(userId: string, subscriptionId: string, status: string): Promise<void> {
  // Implement with your database
}

async function removeUserSubscription(userId: string, subscriptionId: string): Promise<void> {
  // Implement with your database
}

// Express route setup
export function setupPaymentRoutes(app: any) {
  // Webhook route (raw body required)
  app.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook);
  
  // Checkout routes
  app.post('/payments/checkout', authenticate, checkoutHandler);
  app.post('/payments/subscribe', authenticate, subscribeHandler);
  app.post('/payments/cancel/:subscriptionId', authenticate, cancelSubscriptionHandler);
  
  // Get subscription status
  app.get('/payments/subscription', authenticate, async (req: Request, res: Response) => {
    try {
      const customer = req.user as Customer;
      if (!customer.stripeCustomerId) {
        return res.json({ subscriptions: [] });
      }
      
      const subscriptions = await getCustomerSubscriptions(customer.stripeCustomerId);
      res.json({ subscriptions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  });
}
`,

  dependencies: {
    'stripe': '^14.0.0',
    '@types/stripe': '^8.0.0'
  },

  customization: {
    variables: [
      {
        name: 'currency',
        type: 'string',
        description: 'Default currency for payments',
        defaultValue: 'usd'
      },
      {
        name: 'successUrl',
        type: 'string',
        description: 'URL to redirect after successful payment',
        defaultValue: '/success'
      },
      {
        name: 'cancelUrl',
        type: 'string',
        description: 'URL to redirect after canceled payment',
        defaultValue: '/cancel'
      }
    ],
    
    injectionPoints: [
      {
        id: 'after-payment-success',
        description: 'Add custom logic after successful payment',
        type: 'after' as const,
        location: 'function:handleCheckoutComplete'
      },
      {
        id: 'before-checkout-create',
        description: 'Add custom validation before creating checkout',
        type: 'before' as const,
        location: 'function:createCheckoutSession'
      }
    ],
    
    patterns: [
      {
        type: 'error-handling',
        current: 'try-catch',
        description: 'Error handling approach'
      },
      {
        type: 'async-pattern',
        current: 'async-await',
        description: 'Asynchronous code pattern'
      }
    ]
  }
};
