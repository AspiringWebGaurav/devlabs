const fs = require("fs");
const path = require("path");

const targets = [
  { name: ".next", type: "dir" },
  { name: ".turbo", type: "dir" },
  { name: "tsconfig.tsbuildinfo", type: "file" },
];

console.log("🧹 Clearing Next.js build cache...\n");

let hadErrors = false;

for (const target of targets) {
  const targetPath = path.join(process.cwd(), target.name);
  if (!fs.existsSync(targetPath)) {
    continue;
  }

  try {
    fs.rmSync(targetPath, {
      recursive: target.type === "dir",
      force: true,
      maxRetries: 10,
      retryDelay: 250,
    });
    console.log(`  ✓ Cleared ${target.name}`);
  } catch (err) {
    hadErrors = true;
    console.error(`  ⚠️ Could not remove ${target.name}: ${err.message}`);
    if (err.code === "EPERM" || err.code === "EBUSY") {
      console.error(
        `     👉 Notice: A running process is currently holding a lock on ${target.name}. Please stop any active dev server (Ctrl+C) and try again.`
      );
    }
  }
}

if (!hadErrors) {
  console.log("\n✨ Clear complete: Build caches removed.");
} else {
  console.log("\n⚠️ Clear finished with some locked files skipped.");
}
