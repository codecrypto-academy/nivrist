import { MongoClient, type Db } from "mongodb";

/**
 * Off-chain store (MongoDB). Matches the reference architecture's Infrastructure layer
 * (MongoDB `rwa` on :27017) for data that doesn't belong on-chain: investor KYC profiles and
 * token metadata. Degrades gracefully — if Mongo is unreachable, callers get null/false and the
 * on-chain dApp keeps working.
 *
 * Almacén off-chain (MongoDB). Refleja la capa de infraestructura del diagrama de referencia
 * para datos que no van on-chain: perfiles KYC de inversores y metadata de tokens. Degrada con
 * gracia: si Mongo no responde, se devuelve null/false y el dApp on-chain sigue funcionando.
 */
const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB ?? "rwa";

let cached: Db | null = null;
let client: MongoClient | null = null;

export async function getDb(): Promise<Db> {
  if (cached) return cached;
  // short timeout so a missing Mongo fails fast instead of hanging the request
  client = new MongoClient(URI, { serverSelectionTimeoutMS: 1500, connectTimeoutMS: 1500 });
  await client.connect();
  cached = client.db(DB_NAME);
  return cached;
}

export interface InvestorProfile {
  wallet: string;
  name?: string;
  email?: string;
  country?: string;
  kycRef?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenMeta {
  address: string;
  description?: string;
  assetType?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
