import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/create-checkout-session
 * Body: { wallet: string, eurAmount: number }
 * Creates a one-time Stripe Checkout Session to buy EURT. The buyer's wallet and the token
 * amount travel in the session metadata so we can mint after payment.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe no está configurado" }, { status: 500 });
  }
  try {
    const { wallet, eurAmount } = await req.json();

    if (!ethers.isAddress(wallet)) {
      return NextResponse.json({ error: "Dirección de wallet inválida" }, { status: 400 });
    }
    const amount = Number(eurAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
      return NextResponse.json({ error: "Cantidad inválida (1–100000 €)" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:6001";
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(amount * 100), // cents
            product_data: {
              name: `${amount} EURT`,
              description: "EuroToken (stablecoin 1 EURT = 1 EUR)",
            },
          },
          quantity: 1,
        },
      ],
      metadata: { wallet, eurAmount: String(amount) },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo crear la sesión de pago" }, { status: 500 });
  }
}
