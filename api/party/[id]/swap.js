const { swapGift, sanitizeParty } = require('../../_game');

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
    const { playerId, giftId } = req.body;

    const party = await swapGift(id, playerId, giftId);
    if (!party) {
      return res.status(400).json({ error: 'Cannot swap gift' });
    }

    res.json(sanitizeParty(party));
  } catch (error) {
    console.error('Error swapping gift:', error);
    res.status(500).json({ error: 'Failed to swap gift' });
  }
};
