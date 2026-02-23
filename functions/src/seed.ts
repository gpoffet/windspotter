/**
 * Seed script: populates config/spots and config/navigability in Firestore.
 *
 * Setup: download service account key from Firebase console and save as
 *        functions/serviceAccountKey.json
 *
 * Run:   cd functions && npm run seed
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
  console.error('❌ serviceAccountKey.json not found at:', keyPath);
  console.error('   Download it from: https://console.firebase.google.com/project/windspotter-ba2d2/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'windspotter-ba2d2',
});
const db = getFirestore();

async function seed() {
  console.log('Seeding Firestore config documents...');

  // waterBodies
  const waterBodies = [
    { id: 'geneva', name: 'Lac Léman', type: 'lake', alplakesId: 'geneva', center: { lat: 46.45, lng: 6.55 }, country: 'CH', region: 'Vaud' },
    { id: 'neuchatel', name: 'Lac de Neuchâtel', type: 'lake', alplakesId: 'neuchatel', center: { lat: 46.90, lng: 6.85 }, country: 'CH', region: 'Neuchâtel' },
    { id: 'joux', name: 'Lac de Joux', type: 'lake', alplakesId: 'joux', center: { lat: 46.63, lng: 6.28 }, country: 'CH', region: 'Vaud' },
    { id: 'bret', name: 'Lac de Bret', type: 'lake', alplakesId: 'bret', center: { lat: 46.53, lng: 6.79 }, country: 'CH', region: 'Vaud' },
  ];
  for (const wb of waterBodies) {
    const { id, ...data } = wb;
    await db.doc(`waterBodies/${id}`).set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  console.log('  ✓ waterBodies');

  // config/spots
  await db.doc('config/spots').set({
    spots: [
      {
        id: 'lutry',
        name: 'Lutry',
        pointId: '109500',
        stationId: 'PUY',
        npa: 1095,
        lat: 46.5031,
        lon: 6.6856,
        lake: 'geneva',
        alplakesKey: 'geneva',
        waterBodyId: 'geneva',
      },
      {
        id: 'saint-prex',
        name: 'Saint-Prex',
        pointId: '116200',
        stationId: 'CGI',
        npa: 1162,
        lat: 46.4819,
        lon: 6.4483,
        lake: 'geneva',
        alplakesKey: 'geneva',
        waterBodyId: 'geneva',
      },
      {
        id: 'lac-de-joux',
        name: 'Lac de Joux',
        pointId: '134700',
        stationId: 'CHB',
        npa: 1347,
        lat: 46.63,
        lon: 6.32,
        lake: 'joux',
        alplakesKey: 'joux',
        waterBodyId: 'joux',
      },
      {
        id: 'yvonand',
        name: 'Yvonand',
        pointId: '146200',
        stationId: 'PAY',
        npa: 1462,
        lat: 46.8,
        lon: 6.74,
        lake: 'neuchatel',
        alplakesKey: 'neuchatel',
        waterBodyId: 'neuchatel',
      },
      {
        id: 'concise',
        name: 'Concise',
        pointId: '142600',
        stationId: 'MAH',
        npa: 1426,
        lat: 46.85,
        lon: 6.73,
        lake: 'neuchatel',
        alplakesKey: 'neuchatel',
        waterBodyId: 'neuchatel',
      },
      {
        id: 'lac-de-bret',
        name: 'Lac de Bret',
        pointId: '107000',
        stationId: 'PUY',
        npa: 1070,
        lat: 46.55,
        lon: 6.75,
        lake: 'bret',
        alplakesKey: 'bret',
        waterBodyId: 'bret',
      },
    ],
  });
  console.log('  ✓ config/spots');

  // config/navigability
  await db.doc('config/navigability').set({
    windSpeedMin: 15,
    windSpeedMax: 20,
    gustMin: 25,
    minConsecutiveHours: 2,
    dayStartHour: 7,
    dayEndHour: 20,
    timezone: 'Europe/Zurich',
  });
  console.log('  ✓ config/navigability');

  console.log('Done! ✓');
}

seed().catch(console.error);
