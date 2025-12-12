const { registerGift, sanitizeParty } = require('../../_game');

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
    const { playerId, giftName, giftDescription } = req.body;

    if (!giftName) {
      return res.status(400).json({ error: 'Gift name required' });
    }

    const result = await registerGift(id, playerId, giftName, giftDescription || '');
    if (!result) {
      return res.status(400).json({ error: 'Cannot register gift' });
    }

    res.json({
      gift: result.gift,
      party: sanitizeParty(result.party),
    });
  } catch (error) {
    console.error('Error registering gift:', error);
    res.status(500).json({ error: 'Failed to register gift' });
  }
};
