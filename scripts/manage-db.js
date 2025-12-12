#!/usr/bin/env node
/**
 * Database management script for Vercel KV
 *
 * Usage:
 *   1. First pull your env vars: vercel env pull .env.local
 *   2. Run commands:
 *      node scripts/manage-db.js list          # List all parties
 *      node scripts/manage-db.js get <id>      # Get a specific party
 *      node scripts/manage-db.js delete <id>   # Delete a specific party
 *      node scripts/manage-db.js clear         # Delete ALL parties (careful!)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
const { kv } = require('@vercel/kv');

const command = process.argv[2];
const arg = process.argv[3];

async function listParties() {
  const keys = await kv.keys('party:*');
  console.log(`Found ${keys.length} parties:\n`);

  for (const key of keys) {
    const party = await kv.get(key);
    const playerCount = party?.players?.length || 0;
    const state = party?.state || 'unknown';
    console.log(`  ${key.replace('party:', '')} - ${playerCount} players - ${state}`);
  }
}

async function getParty(id) {
  const party = await kv.get(`party:${id}`);
  if (party) {
    console.log(JSON.stringify(party, null, 2));
  } else {
    console.log('Party not found');
  }
}

async function deleteParty(id) {
  await kv.del(`party:${id}`);
  console.log(`Deleted party: ${id}`);
}

async function clearAll() {
  const keys = await kv.keys('party:*');
  if (keys.length === 0) {
    console.log('No parties to delete');
    return;
  }

  console.log(`Deleting ${keys.length} parties...`);
  for (const key of keys) {
    await kv.del(key);
    console.log(`  Deleted: ${key}`);
  }
  console.log('Done!');
}

async function main() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Error: KV environment variables not found.');
    console.error('Run: vercel env pull .env.local');
    process.exit(1);
  }

  switch (command) {
    case 'list':
      await listParties();
      break;
    case 'get':
      if (!arg) {
        console.error('Usage: node scripts/manage-db.js get <party-id>');
        process.exit(1);
      }
      await getParty(arg);
      break;
    case 'delete':
      if (!arg) {
        console.error('Usage: node scripts/manage-db.js delete <party-id>');
        process.exit(1);
      }
      await deleteParty(arg);
      break;
    case 'clear':
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Are you sure you want to delete ALL parties? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          await clearAll();
        } else {
          console.log('Cancelled');
        }
        rl.close();
      });
      return;
    default:
      console.log('Usage:');
      console.log('  node scripts/manage-db.js list          # List all parties');
      console.log('  node scripts/manage-db.js get <id>      # Get a specific party');
      console.log('  node scripts/manage-db.js delete <id>   # Delete a party');
      console.log('  node scripts/manage-db.js clear         # Delete ALL parties');
  }
}

main().catch(console.error);
