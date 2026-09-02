import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { generateSyntheticDevelopmentData } from "../lib/dal/lifecycle/seed-generator";
import { redisDataSource } from "../lib/dal/datasource/redis";
import { firestoreDataSource } from "../lib/dal/datasource/firestore";
import { rtdbDataSource } from "../lib/dal/datasource/rtdb";
import { lifecycleOrchestrator } from "../lib/dal/lifecycle/orchestrator";

async function main() {
  console.log("\n================================================================================");
  console.log("🧪 GENERATING SYNTHETIC DUMMY TEST DATA (ONE-TIME DUMMY POPULATION)");
  console.log("================================================================================\n");

  // 1. Generate synthetic inquiries, chats, mails using seed generator (preset: "small")
  console.log("📦 1. Seeding synthetic inquiries, mails, and chat threads...");
  const result = await generateSyntheticDevelopmentData({ preset: "small", mode: "random" });

  console.log(`   ✓ Inquiries seeded:     ${result.inquiriesCount}`);
  console.log(`   ✓ Chat threads seeded:  ${result.chatThreadsCount}`);
  console.log(`   ✓ Chat messages seeded: ${result.chatMessagesCount}`);
  console.log(`   ✓ Mails seeded:         ${result.mailsCount}`);
  console.log(`   ✓ Drafts seeded:        ${result.draftsCount}`);
  console.log(`   ✓ RTDB Lead Counter:    ${result.synchronizedLeadCounter}`);

  // 2. Populate sample Redis cache keys
  console.log("\n⚡ 2. Setting sample Redis cache & rate-limit keys...");
  await redisDataSource.setKeyWithTtl("cache:portfolio:home", "<html>sample_cached_markup</html>", 3600);
  await redisDataSource.setKeyWithTtl("cache:portfolio:projects", "<html>projects_cache</html>", 3600);
  await redisDataSource.setKeyWithTtl("ratelimit:ip:192.168.1.100", "5", 3600);
  await redisDataSource.setKeyWithTtl("counter:leads:global", String(result.synchronizedLeadCounter), 3600);
  console.log("   ✓ Populated 4 Redis test keys across cache:*, ratelimit:*, counter:* namespaces.");

  // 3. Populate a disposable dynamic test collection document
  console.log("\n📄 3. Setting dynamic ledger documents...");
  await firestoreDataSource.setDocument("purge_test_dynamic", "test_item_alpha", {
    title: "Disposable Dynamic Test Item Alpha",
    createdAt: new Date().toISOString(),
    status: "disposable",
  });
  console.log("   ✓ Created purge_test_dynamic test record.");

  // 4. Run an audit to show the user exactly what is now in the database
  console.log("\n📊 4. Running current Database Audit...");
  const audit = await lifecycleOrchestrator.auditDatabase();

  console.log("\n================================================================================");
  console.log("🎉 SYNTHETIC DUMMY DATA GENERATION COMPLETE!");
  console.log("================================================================================");
  console.log(`• System State:                  ${audit.systemState}`);
  console.log(`• Static Canonical Documents:    ${audit.totalStaticCanonicalDocuments} (Preserved)`);
  console.log(`• Protected Admin Auth Docs:     ${audit.totalProtectedAuthDocuments} (100% Protected)`);
  console.log(`• Dynamic Application Records:   ${audit.totalDynamicDocuments} (Ready to Clean)`);
  console.log(`• Redis Database Keys:           ${audit.redisHealth.dbsize} keys (Ready to Clean)`);
  console.log(`• RTDB Lead Counter:             #${audit.rtdbLeadCount}`);
  console.log("================================================================================\n");
  console.log("👉 You can now navigate to /admin/purge in your browser and click 'Clean Database' to test!");
}

main().catch((err) => {
  console.error("❌ Failed to generate dummy data:", err);
  process.exit(1);
});
