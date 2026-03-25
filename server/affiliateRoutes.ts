/**
 * SignalCast — Affiliate Routes
 *
 * Full referral/affiliate system with unique hash links, 5-tier commissions,
 * payout requests, and trust stamp logging.
 */

import type { Express, Request, Response } from "express";
import { db } from "./db.js";
import {
  autopilotSubscriptions,
  affiliateReferrals,
  affiliateCommissions,
  AFFILIATE_TIERS,
  AFFILIATE_MIN_PAYOUT,
} from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { createTrustStamp } from "./hallmarkService.js";
import crypto from "crypto";

function generateUniqueHash(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Rate limiter for track endpoint
const trackLimiter = new Map<string, number>();
function isTrackRateLimited(ip: string): boolean {
  const now = Date.now();
  const last = trackLimiter.get(ip);
  if (last && now - last < 5000) return true;
  trackLimiter.set(ip, now);
  if (trackLimiter.size > 10000) {
    const keys = Array.from(trackLimiter.keys()).slice(0, 5000);
    keys.forEach((k) => trackLimiter.delete(k));
  }
  return false;
}

function computeTier(convertedCount: number): { tier: string; rate: number; label: string } {
  if (convertedCount >= AFFILIATE_TIERS.diamond.minReferrals)
    return { tier: "diamond", ...AFFILIATE_TIERS.diamond };
  if (convertedCount >= AFFILIATE_TIERS.platinum.minReferrals)
    return { tier: "platinum", ...AFFILIATE_TIERS.platinum };
  if (convertedCount >= AFFILIATE_TIERS.gold.minReferrals)
    return { tier: "gold", ...AFFILIATE_TIERS.gold };
  if (convertedCount >= AFFILIATE_TIERS.silver.minReferrals)
    return { tier: "silver", ...AFFILIATE_TIERS.silver };
  return { tier: "base", ...AFFILIATE_TIERS.base };
}

export function registerAffiliateRoutes(app: Express) {

  // ─── Dashboard ────────────────────────────────────────────
  app.get("/api/affiliate/dashboard", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.headers["x-tenant-id"] as string) || (req.headers["x-user-id"] as string);
      if (!tenantId) return res.status(401).json({ error: "Not authenticated" });

      // Get or create uniqueHash for the tenant
      const [sub] = await db
        .select()
        .from(autopilotSubscriptions)
        .where(eq(autopilotSubscriptions.tenantId, tenantId))
        .limit(1);

      let uniqueHash: string;
      if (sub) {
        // @ts-ignore - uniqueHash may not exist yet in older records
        uniqueHash = (sub as any).uniqueHash || generateUniqueHash();
      } else {
        uniqueHash = generateUniqueHash();
      }

      // Get referrals
      const referrals = await db
        .select()
        .from(affiliateReferrals)
        .where(eq(affiliateReferrals.referrerId, tenantId))
        .orderBy(desc(affiliateReferrals.createdAt));

      // Get commissions
      const commissions = await db
        .select()
        .from(affiliateCommissions)
        .where(eq(affiliateCommissions.referrerId, tenantId))
        .orderBy(desc(affiliateCommissions.createdAt));

      const convertedCount = referrals.filter((r) => r.status === "converted").length;
      const tierInfo = computeTier(convertedCount);

      const pendingEarnings = commissions
        .filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);

      const paidEarnings = commissions
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);

      res.json({
        uniqueHash,
        referralLink: `https://signalcast.tlid.io/ref/${uniqueHash}`,
        tier: tierInfo,
        stats: {
          totalReferrals: referrals.length,
          convertedReferrals: convertedCount,
          pendingEarnings: pendingEarnings.toFixed(2),
          paidEarnings: paidEarnings.toFixed(2),
        },
        referrals: referrals.slice(0, 20),
        commissions: commissions.slice(0, 20),
        canRequestPayout: pendingEarnings >= AFFILIATE_MIN_PAYOUT,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Generate Referral Link ───────────────────────────────
  app.get("/api/affiliate/link", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.headers["x-tenant-id"] as string) || (req.headers["x-user-id"] as string);
      if (!tenantId) return res.status(401).json({ error: "Not authenticated" });

      const uniqueHash = generateUniqueHash();

      res.json({
        uniqueHash,
        links: {
          signalcast: `https://signalcast.tlid.io/ref/${uniqueHash}`,
          trusthub: `https://trusthub.tlid.io/ref/${uniqueHash}`,
          dwtl: `https://dwtl.io/ref/${uniqueHash}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Track Referral Click ─────────────────────────────────
  app.post("/api/affiliate/track", async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || "unknown";
      if (isTrackRateLimited(clientIp)) {
        return res.status(429).json({ error: "Too many requests" });
      }

      const { referralHash, platform } = req.body;
      if (!referralHash) return res.status(400).json({ error: "referralHash is required" });

      // Referrer is tracked by hash → find who owns it
      // For now, use the hash as the referrerId (will resolve to user later)
      await db.insert(affiliateReferrals).values({
        referrerId: referralHash, // Will be resolved on conversion
        referralHash,
        platform: platform || "signalcast",
        status: "pending",
      });

      res.json({ success: true, message: "Referral tracked" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Convert Referral ─────────────────────────────────────
  app.post("/api/affiliate/convert-referral", async (req: Request, res: Response) => {
    try {
      const { referralHash, referredUserId } = req.body;
      if (!referralHash || !referredUserId) {
        return res.status(400).json({ error: "referralHash and referredUserId required" });
      }

      const pendingReferrals = await db
        .select()
        .from(affiliateReferrals)
        .where(
          and(
            eq(affiliateReferrals.referralHash, referralHash),
            eq(affiliateReferrals.status, "pending")
          )
        )
        .orderBy(desc(affiliateReferrals.createdAt))
        .limit(1);

      if (pendingReferrals.length === 0) {
        return res.status(404).json({ error: "No pending referral found" });
      }

      const referral = pendingReferrals[0];

      await db
        .update(affiliateReferrals)
        .set({
          status: "converted",
          referredUserId,
          convertedAt: new Date(),
        })
        .where(eq(affiliateReferrals.id, referral.id));

      // Count all conversions for tier
      const allConverted = await db
        .select()
        .from(affiliateReferrals)
        .where(
          and(
            eq(affiliateReferrals.referrerId, referral.referrerId),
            eq(affiliateReferrals.status, "converted")
          )
        );

      const tierInfo = computeTier(allConverted.length);

      // Trust stamp the conversion
      await createTrustStamp(referral.referrerId, "affiliate-referral-converted", {
        referralId: referral.id,
        referredUserId,
        platform: referral.platform,
      });

      res.json({ success: true, tier: tierInfo, totalConverted: allConverted.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Request Payout ───────────────────────────────────────
  app.post("/api/affiliate/request-payout", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || (req.headers["x-tenant-id"] as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const pendingCommissions = await db
        .select()
        .from(affiliateCommissions)
        .where(
          and(
            eq(affiliateCommissions.referrerId, userId),
            eq(affiliateCommissions.status, "pending")
          )
        );

      const totalPending = pendingCommissions.reduce(
        (sum, c) => sum + parseFloat(c.amount), 0
      );

      if (totalPending < AFFILIATE_MIN_PAYOUT) {
        return res.status(400).json({
          error: `Minimum payout is ${AFFILIATE_MIN_PAYOUT} SIG. You have ${totalPending.toFixed(2)} SIG pending.`,
        });
      }

      for (const commission of pendingCommissions) {
        await db
          .update(affiliateCommissions)
          .set({ status: "processing" })
          .where(eq(affiliateCommissions.id, commission.id));
      }

      await createTrustStamp(userId, "affiliate-payout-request", {
        amount: totalPending.toFixed(2),
        currency: "SIG",
        commissionsCount: pendingCommissions.length,
      });

      res.json({
        success: true,
        amount: totalPending.toFixed(2),
        currency: "SIG",
        commissionsCount: pendingCommissions.length,
        message: "Payout request submitted. Processing within 48 hours.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log("[AFFILIATE] Affiliate routes registered");
}
