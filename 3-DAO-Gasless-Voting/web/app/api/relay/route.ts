import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { FORWARDER_ABI } from "@/lib/forwarder.abi";

// Server-only config (never exposed to the browser).
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "";
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS || "";

interface ForwardRequestBody {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  data: string;
}

function isValidRequest(r: unknown): r is ForwardRequestBody {
  if (typeof r !== "object" || r === null) return false;
  const o = r as Record<string, unknown>;
  return (
    ethers.isAddress(o.from as string) &&
    ethers.isAddress(o.to as string) &&
    typeof o.value === "string" &&
    typeof o.gas === "string" &&
    typeof o.nonce === "string" &&
    typeof o.data === "string" &&
    (o.data as string).startsWith("0x")
  );
}

/**
 * POST /api/relay
 * Body: { request: ForwardRequest, signature: string }
 * Verifies the signed meta-transaction and submits it via the MinimalForwarder,
 * paying gas from the relayer account. Returns the transaction hash.
 */
export async function POST(req: NextRequest) {
  try {
    if (!RELAYER_PRIVATE_KEY || !FORWARDER_ADDRESS) {
      return NextResponse.json(
        { error: "Relayer no configurado (RELAYER_PRIVATE_KEY / FORWARDER_ADDRESS)" },
        { status: 500 }
      );
    }

    const { request, signature } = await req.json();

    if (!isValidRequest(request)) {
      return NextResponse.json({ error: "ForwardRequest inválido" }, { status: 400 });
    }
    if (typeof signature !== "string" || !signature.startsWith("0x")) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const forwarder = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, relayer);

    // Reject early if the signature/nonce don't check out — avoids wasting gas.
    const ok: boolean = await forwarder.verify(request, signature);
    if (!ok) {
      return NextResponse.json({ error: "La firma no coincide con la solicitud" }, { status: 400 });
    }

    const gasLimit = BigInt(request.gas) + 100_000n; // inner gas + forwarder overhead
    const tx = await forwarder.execute(request, signature, {
      value: BigInt(request.value),
      gasLimit,
    });
    const receipt = await tx.wait();

    console.log(
      `[relay] ${request.from} → ${request.to} | tx ${receipt?.hash} | block ${receipt?.blockNumber}`
    );

    return NextResponse.json({ txHash: receipt?.hash ?? tx.hash });
  } catch (e) {
    console.error("[relay] error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
