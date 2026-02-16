import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { eq } from "drizzle-orm";

function isEncrypted(value: string): boolean {
  return value.startsWith("v1:");
}

async function main() {
  const allChannels = await db.select().from(channels);

  let updated = 0;
  for (const c of allChannels) {
    const set: Record<string, unknown> = {};

    if (c.accessToken && !isEncrypted(c.accessToken)) {
      set.accessToken = encryptSecret(c.accessToken);
    }
    if (c.refreshToken && !isEncrypted(c.refreshToken)) {
      set.refreshToken = encryptSecret(c.refreshToken);
    }

    if (Object.keys(set).length === 0) continue;

    await db.update(channels).set(set).where(eq(channels.id, c.id));
    updated += 1;
  }

  console.log(`✅ Encrypted tokens for ${updated} channel(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Token encryption migration failed:");
    console.error(err);
    process.exit(1);
  });





