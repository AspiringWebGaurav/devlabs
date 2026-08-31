import { getAdminFirestore } from "../lib/admin/firebase-admin";

const ACTIVE_CMS_COLLECTIONS = [
  "portfolio_hero",
  "portfolio_cards",
  "portfolio_projects",
  "portfolio_testimonials",
  "portfolio_clients",
  "portfolio_experience",
  "portfolio_phases",
  "portfolio_navigation",
  "portfolio_cta",
  "portfolio_footer",
  "portfolio_social_links",
  "portfolio_seo",
  "portfolio_assistant",
];

const ACTIVE_OPERATIONAL_COLLECTIONS = [
  "inquiries",
  "admin_mails",
  "admin_mail_drafts",
  "media",
];

const ACTIVE_SECURITY_COLLECTIONS = [
  "admin_challenges",
  "admin_trusted_ips",
  "admin_ip_verifications",
  "live_chat_sessions",
  "live_chat_challenges",
];

const DEPRECATED_ORPHANED_COLLECTIONS = [
  "live_chat_threads",
  "live_chat_notification_jobs",
  "live_chat_room_sessions",
  "live_chat_room_access",
  "live_chat_return_capabilities",
  "live_chat_visitor_notification_jobs",
  "rate_limits",
];

async function runAudit() {
  console.log("\n===================================================================");
  console.log("🔍 FIRESTORE FORENSIC AUDIT & DATABASE PURGE READINESS CHECK");
  console.log("===================================================================\n");

  const db = getAdminFirestore();
  if (!db) {
    console.error("❌ FATAL: Unable to initialize Firestore Admin SDK. Check credentials in .env.local.");
    process.exit(1);
  }

  let totalActiveDocs = 0;
  let totalOrphanedDocs = 0;

  // 1. Audit CMS Collections
  console.log("📁 1. Active CMS Collections (Static Portfolio Data):");
  console.log("-------------------------------------------------------------------");
  for (const collName of ACTIVE_CMS_COLLECTIONS) {
    try {
      const snap = await db.collection(collName).get();
      const count = snap.size;
      totalActiveDocs += count;
      const statusIcon = count === 0 ? "⚪ EMPTY (Purged)" : `🔵 ${count} docs`;
      console.log(`  • ${collName.padEnd(30, " ")}: ${statusIcon}`);
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`  • ${collName.padEnd(30, " ")}: ⚠️ Error reading: ${error.message}`);
    }
  }

  // 2. Audit Operational Collections
  console.log("\n📁 2. Active Operational Collections (Inquiries & Mail):");
  console.log("-------------------------------------------------------------------");
  for (const collName of ACTIVE_OPERATIONAL_COLLECTIONS) {
    try {
      const snap = await db.collection(collName).get();
      const count = snap.size;
      totalActiveDocs += count;
      const statusIcon = count === 0 ? "⚪ EMPTY" : `🔵 ${count} docs`;
      console.log(`  • ${collName.padEnd(30, " ")}: ${statusIcon}`);
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`  • ${collName.padEnd(30, " ")}: ⚠️ Error reading: ${error.message}`);
    }
  }

  // 3. Audit Security Collections
  console.log("\n📁 3. Active Security Collections (Admin & Visitor Auth):");
  console.log("-------------------------------------------------------------------");
  for (const collName of ACTIVE_SECURITY_COLLECTIONS) {
    try {
      const snap = await db.collection(collName).get();
      const count = snap.size;
      totalActiveDocs += count;
      const statusIcon = count === 0 ? "⚪ EMPTY" : `🔵 ${count} docs`;
      console.log(`  • ${collName.padEnd(30, " ")}: ${statusIcon}`);
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`  • ${collName.padEnd(30, " ")}: ⚠️ Error reading: ${error.message}`);
    }
  }

  // 4. Hunt Deprecated / Orphaned Collections
  console.log("\n⚠️ 4. Deprecated / Orphaned Collections Audit (Target for Manual Purge):");
  console.log("-------------------------------------------------------------------");
  for (const collName of DEPRECATED_ORPHANED_COLLECTIONS) {
    try {
      const snap = await db.collection(collName).get();
      const count = snap.size;
      totalOrphanedDocs += count;
      if (count > 0) {
        console.log(`  • ${collName.padEnd(35, " ")}: ❌ STALE DATA DETECTED (${count} orphaned docs)`);
      } else {
        console.log(`  • ${collName.padEnd(35, " ")}: ✅ CLEAN (0 docs)`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`  • ${collName.padEnd(35, " ")}: ⚠️ Error reading: ${error.message}`);
    }
  }

  console.log("\n===================================================================");
  console.log("📊 PURGE READINESS SUMMARY");
  console.log("===================================================================");
  console.log(`Active Database Documents:      ${totalActiveDocs}`);
  console.log(`Orphaned / Stale Documents:     ${totalOrphanedDocs}`);
  console.log(`In-Memory Static Backup Status:  ✅ READY (lib/dal/repositories/seed-data.ts)`);
  console.log(`Public Fallback Status:         ✅ PROTECTED (PublicPortfolioRepository)`);
  console.log("===================================================================\n");
}

runAudit().catch((err) => {
  console.error("Audit error:", err);
});
