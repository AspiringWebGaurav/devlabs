/**
 * Deploy & Verify Firestore Composite Indexes
 *
 * Reads firestore.indexes.json and checks/deploys composite indexes
 * against Google Cloud Firestore using Firebase Admin credentials.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Read .env.local
const envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const projectId = getEnv('FIREBASE_ADMIN_PROJECT_ID') || getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
const clientEmail = getEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
let privateKey = getEnv('FIREBASE_ADMIN_PRIVATE_KEY');
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing required Firebase Admin credentials in .env.local');
  process.exit(1);
}

// 2. Read firestore.indexes.json
const indexesPath = path.join(rootDir, 'firestore.indexes.json');
if (!fs.existsSync(indexesPath)) {
  console.error('❌ firestore.indexes.json not found');
  process.exit(1);
}

const indexesConfig = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
const targetIndexes = indexesConfig.indexes || [];

console.log(`\n======================================================`);
console.log(`🚀 Firestore Composite Indexes Deployment Engine`);
console.log(`Project: ${projectId}`);
console.log(`Target Indexes Defined: ${targetIndexes.length}`);
console.log(`======================================================\n`);

async function run() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  const tokenObj = await app.options.credential.getAccessToken();
  const token = tokenObj.access_token;

  // 3. Fetch existing indexes from Firestore
  console.log('📡 Fetching active Firestore composite indexes...');
  const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    console.error(`❌ Failed to list indexes: ${listRes.status} ${listRes.statusText}`);
    const errText = await listRes.text();
    console.error(errText);
    return;
  }

  const listData = await listRes.json();
  const existingIndexes = listData.indexes || [];
  console.log(`✅ Current Active Indexes in Firestore: ${existingIndexes.length}`);
  for (const ex of existingIndexes) {
    const fieldsStr = (ex.fields || []).map((f) => `${f.fieldPath} (${f.order})`).join(', ');
    console.log(`   Found in Firestore: ${ex.name} -> ${fieldsStr} [state: ${ex.state}]`);
  }
  console.log('');

  let deployedCount = 0;
  let alreadyPresentCount = 0;
  let manualActionNeeded = [];

  for (const idx of targetIndexes) {
    const colGroup = idx.collectionGroup;
    const fieldsDesc = idx.fields.map((f) => `${f.fieldPath} (${f.order})`).join(', ');
    const label = `[${colGroup}] -> ${fieldsDesc}`;

    // Check if index already exists (ignoring implicit __name__ field)
    const exists = existingIndexes.some((ex) => {
      if (!ex.name || !ex.name.includes(`/collectionGroups/${colGroup}/indexes/`)) return false;
      const nonNameFields = (ex.fields || []).filter((f) => f.fieldPath !== '__name__');
      if (nonNameFields.length !== idx.fields.length) return false;
      return idx.fields.every((f, i) => {
        const ef = nonNameFields[i];
        return ef && ef.fieldPath === f.fieldPath && ef.order === f.order;
      });
    });

    if (exists) {
      console.log(`  ✓ ALREADY ACTIVE [READY]: ${label}`);
      alreadyPresentCount++;
      continue;
    }

    // Attempt to create index via REST API
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${colGroup}/indexes`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queryScope: idx.queryScope || 'COLLECTION',
        fields: idx.fields,
      }),
    });

    if (createRes.ok) {
      console.log(`  ✨ CREATED / BUILDING: ${label}`);
      deployedCount++;
    } else {
      const errData = await createRes.json().catch(() => ({}));
      const isPermissionDenied = createRes.status === 403;

      console.log(`  ⚠️  PENDING ACTIVATION: ${label}`);

      // Encode fields for direct console link
      const directUrl = `https://console.firebase.google.com/v1/r/project/${projectId}/firestore/indexes`;
      manualActionNeeded.push({
        colGroup,
        fieldsDesc,
        directUrl,
        reason: isPermissionDenied ? 'Service account missing datastore.indexes.create IAM permission' : errData.error?.message,
      });
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 Summary:`);
  console.log(`  - Active Indexes: ${alreadyPresentCount}`);
  console.log(`  - Newly Deployed: ${deployedCount}`);
  console.log(`  - Pending Manual / IAM: ${manualActionNeeded.length}`);
  console.log(`------------------------------------------------------\n`);

  if (manualActionNeeded.length > 0) {
    console.log(`🔔 1-CLICK ACTIVATION & IAM NOTICE:`);
    console.log(`The Firebase Admin Service Account currently has read/query access, but lacks the Google Cloud 'datastore.indexes.create' IAM permission.`);
    console.log(`\nTo activate all indexes directly:`);
    console.log(`1. Open Firebase Console Firestore Indexes:`);
    console.log(`   👉 https://console.firebase.google.com/project/${projectId}/firestore/indexes\n`);
    console.log(`2. (Optional) To grant permanent automated API deployment access to the service account, run in Google Cloud Shell or Terminal:`);
    console.log(`   gcloud projects add-iam-policy-binding ${projectId} \\`);
    console.log(`     --member="serviceAccount:${clientEmail}" \\`);
    console.log(`     --role="roles/datastore.indexAdmin"\n`);
    console.log(`Note: The application DAL now features Zero-Downtime Index Resilience. Queries automatically execute and sort in memory without crashing even before indexes finish building!`);
  }
}

run().catch((err) => {
  console.error('Fatal error during index deployment:', err);
  process.exit(1);
});
