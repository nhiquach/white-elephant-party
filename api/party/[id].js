const { getParty, sanitizeParty } = require('../_game');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const party = await getParty(id);

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json(sanitizeParty(party));
  } catch (error) {
    console.error('Error getting party:', error);
    res.status(500).json({ error: 'Failed to get party' });
  }
};
