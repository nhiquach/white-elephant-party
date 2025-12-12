// Storage module - uses Vercel KV in production, in-memory for local dev
let kv;
try {
  kv = require('@vercel/kv').kv;
} catch (e) {
  console.log('Vercel KV not available, using in-memory storage');
}

// In-memory fallback for local development
const localStore = new Map();

function isProduction() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getParty(partyId) {
  if (isProduction() && kv) {
    try {
      return await kv.get(`party:${partyId}`);
    } catch (error) {
      console.error('KV get error:', error.message);
      throw error;
    }
  }
  return localStore.get(`party:${partyId}`) || null;
}

async function setParty(partyId, party) {
  if (isProduction() && kv) {
    try {
      // Set with 24 hour expiry
      await kv.set(`party:${partyId}`, party, { ex: 86400 });
    } catch (error) {
      console.error('KV set error:', error.message);
      throw error;
    }
  } else {
    localStore.set(`party:${partyId}`, party);
  }
}

async function deleteParty(partyId) {
  if (isProduction() && kv) {
    try {
      await kv.del(`party:${partyId}`);
    } catch (error) {
      console.error('KV delete error:', error.message);
      throw error;
    }
  } else {
    localStore.delete(`party:${partyId}`);
  }
}

module.exports = { getParty, setParty, deleteParty };
