/**
 * Database Seed Script
 * 
 * Creates initial channels for NXT Social Extreme
 * Run with: bun run db:seed
 */

import { db } from "./db";
import { channels } from "./schema";

const seedChannels = [
  {
    name: "NXT Level TECH Facebook",
    platform: "Facebook",
    handle: "@nxtleveltech",
    branch: "South Africa",
    status: "Pending",
    isConnected: false,
    syncEnabled: true,
    pushEnabled: true,
    authType: "oauth",
  },
  {
    name: "NXT Level TECH Instagram",
    platform: "Instagram",
    handle: "@nxtleveltech",
    branch: "South Africa",
    status: "Pending",
    isConnected: false,
    syncEnabled: true,
    pushEnabled: true,
    authType: "oauth",
  },
  {
    name: "NXT Level TECH WhatsApp",
    platform: "WhatsApp",
    handle: "+27 76 147 8369",
    branch: "South Africa",
    status: "Pending",
    isConnected: false,
    syncEnabled: true,
    pushEnabled: true,
    authType: "oauth",
  },
  {
    name: "NXT Level TECH TikTok",
    platform: "TikTok",
    handle: "@nxtleveltech",
    branch: "South Africa",
    status: "Pending",
    isConnected: false,
    syncEnabled: true,
    pushEnabled: true,
    authType: "oauth",
  },
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Check if channels already exist
    const existingChannels = await db.select().from(channels);
    
    if (existingChannels.length > 0) {
      console.log(`⚠️  Found ${existingChannels.length} existing channels. Skipping seed.`);
      console.log("   To re-seed, first clear the channels table manually.\n");
      process.exit(0);
    }

    // Insert seed channels
    console.log("📦 Inserting seed channels...\n");
    
    for (const channel of seedChannels) {
      const [inserted] = await db.insert(channels).values(channel).returning();
      console.log(`   ✓ Created: ${inserted.name} (${inserted.platform}) - ID: ${inserted.id}`);
    }

    console.log("\n✅ Seed complete!");
    console.log(`   Created ${seedChannels.length} channels.`);
    console.log("\n📝 Next steps:");
    console.log("   1. Go to http://localhost:3000/channels");
    console.log("   2. Click 'Finish Setup' on any channel");
    console.log("   3. Complete OAuth to connect your account\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
