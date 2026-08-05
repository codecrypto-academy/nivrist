import { NextResponse } from "next/server";
import { getDb, type TokenMeta } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isAddr = (s: string) => /^0x[a-f0-9]{40}$/.test(s);

/**
 * GET /api/tokens?address=0x… — off-chain metadata for one token.
 * GET /api/tokens — all token metadata (for enriching marketplace listings).
 */
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.toLowerCase();
  try {
    const db = await getDb();
    const col = db.collection<TokenMeta>("tokenMeta");
    if (address) {
      if (!isAddr(address)) {
        return NextResponse.json({ ok: false, error: "bad address" }, { status: 400 });
      }
      const doc = await col.findOne({ address });
      return NextResponse.json({ ok: true, data: doc ?? null });
    }
    const all = await col.find({}).toArray();
    return NextResponse.json({ ok: true, data: all });
  } catch {
    return NextResponse.json({ ok: false, data: address ? null : [], degraded: true });
  }
}

/** POST /api/tokens — upsert off-chain token metadata. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TokenMeta;
    const address = String(body.address ?? "").toLowerCase();
    if (!isAddr(address)) {
      return NextResponse.json({ ok: false, error: "bad address" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const db = await getDb();
    await db.collection("tokenMeta").updateOne(
      { address },
      {
        $set: {
          description: body.description ?? "",
          assetType: body.assetType ?? "",
          imageUrl: body.imageUrl ?? "",
          updatedAt: now,
        },
        $setOnInsert: { address, createdAt: now },
      },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, degraded: true });
  }
}
