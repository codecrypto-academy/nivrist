import { NextResponse } from "next/server";
import { getDb, type InvestorProfile } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isWallet = (s: string) => /^0x[a-f0-9]{40}$/.test(s);

/** GET /api/investors?wallet=0x… — off-chain KYC profile for a wallet. */
export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase() ?? "";
  if (!isWallet(wallet)) {
    return NextResponse.json({ ok: false, error: "wallet required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const doc = await db.collection<InvestorProfile>("investors").findOne({ wallet });
    return NextResponse.json({ ok: true, data: doc ?? null });
  } catch {
    return NextResponse.json({ ok: false, data: null, degraded: true });
  }
}

/** POST /api/investors — upsert an off-chain KYC profile. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InvestorProfile;
    const wallet = String(body.wallet ?? "").toLowerCase();
    if (!isWallet(wallet)) {
      return NextResponse.json({ ok: false, error: "bad wallet" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const db = await getDb();
    await db.collection("investors").updateOne(
      { wallet },
      {
        $set: {
          name: body.name ?? "",
          email: body.email ?? "",
          country: body.country ?? "",
          kycRef: body.kycRef ?? "",
          updatedAt: now,
        },
        $setOnInsert: { wallet, createdAt: now },
      },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, degraded: true });
  }
}
