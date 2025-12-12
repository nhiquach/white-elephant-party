const { addPlayer, sanitizeParty } = require('../../_game');

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
    const { playerName } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: 'Player name required' });
    }

    const result = await addPlayer(id, playerName);
    if (!result) {
      return res.status(400).json({ error: 'Cannot join party' });
    }

    res.json({
      playerId: result.player.id,
      party: sanitizeParty(result.party),
    });
  } catch (error) {
    console.error('Error joining party:', error);
    res.status(500).json({ error: 'Failed to join party' });
  }
};
