import { db } from './db.js';
import { metaIntegrations } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import * as readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('════════════════════════════════════════════════');
  console.log(' TRUST LAYER — MASTER X/TWITTER CREDENTIAL LOADER');
  console.log('════════════════════════════════════════════════');
  console.log('Injecting credentials for the MASTER profile...');
  console.log('');

  const tenantId = 'master'; // Primary owner account

  const apiKey = await rl.question('Enter Twitter API Key: ');
  const apiSecret = await rl.question('Enter Twitter API Secret: ');
  const accessToken = await rl.question('Enter Twitter Access Token: ');
  const accessTokenSecret = await rl.question('Enter Twitter Access Token Secret: ');
  
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    console.error('All fields are required. Aborting.');
    process.exit(1);
  }

  const existing = await db.select().from(metaIntegrations).where(eq(metaIntegrations.tenantId, tenantId)).limit(1);

  if (existing.length > 0) {
    await db.update(metaIntegrations)
      .set({
        twitterApiKey: apiKey,
        twitterApiSecret: apiSecret,
        twitterAccessToken: accessToken,
        twitterAccessTokenSecret: accessTokenSecret,
        twitterConnected: true,
        updatedAt: new Date()
      })
      .where(eq(metaIntegrations.tenantId, tenantId));
    console.log('[OK] Master Twitter credentials updated.');
  } else {
    await db.insert(metaIntegrations).values({
      tenantId: tenantId,
      twitterApiKey: apiKey,
      twitterApiSecret: apiSecret,
      twitterAccessToken: accessToken,
      twitterAccessTokenSecret: accessTokenSecret,
      twitterConnected: true
    });
    console.log('[OK] Master Twitter credentials inserted.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[Error]', err);
  process.exit(1);
});
