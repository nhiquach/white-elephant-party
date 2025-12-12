const { createParty, sanitizeParty } = require('./_game');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hostName } = req.body;
    if (!hostName) {
      return res.status(400).json({ error: 'Host name required' });
    }

    const party = await createParty(hostName);
    res.json({
      partyId: party.id,
      hostId: party.hostId,
      party: sanitizeParty(party),
    });
  } catch (error) {
    console.error('Error creating party:', error);
    res.status(500).json({
      error: 'Failed to create party',
      details: error.message,
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN
    });
  }
};
