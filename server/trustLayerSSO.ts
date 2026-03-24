import type { Express, Request, Response } from 'express';
import crypto from 'crypto';

const DWTL_BASE = process.env.TRUST_LAYER_URL || 'https://dwtl.io';
const APP_SLUG = 'signalcast';

export function registerTrustLayerSSO(app: Express) {

  app.post("/api/auth/trust-layer/login", async (req: Request, res: Response) => {
    try {
      const { sso_token, auth_token } = req.body;
      const token = sso_token || auth_token;
      if (!token) {
        return res.status(400).json({ success: false, error: "SSO token is required" });
      }

      let ecosystemUser: any = null;

      try {
        const exchangeRes = await fetch(`${DWTL_BASE}/api/auth/exchange-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hubSessionToken: token }),
        });
        if (exchangeRes.ok) ecosystemUser = await exchangeRes.json();
      } catch {}

      if (!ecosystemUser && token.length >= 48) {
        try {
          const meRes = await fetch(`${DWTL_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            ecosystemUser = meData.user || meData;
          }
        } catch {}
      }

      if (!ecosystemUser || !ecosystemUser.email) {
        return res.status(401).json({ success: false, error: "Invalid or expired SSO token" });
      }

      const sessionToken = crypto.randomBytes(48).toString("hex");

      res.json({
        success: true,
        user: {
          email: ecosystemUser.email,
          username: ecosystemUser.username || ecosystemUser.email.split("@")[0],
          displayName: ecosystemUser.displayName || ecosystemUser.firstName || ecosystemUser.username,
          uniqueHash: ecosystemUser.uniqueHash || null,
        },
        sessionToken,
        trustLayerId: ecosystemUser.uniqueHash || ecosystemUser.userId || null,
        ssoLinked: true,
      });
      console.log(`[TL SSO] ${APP_SLUG}: Verified user ${ecosystemUser.email}`);
    } catch (error: any) {
      console.error(`[TL SSO] ${APP_SLUG}: Login error:`, error?.message);
      res.status(500).json({ success: false, error: "SSO login failed" });
    }
  });

  app.get("/api/auth/trust-layer/login-url", (_req: Request, res: Response) => {
    const callbackUrl = (_req.query.callback as string) || "/";
    res.json({
      url: `${DWTL_BASE}/login?app=${APP_SLUG}&redirect=${encodeURIComponent(callbackUrl)}`,
      provider: "Trust Layer",
      baseUrl: DWTL_BASE,
    });
  });

  app.get("/api/auth/trust-layer/status", (_req: Request, res: Response) => {
    res.json({ sso: true, provider: "Trust Layer", app: APP_SLUG, dwtlBase: DWTL_BASE });
  });

  console.log(`[TL SSO] ${APP_SLUG}: Trust Layer SSO consumer endpoints registered`);
}
