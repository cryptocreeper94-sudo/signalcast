import type { Express, Request, Response } from 'express';
import crypto from 'crypto';

const DWTL_BASE = process.env.TRUST_LAYER_URL || 'https://dwtl.io';
const APP_SLUG = 'signalcast';
const REQUEST_TIMEOUT_MS = 5000;

const CIRCUIT_BREAKER = {
  failures: 0, threshold: 3, cooldownMs: 60_000, lastFailureAt: 0,
  get isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - this.lastFailureAt > this.cooldownMs) { this.failures = 0; return false; }
    return true;
  },
  recordFailure(): void { this.failures++; this.lastFailureAt = Date.now(); console.warn(`[TL SSO] ${APP_SLUG}: circuit breaker #${this.failures}/${this.threshold}`); },
  recordSuccess(): void { this.failures = 0; }
};

export function registerTrustLayerSSO(app: Express) {
  app.post("/api/auth/trust-layer/login", async (req: Request, res: Response) => {
    try {
      const { sso_token, auth_token } = req.body;
      const token = sso_token || auth_token;
      if (!token) return res.status(400).json({ success: false, error: "SSO token is required" });
      if (CIRCUIT_BREAKER.isOpen) return res.status(503).json({ success: false, error: "Trust Layer temporarily unavailable", degraded: true });

      let ecosystemUser: any = null;
      let isTimeout = false;

      try {
        const r = await fetch(DWTL_BASE + "/api/auth/exchange-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hubSessionToken: token }), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (r.ok) { ecosystemUser = await r.json(); CIRCUIT_BREAKER.recordSuccess(); }
      } catch (err: any) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') isTimeout = true;
        CIRCUIT_BREAKER.recordFailure();
      }

      if (!ecosystemUser && token.length >= 48) {
        try {
          const r = await fetch(DWTL_BASE + "/api/auth/me", { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
          if (r.ok) { const d = await r.json(); ecosystemUser = d.user || d; CIRCUIT_BREAKER.recordSuccess(); }
        } catch (err: any) {
          if (err.name === 'TimeoutError' || err.name === 'AbortError') isTimeout = true;
          CIRCUIT_BREAKER.recordFailure();
        }
      }

      if (!ecosystemUser?.email) {
        if (isTimeout) return res.status(503).json({ success: false, error: "Trust Layer timed out", degraded: true });
        return res.status(401).json({ success: false, error: "Invalid or expired SSO token" });
      }

      res.json({ success: true, user: { email: ecosystemUser.email, username: ecosystemUser.username || ecosystemUser.email.split("@")[0], displayName: ecosystemUser.displayName || ecosystemUser.firstName || ecosystemUser.username, uniqueHash: ecosystemUser.uniqueHash || null }, sessionToken: crypto.randomBytes(48).toString("hex"), trustLayerId: ecosystemUser.uniqueHash || ecosystemUser.userId || null, ssoLinked: true });
      console.log(`[TL SSO] ${APP_SLUG}: Verified user ${ecosystemUser.email}`);
    } catch (error: any) { console.error(`[TL SSO] ${APP_SLUG}: Login error:`, error?.message); res.status(500).json({ success: false, error: "SSO login failed" }); }
  });

  app.get("/api/auth/trust-layer/login-url", (_req: Request, res: Response) => {
    const callbackUrl = (_req.query.callback as string) || "/";
    res.json({ url: `${DWTL_BASE}/login?app=${APP_SLUG}&redirect=${encodeURIComponent(callbackUrl)}`, provider: "Trust Layer", baseUrl: DWTL_BASE });
  });

  app.get("/api/auth/trust-layer/status", (_req: Request, res: Response) => {
    res.json({ sso: true, provider: "Trust Layer", app: APP_SLUG, dwtlBase: DWTL_BASE, circuitBreakerOpen: CIRCUIT_BREAKER.isOpen });
  });

  app.get("/api/auth/trust-layer/health", async (_: Request, res: Response) => {
    if (CIRCUIT_BREAKER.isOpen) return res.status(503).json({ healthy: false, reason: "Circuit breaker open" });
    try {
      const r = await fetch(DWTL_BASE + "/api/health", { signal: AbortSignal.timeout(3000) });
      if (r.ok) { CIRCUIT_BREAKER.recordSuccess(); return res.json({ healthy: true }); }
      CIRCUIT_BREAKER.recordFailure(); res.status(503).json({ healthy: false, reason: "Status " + r.status });
    } catch (err: any) { CIRCUIT_BREAKER.recordFailure(); res.status(503).json({ healthy: false, reason: err?.message }); }
  });

  console.log(`[TL SSO] ${APP_SLUG}: Trust Layer SSO consumer endpoints registered (circuit breaker enabled)`);
}
