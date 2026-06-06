const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const idx = line.indexOf("=");
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        let val = line.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}
loadEnv();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in environment");
    process.exit(1);
  }

  console.log("Connecting to MongoDB database...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✓ Connected successfully to MongoDB");
    const db = client.db("nitech_estimates");

    console.log("Verifying and building collection indexes...");
    await Promise.all([
      db.collection("estimates").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("billings").createIndex({ estimateId: 1, userId: 1 }),
      db.collection("lead_profiles").createIndex({ userId: 1, category: 1 }),
    ]);
    console.log("✓ All indexes verified/created");

    // Fetch stats
    const estimateCount = await db.collection("estimates").countDocuments({ deletedAt: { $exists: false } });
    const deletedEstimateCount = await db.collection("estimates").countDocuments({ deletedAt: { $exists: true } });
    const billingCount = await db.collection("billings").countDocuments({ deletedAt: { $exists: false } });
    const deletedBillingCount = await db.collection("billings").countDocuments({ deletedAt: { $exists: true } });

    console.log("\n--- Database Statistics ---");
    console.log(`Estimates (Active):  ${estimateCount}`);
    console.log(`Estimates (Deleted): ${deletedEstimateCount}`);
    console.log(`Billings (Active):   ${billingCount}`);
    console.log(`Billings (Deleted):  ${deletedBillingCount}`);
    console.log("---------------------------\n");

    console.log("🎉 Migration/verification run completed successfully.");
  } catch (err) {
    console.error("❌ Database verification failed:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
