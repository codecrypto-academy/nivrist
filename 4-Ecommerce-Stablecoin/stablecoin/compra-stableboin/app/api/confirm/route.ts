import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { mintTokens, alreadyMinted } from "@/lib/minter";

/**
 * POST /api/confirm  Body: { sessionId }
 * Called by the success page. Retrieves the Checkout Session, verifies it was actually paid,
 * then mints EURT to the buyer's wallet (idempotent per session). This is the reliable path
 * for local dev where the webhook may not be forwarded.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe no está configurado" }, { status: 500 });
  }
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "El pago no está completado", paid: false }, { status: 402 });
    }

    const wallet = session.metadata?.wallet;
    const eurAmount = Number(session.metadata?.eurAmount ?? 0);
    if (!wallet || !eurAmount) {
      return NextResponse.json({ error: "Metadatos de sesión incompletos" }, { status: 400 });
    }

    if (alreadyMinted(sessionId)) {
      return NextResponse.json({ paid: true, minted: false, wallet, amount: eurAmount, note: "ya acreditado" });
    }

    const result = await mintTokens(sessionId, wallet, eurAmount);
    return NextResponse.json({
      paid: true,
      minted: result !== null,
      wallet,
      amount: eurAmount,
      txHash: result?.txHash ?? null,
    });
  } catch (e) {
    console.error("[confirm] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo confirmar el pago" }, { status: 500 });
  }
}
