// Storage module - uses Vercel KV in production, in-memory for local dev
const { kv } = require('@vercel/kv');

// In-memory fallback for local development
const localStore = new Map();

const isProduction = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

async function getParty(partyId) {
  if (isProduction) {
    return await kv.get(`party:${partyId}`);
  }
  return localStore.get(`party:${partyId}`) || null;
}

async function setParty(partyId, party) {
  if (isProduction) {
    // Set with 24 hour expiry
    await kv.set(`party:${partyId}`, party, { ex: 86400 });
  } else {
    localStore.set(`party:${partyId}`, party);
  }
}

async function deleteParty(partyId) {
  if (isProduction) {
    await kv.del(`party:${partyId}`);
  } else {
    localStore.delete(`party:${partyId}`);
  }
}

module.exports = { getParty, setParty, deleteParty };
