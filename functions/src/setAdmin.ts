/**
 * Standalone script to set the admin custom claim on a user.
 *
 * Setup: same serviceAccountKey.json as seed.ts
 * Run:   cd functions && npm run build && node lib/setAdmin.js user@email.com
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount: Record<string, string>;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
} catch {
  console.error('serviceAccountKey.json not found at:', keyPath);
  console.error('   Download it from: https://console.firebase.google.com/project/windspotter-ba2d2/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'windspotter-ba2d2',
});

const email = process.argv[2];

if (!email) {
  console.error('Usage: node lib/setAdmin.js <email>');
  process.exit(1);
}

async function main() {
  const auth = getAuth();

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`Admin claim set for ${user.email} (uid: ${user.uid})`);
    console.log('The user must sign out and sign back in for the claim to take effect.');
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }
}

main();
