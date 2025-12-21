const { updateSettings, sanitizeParty } = require('../../_game');

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
    const { hostId, finalRoundType, finalSwapAllowLocked, maxSteals } = req.body;

    const party = await updateSettings(id, hostId, { finalRoundType, finalSwapAllowLocked, maxSteals });
    if (!party) {
      return res.status(400).json({ error: 'Cannot update settings' });
    }

    res.json(sanitizeParty(party));
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
