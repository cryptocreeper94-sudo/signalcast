/**
 * SignalCast — Hallmark Routes
 *
 * REST API for hallmark issuance, verification, and stats.
 */

import type { Express, Request, Response } from "express";
import * as hallmarkService from "./hallmarkService.js";

export function registerHallmarkRoutes(app: Express) {

  // ─── Genesis / App Hallmark ─────────────────────────────────
  app.get("/api/hallmark/genesis", async (_req: Request, res: Response) => {
    try {
      let hallmark = await hallmarkService.getGenesisHallmark();
      if (!hallmark) {
        hallmark = await hallmarkService.seedGenesisHallmark();
      }
      res.json(hallmark);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/hallmark/app", async (_req: Request, res: Response) => {
    try {
      const hallmark = await hallmarkService.getGenesisHallmark();
      if (!hallmark) return res.status(404).json({ error: "App hallmark not found. Hit /api/hallmark/genesis first." });
      res.json(hallmark);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Company Hallmarks ──────────────────────────────────────
  app.get("/api/hallmark/company", async (_req: Request, res: Response) => {
    try {
      const list = await hallmarkService.getCompanyHallmarks();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/hallmark/company/issue", async (req: Request, res: Response) => {
    try {
      const { assetType, assetName, productName, releaseType, metadata } = req.body;
      if (!productName) return res.status(400).json({ error: "productName is required" });

      const hallmark = await hallmarkService.generateHallmark({
        appId: "signalcast",
        appName: "SignalCast",
        productName,
        releaseType: releaseType || assetType || "release",
        metadata,
      });

      res.json({ success: true, hallmark });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ─── All Hallmarks ──────────────────────────────────────────
  app.get("/api/hallmark/all", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const list = await hallmarkService.getAllHallmarks(limit);
      res.json({ hallmarks: list, count: list.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Verification (Public) ────────────────────────────────
  app.get("/api/hallmark/:id/verify", async (req: Request, res: Response) => {
    try {
      const result = await hallmarkService.verifyHallmark(req.params.id);
      if (!result.verified) return res.status(404).json(result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/hallmark/verify/:code", async (req: Request, res: Response) => {
    try {
      const result = await hallmarkService.verifyHallmark(req.params.code);
      if (!result.verified) return res.status(404).json(result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Stats ────────────────────────────────────────────────
  app.get("/api/hallmark/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await hallmarkService.getHallmarkStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Seed (Admin) ─────────────────────────────────────────
  app.post("/api/hallmark/seed", async (_req: Request, res: Response) => {
    try {
      const genesis = await hallmarkService.seedGenesisHallmark();
      res.json({ success: true, genesis });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log("[HALLMARK] Hallmark routes registered");
}
