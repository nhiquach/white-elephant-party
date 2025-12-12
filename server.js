// Local development server (alternative to Vercel)
// Run with: npm start

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();

app.use(express.static('public'));
app.use(express.json());

// In-memory storage for parties
const parties = new Map();

function generateId() {
  return uuidv4().slice(0, 8);
}

function createParty(hostName) {
  const partyId = generateId();
  const hostId = generateId();

  const party = {
    id: partyId,
    hostId: hostId,
    hostName: hostName,
    state: 'waiting',
    players: [{
      id: hostId,
      name: hostName,
      isHost: true,
      gift: null,
      currentGift: null,
    }],
    gifts: [],
    turnOrder: [],
    currentTurnIndex: 0,
    currentPlayerId: null,
    actions: [],
    stealCount: {},
    maxSteals: 3,
    lastStolenGiftId: null,
    lastUpdated: Date.now(),
  };

  parties.set(partyId, party);
  return party;
}

function getParty(partyId) {
  return parties.get(partyId);
}

function addPlayer(partyId, playerName) {
  const party = getParty(partyId);
  if (!party) return null;
  if (party.state !== 'waiting') return null;

  const playerId = generateId();
  const player = {
    id: playerId,
    name: playerName,
    isHost: false,
    gift: null,
    currentGift: null,
  };

  party.players.push(player);
  party.lastUpdated = Date.now();
  return { party, player };
}

function registerGift(partyId, playerId, giftName, giftDescription) {
  const party = getParty(partyId);
  if (!party) return null;

  const player = party.players.find(p => p.id === playerId);
  if (!player) return null;
  if (player.gift) return null;

  const giftId = generateId();
  const gift = {
    id: giftId,
    name: giftName,
    description: giftDescription,
    broughtBy: playerId,
    broughtByName: player.name,
    opened: false,
    currentHolder: null,
    currentHolderName: null,
  };

  player.gift = giftId;
  party.gifts.push(gift);
  party.stealCount[giftId] = 0;
  party.lastUpdated = Date.now();

  return gift;
}

function startGame(partyId, hostId) {
  const party = getParty(partyId);
  if (!party || party.hostId !== hostId) return null;

  const allGiftsRegistered = party.players.every(p => p.gift !== null);
  if (!allGiftsRegistered) return null;

  party.turnOrder = [...party.players].sort(() => Math.random() - 0.5).map(p => p.id);
  party.currentTurnIndex = 0;
  party.currentPlayerId = party.turnOrder[0];
  party.state = 'playing';

  party.actions.push({
    type: 'game_started',
    timestamp: Date.now(),
    turnOrder: party.turnOrder.map(id => party.players.find(p => p.id === id).name),
  });

  party.lastUpdated = Date.now();
  return party;
}

function openGift(partyId, playerId, giftId) {
  const party = getParty(partyId);
  if (!party || party.state !== 'playing') return null;
  if (party.currentPlayerId !== playerId) return null;

  const gift = party.gifts.find(g => g.id === giftId);
  const player = party.players.find(p => p.id === playerId);
  if (!gift || !player || gift.opened) return null;

  gift.opened = true;
  gift.currentHolder = playerId;
  gift.currentHolderName = player.name;
  player.currentGift = giftId;

  party.actions.push({
    type: 'opened',
    timestamp: Date.now(),
    playerId: playerId,
    playerName: player.name,
    giftId: giftId,
    giftName: gift.name,
  });

  party.lastStolenGiftId = null;
  advanceTurn(party);
  party.lastUpdated = Date.now();

  return party;
}

function stealGift(partyId, playerId, giftId) {
  const party = getParty(partyId);
  if (!party || party.state !== 'playing') return null;
  if (party.currentPlayerId !== playerId) return null;

  const gift = party.gifts.find(g => g.id === giftId);
  const player = party.players.find(p => p.id === playerId);
  if (!gift || !player) return null;
  if (!gift.opened) return null;
  if (gift.currentHolder === playerId) return null;
  if (gift.id === party.lastStolenGiftId) return null;
  if (party.stealCount[giftId] >= party.maxSteals) return null;

  const previousHolder = party.players.find(p => p.id === gift.currentHolder);

  if (previousHolder) {
    previousHolder.currentGift = null;
  }

  gift.currentHolder = playerId;
  gift.currentHolderName = player.name;
  player.currentGift = giftId;
  party.stealCount[giftId]++;
  party.lastStolenGiftId = giftId;

  party.actions.push({
    type: 'stolen',
    timestamp: Date.now(),
    playerId: playerId,
    playerName: player.name,
    giftId: giftId,
    giftName: gift.name,
    fromPlayerId: previousHolder?.id,
    fromPlayerName: previousHolder?.name,
  });

  if (previousHolder) {
    party.currentPlayerId = previousHolder.id;
  }

  party.lastUpdated = Date.now();
  return party;
}

function advanceTurn(party) {
  party.currentTurnIndex++;

  const unopenedGifts = party.gifts.filter(g => !g.opened);
  if (unopenedGifts.length === 0) {
    endGame(party);
    return;
  }

  while (party.currentTurnIndex < party.turnOrder.length) {
    const nextPlayerId = party.turnOrder[party.currentTurnIndex];
    const nextPlayer = party.players.find(p => p.id === nextPlayerId);
    if (!nextPlayer.currentGift) {
      party.currentPlayerId = nextPlayerId;
      return;
    }
    party.currentTurnIndex++;
  }

  const playersWithoutGifts = party.players.filter(p => !p.currentGift);
  if (playersWithoutGifts.length > 0) {
    party.currentPlayerId = playersWithoutGifts[0].id;
  } else {
    endGame(party);
  }
}

function endGame(party) {
  party.state = 'finished';
  party.currentPlayerId = null;

  party.actions.push({
    type: 'game_ended',
    timestamp: Date.now(),
    results: party.players.map(p => {
      const gift = party.gifts.find(g => g.id === p.currentGift);
      return {
        playerName: p.name,
        giftName: gift?.name || 'No gift',
        giftDescription: gift?.description || '',
        broughtBy: gift?.broughtByName || 'Unknown',
      };
    }),
  });

  party.lastUpdated = Date.now();
}

function sanitizeParty(party) {
  if (!party) return null;
  return {
    id: party.id,
    hostId: party.hostId,
    hostName: party.hostName,
    state: party.state,
    players: party.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      hasGift: p.gift !== null,
      currentGift: p.currentGift,
    })),
    gifts: party.gifts.map(g => ({
      id: g.id,
      name: g.opened ? g.name : '???',
      description: g.opened ? g.description : '',
      opened: g.opened,
      currentHolder: g.currentHolder,
      currentHolderName: g.currentHolderName,
      broughtByName: g.opened ? g.broughtByName : '???',
      stealCount: party.stealCount[g.id] || 0,
      maxSteals: party.maxSteals,
    })),
    currentPlayerId: party.currentPlayerId,
    currentPlayerName: party.players.find(p => p.id === party.currentPlayerId)?.name || null,
    turnOrder: party.turnOrder.map(id => party.players.find(p => p.id === id)?.name || ''),
    actions: party.actions,
    lastStolenGiftId: party.lastStolenGiftId,
    lastUpdated: party.lastUpdated,
  };
}

// API Routes
app.post('/api/party', (req, res) => {
  const { hostName } = req.body;
  if (!hostName) {
    return res.status(400).json({ error: 'Host name required' });
  }
  const party = createParty(hostName);
  res.json({ partyId: party.id, hostId: party.hostId, party: sanitizeParty(party) });
});

app.get('/api/party/:partyId', (req, res) => {
  const party = getParty(req.params.partyId);
  if (!party) {
    return res.status(404).json({ error: 'Party not found' });
  }
  res.json(sanitizeParty(party));
});

app.post('/api/party/:partyId/join', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) {
    return res.status(400).json({ error: 'Player name required' });
  }
  const result = addPlayer(req.params.partyId, playerName);
  if (!result) {
    return res.status(400).json({ error: 'Cannot join party' });
  }
  res.json({ playerId: result.player.id, party: sanitizeParty(result.party) });
});

app.post('/api/party/:partyId/gift', (req, res) => {
  const { playerId, giftName, giftDescription } = req.body;
  const gift = registerGift(req.params.partyId, playerId, giftName, giftDescription || '');
  if (!gift) {
    return res.status(400).json({ error: 'Cannot register gift' });
  }
  const party = getParty(req.params.partyId);
  res.json({ gift, party: sanitizeParty(party) });
});

app.post('/api/party/:partyId/start', (req, res) => {
  const { hostId } = req.body;
  const party = startGame(req.params.partyId, hostId);
  if (!party) {
    return res.status(400).json({ error: 'Cannot start game' });
  }
  res.json(sanitizeParty(party));
});

app.post('/api/party/:partyId/open', (req, res) => {
  const { playerId, giftId } = req.body;
  const party = openGift(req.params.partyId, playerId, giftId);
  if (!party) {
    return res.status(400).json({ error: 'Cannot open gift' });
  }
  res.json(sanitizeParty(party));
});

app.post('/api/party/:partyId/steal', (req, res) => {
  const { playerId, giftId } = req.body;
  const party = stealGift(req.params.partyId, playerId, giftId);
  if (!party) {
    return res.status(400).json({ error: 'Cannot steal gift' });
  }
  res.json(sanitizeParty(party));
});

app.post('/api/party/:partyId/register', (req, res) => {
  const { hostId } = req.body;
  const party = getParty(req.params.partyId);
  if (!party || party.hostId !== hostId) {
    return res.status(400).json({ error: 'Not authorized' });
  }
  party.state = 'registering';
  party.lastUpdated = Date.now();
  res.json(sanitizeParty(party));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`White Elephant server running on http://localhost:${PORT}`);
});
