#!/usr/bin/env bun
/**
 * Generate a secure 32-byte encryption key for TOKEN_ENCRYPTION_KEY
 * 
 * Usage: bun run src/scripts/generate-encryption-key.ts
 */

import crypto from "node:crypto";

const key = crypto.randomBytes(32);
const base64Key = key.toString("base64");

console.log("\n✅ Generated secure encryption key:\n");
console.log(`TOKEN_ENCRYPTION_KEY="${base64Key}"`);
console.log("\n📋 Copy this line to your .env.local file\n");



