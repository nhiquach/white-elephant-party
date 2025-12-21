const { keepGift, sanitizeParty } = require('../../_game');

module.exports = async function handler(req, res) {
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
    const { id } = req.query;
    const { playerId } = req.body;

    const party = await keepGift(id, playerId);
    if (!party) {
      return res.status(400).json({ error: 'Cannot keep gift' });
    }

    res.json(sanitizeParty(party));
  } catch (error) {
    console.error('Error keeping gift:', error);
    res.status(500).json({ error: 'Failed to keep gift' });
  }
};
