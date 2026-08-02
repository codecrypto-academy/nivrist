import { NextRequest, NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { mintTokens } from "@/lib/minter";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhook — Stripe webhook (checkout.session.completed → mint EURT).
 * Uses the raw body for signature verification (protocolo-saas pattern). For local dev,
 * forward events with: `stripe listen --forward-to localhost:6001/api/stripe/webhook`.
 */
export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    event = getStripe().webhooks.constructEvent(body, sig, getStripeWebhookSecret());
  } catch (err) {
    console.error("[webhook] signature verification failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        const wallet = session.metadata?.wallet;
        const eurAmount = Number(session.metadata?.eurAmount ?? 0);
        if (wallet && eurAmount) {
          await mintTokens(session.id, wallet, eurAmount);
        }
      }
    }
  } catch (err) {
    console.error("[webhook] processing error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
