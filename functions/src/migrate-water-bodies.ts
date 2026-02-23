/**
 * One-time migration: creates waterBodies documents from existing lake data
 * and updates spots to include waterBodyId.
 *
 * Setup: ensure functions/serviceAccountKey.json exists
 * Run:   cd functions && npx ts-node src/migrate-water-bodies.ts
 *
 * Idempotent: safe to run multiple times.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount: Record<string, string>;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
} catch {
  console.error('serviceAccountKey.json not found at:', keyPath);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'windspotter-ba2d2',
});
const db = getFirestore();

// Known lake metadata (from the former LAKES array + lakeName mapping)
const LAKE_METADATA: Record<string, { name: string; lat: number; lng: number; region?: string }> = {
  geneva:    { name: 'Lac Léman',        lat: 46.45, lng: 6.55, region: 'Vaud' },
  neuchatel: { name: 'Lac de Neuchâtel', lat: 46.90, lng: 6.85, region: 'Neuchâtel' },
  joux:      { name: 'Lac de Joux',      lat: 46.63, lng: 6.28, region: 'Vaud' },
  bret:      { name: 'Lac de Bret',      lat: 46.53, lng: 6.79, region: 'Vaud' },
};

async function migrate() {
  console.log('Starting waterBodies migration...');

  // Step 1: Read current spots
  const spotsSnap = await db.doc('config/spots').get();
  if (!spotsSnap.exists) {
    console.error('No config/spots document found');
    process.exit(1);
  }
  const spots = spotsSnap.data()!.spots as Array<Record<string, unknown>>;
  console.log(`Found ${spots.length} spots`);

  // Step 2: Collect unique lake keys
  const lakeKeys = [...new Set(
    spots.map((s) => s.lake as string).filter(Boolean),
  )];
  console.log(`Found ${lakeKeys.length} unique lake keys: ${lakeKeys.join(', ')}`);

  // Step 3: Create waterBody documents (idempotent)
  for (const key of lakeKeys) {
    const ref = db.doc(`waterBodies/${key}`);
    const existing = await ref.get();
    if (existing.exists) {
      console.log(`  SKIP waterBodies/${key} (already exists)`);
      continue;
    }
    const meta = LAKE_METADATA[key];
    const data: Record<string, unknown> = {
      name: meta?.name ?? key,
      type: 'lake',
      alplakesId: key,
      country: 'CH',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (meta) {
      data.center = { lat: meta.lat, lng: meta.lng };
      if (meta.region) data.region = meta.region;
    }
    await ref.set(data);
    console.log(`  CREATED waterBodies/${key} -> ${meta?.name ?? key}`);
  }

  // Step 4: Update spots to include waterBodyId
  let updatedCount = 0;
  for (const spot of spots) {
    if (!spot.waterBodyId && spot.lake) {
      spot.waterBodyId = spot.lake;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await db.doc('config/spots').set({ spots });
    console.log(`  UPDATED config/spots: ${updatedCount} spot(s) got waterBodyId`);
  } else {
    console.log('  SKIP config/spots (all spots already have waterBodyId)');
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
