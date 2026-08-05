import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether the off-chain MongoDB layer is reachable. */
export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true, mongo: true });
  } catch {
    return NextResponse.json({ ok: true, mongo: false });
  }
}
