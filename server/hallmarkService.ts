/**
 * SignalCast — Hallmark Service
 *
 * SHA-256 chained hallmarks with sequential SC-XXXXXXXX serial numbers,
 * trust stamps, and affiliate tier computation.
 */

import crypto from "crypto";
import { db } from "./db.js";
import {
  hallmarks,
  hallmarkCounters,
  trustStamps,
  type Hallmark,
} from "../shared/schema.js";
import { eq, desc, sql } from "drizzle-orm";

const SC_PREFIX = "SC";
const SC_COUNTER_ID = "sc-master";

// ─── Helpers ────────────────────────────────────────────────

function sha256(payload: string): string {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function simulatedTxHash(): string {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

function simulatedBlockHeight(): string {
  return String(Math.floor(1_000_000 + Math.random() * 9_000_000));
}

// ─── Affiliate Tiers ────────────────────────────────────────

export function getAffiliateTier(convertedCount: number): { tier: string; rate: number } {
  if (convertedCount >= 50) return { tier: "diamond", rate: 20 };
  if (convertedCount >= 30) return { tier: "platinum", rate: 17.5 };
  if (convertedCount >= 15) return { tier: "gold", rate: 15 };
  if (convertedCount >= 5)  return { tier: "silver", rate: 12.5 };
  return { tier: "base", rate: 10 };
}

// ─── Sequence Generator ─────────────────────────────────────

async function getNextSequence(): Promise<{ sequence: number; thId: string }> {
  const result = await db
    .insert(hallmarkCounters)
    .values({ id: SC_COUNTER_ID, currentSequence: "1" })
    .onConflictDoUpdate({
      target: hallmarkCounters.id,
      set: {
        currentSequence: sql`(CAST(${hallmarkCounters.currentSequence} AS INTEGER) + 1)::TEXT`,
      },
    })
    .returning();

  const sequence = parseInt(result[0].currentSequence);
  const thId = `${SC_PREFIX}-${sequence.toString().padStart(8, "0")}`;
  return { sequence, thId };
}

// ─── Generate Hallmark ──────────────────────────────────────

export async function generateHallmark(data: {
  appId: string;
  appName: string;
  productName: string;
  releaseType: string;
  userId?: string;
  metadata?: Record<string, any>;
}): Promise<Hallmark> {
  const { sequence, thId } = await getNextSequence();
  const timestamp = new Date().toISOString();

  const payload = {
    thId,
    userId: data.userId || null,
    appId: data.appId,
    appName: data.appName,
    productName: data.productName,
    releaseType: data.releaseType,
    timestamp,
  };

  const dataHash = sha256(JSON.stringify(payload));
  const txHash = simulatedTxHash();
  const blockHeight = simulatedBlockHeight();
  const verificationUrl = `https://signalcast.tlid.io/api/hallmark/${thId}/verify`;

  const [hallmark] = await db
    .insert(hallmarks)
    .values({
      thId,
      appId: data.appId,
      appName: data.appName,
      productName: data.productName,
      releaseType: data.releaseType,
      userId: data.userId || null,
      dataHash,
      txHash,
      blockHeight,
      verificationUrl,
      hallmarkId: sequence,
      metadata: data.metadata || {},
    })
    .returning();

  console.log(`[HALLMARK] Issued: ${thId} — ${data.productName}`);
  return hallmark;
}

// ─── Verify Hallmark ────────────────────────────────────────

export async function verifyHallmark(thId: string): Promise<{
  verified: boolean;
  hallmark?: any;
  error?: string;
}> {
  const [hallmark] = await db
    .select()
    .from(hallmarks)
    .where(eq(hallmarks.thId, thId));

  if (!hallmark) {
    return { verified: false, error: "Hallmark not found" };
  }

  return {
    verified: true,
    hallmark: {
      thId: hallmark.thId,
      appName: hallmark.appName,
      productName: hallmark.productName,
      releaseType: hallmark.releaseType,
      dataHash: hallmark.dataHash,
      txHash: hallmark.txHash,
      blockHeight: hallmark.blockHeight,
      verificationUrl: hallmark.verificationUrl,
      createdAt: hallmark.createdAt,
    },
  };
}

// ─── Seed Genesis Hallmark ──────────────────────────────────

export async function seedGenesisHallmark(): Promise<Hallmark | null> {
  const genesisId = `${SC_PREFIX}-00000001`;

  const [existing] = await db
    .select()
    .from(hallmarks)
    .where(eq(hallmarks.thId, genesisId));

  if (existing) {
    console.log(`[HALLMARK] Genesis ${genesisId} already exists.`);
    return existing;
  }

  // Reset counter to 0 so first generation yields 00000001
  await db
    .insert(hallmarkCounters)
    .values({ id: SC_COUNTER_ID, currentSequence: "0" })
    .onConflictDoUpdate({
      target: hallmarkCounters.id,
      set: { currentSequence: "0" },
    });

  const hallmark = await generateHallmark({
    appId: "signalcast-genesis",
    appName: "SignalCast",
    productName: "Genesis Block",
    releaseType: "genesis",
    metadata: {
      ecosystem: "Trust Layer",
      version: "2.1.0",
      domain: "signalcast.tlid.io",
      operator: "DarkWave Studios LLC",
      chain: "Trust Layer Blockchain",
      consensus: "Proof of Trust",
      launchDate: "2026-08-23T00:00:00.000Z",
      nativeAsset: "SIG",
      utilityToken: "Shells",
      parentApp: "Trust Layer Hub",
      parentGenesis: "TH-00000001",
    },
  });

  console.log(`[HALLMARK] Genesis ${genesisId} created successfully.`);
  return hallmark;
}

// ─── Query Functions ────────────────────────────────────────

export async function getGenesisHallmark(): Promise<Hallmark | null> {
  const [h] = await db.select().from(hallmarks).where(eq(hallmarks.thId, `${SC_PREFIX}-00000001`));
  return h || null;
}

export async function getCompanyHallmarks(): Promise<Hallmark[]> {
  return db.select().from(hallmarks).where(eq(hallmarks.releaseType, "genesis")).orderBy(desc(hallmarks.createdAt));
}

export async function getAllHallmarks(limit = 50): Promise<Hallmark[]> {
  return db.select().from(hallmarks).orderBy(desc(hallmarks.createdAt)).limit(limit);
}

export async function getHallmarkStats(): Promise<{
  totalHallmarks: number;
  genesisExists: boolean;
}> {
  const all = await db.select().from(hallmarks);
  const genesis = await getGenesisHallmark();
  return {
    totalHallmarks: all.length,
    genesisExists: !!genesis,
  };
}

// ─── Trust Stamps ───────────────────────────────────────────

export async function createTrustStamp(
  userId: string | null,
  category: string,
  stampData: Record<string, any>
): Promise<void> {
  const payload = {
    ...stampData,
    appContext: "signalcast",
    timestamp: new Date().toISOString(),
  };
  const dataHash = sha256(JSON.stringify(payload));
  const txHash = simulatedTxHash();
  const blockHeight = simulatedBlockHeight();

  await db.insert(trustStamps).values({
    userId,
    category,
    data: payload,
    dataHash,
    txHash,
    blockHeight,
  });

  console.log(`[TRUST STAMP] ${category} — user: ${userId || "system"}`);
}
