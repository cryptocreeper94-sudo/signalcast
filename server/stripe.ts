/**
 * SignalCast — Stripe Integration
 * 
 * Handles subscription checkout, webhooks, customer portal, and status checks.
 * Pricing tiers: Starter ($29), Pro ($59), Pro+TrustGen ($89), Ultimate ($99)
 */

import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { autopilotSubscriptions } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[SignalCast] STRIPE_SECRET_KEY not set — Stripe routes disabled');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const APP_URL = process.env.APP_URL || 'https://signalcast.tlid.io';

// ─── Pricing Tiers ──────────────────────────────────────────
export const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 2900, // cents
    priceDisplay: '$29',
    interval: 'month' as const,
    lookupKey: 'signalcast_starter',
    features: [
      '3 social platforms',
      'Basic scheduler (2x daily)',
      '50 posts/month',
      'Deploy history',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 5900,
    priceDisplay: '$59',
    interval: 'month' as const,
    lookupKey: 'signalcast_pro',
    features: [
      'All 9 platforms',
      'Full scheduler (hourly 6am–10pm)',
      'Unlimited posts',
      'Analytics dashboard',
      'Multi-tenant support',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'pro_trustgen',
    name: 'Pro + TrustGen',
    price: 8900,
    priceDisplay: '$89',
    interval: 'month' as const,
    lookupKey: 'signalcast_pro_trustgen',
    features: [
      'Everything in Pro',
      'TrustGen AI asset generation',
      'Auto-generated social images',
      'Brand kit integration',
      'A/B image testing',
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 9900,
    priceDisplay: '$99',
    interval: 'month' as const,
    lookupKey: 'signalcast_ultimate',
    features: [
      'Everything in Pro + TrustGen',
      'TrustVault credential security',
      'Encrypted API key storage',
      'Audit trail & compliance',
      'White-glove onboarding',
      'Dedicated account manager',
    ],
  },
];

// ─── Router ─────────────────────────────────────────────────
export const stripeRouter = Router();

// Get pricing tiers (public)
stripeRouter.get('/pricing', (_req: Request, res: Response) => {
  res.json({ tiers: PRICING_TIERS });
});

// Create Checkout Session
stripeRouter.post('/create-checkout', async (req: Request, res: Response) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const { tierId, tenantId, email, businessName } = req.body;
  const tier = PRICING_TIERS.find(t => t.id === tierId);
  if (!tier) return res.status(400).json({ error: 'Invalid tier' });

  try {
    // Find or create Stripe price by lookup key
    let price: Stripe.Price | undefined;
    const existingPrices = await stripe.prices.list({
      lookup_keys: [tier.lookupKey],
      active: true,
      limit: 1,
    });

    if (existingPrices.data.length > 0) {
      price = existingPrices.data[0];
    } else {
      // Create product and price if they don't exist
      const product = await stripe.products.create({
        name: `SignalCast ${tier.name}`,
        description: `SignalCast ${tier.name} — AI-Powered Social Media Automation`,
        metadata: { tier: tier.id, ecosystem: 'trust-layer' },
      });

      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: 'usd',
        recurring: { interval: tier.interval },
        lookup_key: tier.lookupKey,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${APP_URL}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}?checkout=cancelled`,
      customer_email: email || undefined,
      metadata: {
        tierId: tier.id,
        tenantId: tenantId || 'direct',
        businessName: businessName || '',
      },
      subscription_data: {
        metadata: {
          tierId: tier.id,
          tenantId: tenantId || 'direct',
          businessName: businessName || '',
        },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('[Stripe] Checkout error:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Subscription Status
stripeRouter.get('/subscription/:tenantId', async (req: Request, res: Response) => {
  try {
    const [sub] = await db.select().from(autopilotSubscriptions)
      .where(eq(autopilotSubscriptions.tenantId, req.params.tenantId));

    if (!sub) return res.json({ active: false, tier: null });

    res.json({
      active: sub.status === 'active',
      tier: sub.postingSchedule, // stores tier id
      status: sub.status,
      businessName: sub.businessName,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      activatedAt: sub.activatedAt,
    });
  } catch (error: any) {
    console.error('[Stripe] Subscription status error:', error.message);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Customer Portal (manage subscription)
stripeRouter.post('/create-portal', async (req: Request, res: Response) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const { tenantId } = req.body;
  try {
    const [sub] = await db.select().from(autopilotSubscriptions)
      .where(eq(autopilotSubscriptions.tenantId, tenantId));

    if (!sub?.stripeCustomerId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${APP_URL}`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Portal error:', error.message);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ─── Webhook Handler ────────────────────────────────────────
export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Stripe] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`[Stripe] Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { tierId, tenantId, businessName } = session.metadata || {};
        const tier = PRICING_TIERS.find(t => t.id === tierId);

        if (tenantId) {
          // Check if subscription already exists
          const existing = await db.select().from(autopilotSubscriptions)
            .where(eq(autopilotSubscriptions.tenantId, tenantId));

          if (existing.length > 0) {
            await db.update(autopilotSubscriptions)
              .set({
                status: 'active',
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                postingSchedule: tierId || 'pro',
                monthlyPrice: tier ? (tier.price / 100).toFixed(2) : '59.00',
                activatedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(autopilotSubscriptions.tenantId, tenantId));
          } else {
            await db.insert(autopilotSubscriptions).values({
              tenantId,
              businessName: businessName || session.customer_details?.name || 'Unknown',
              ownerName: session.customer_details?.name || 'Unknown',
              email: session.customer_details?.email || '',
              phone: session.customer_details?.phone || '',
              status: 'active',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              postingSchedule: tierId || 'pro',
              monthlyPrice: tier ? (tier.price / 100).toFixed(2) : '59.00',
              activatedAt: new Date(),
            });
          }
          console.log(`[Stripe] Subscription activated for tenant: ${tenantId} (${tierId})`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;
        await db.update(autopilotSubscriptions)
          .set({
            status: subscription.status === 'active' ? 'active' : 'paused',
            updatedAt: new Date(),
          })
          .where(eq(autopilotSubscriptions.stripeSubscriptionId, subId));
        console.log(`[Stripe] Subscription updated: ${subId} → ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await db.update(autopilotSubscriptions)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(autopilotSubscriptions.stripeSubscriptionId, subscription.id));
        console.log(`[Stripe] Subscription cancelled: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await db.update(autopilotSubscriptions)
            .set({ status: 'active', updatedAt: new Date() })
            .where(eq(autopilotSubscriptions.stripeSubscriptionId, invoice.subscription as string));
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await db.update(autopilotSubscriptions)
            .set({ status: 'past_due', updatedAt: new Date() })
            .where(eq(autopilotSubscriptions.stripeSubscriptionId, invoice.subscription as string));
          console.log(`[Stripe] Payment failed for subscription: ${invoice.subscription}`);
        }
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error(`[Stripe] Webhook handler error for ${event.type}:`, error.message);
  }

  res.json({ received: true });
}
