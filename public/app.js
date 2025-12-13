// White Elephant Party App

// State
let currentPartyId = null;
let currentPlayerId = null;
let currentPlayerName = null;
let isHost = false;
let party = null;
let selectingGiftFor = null; // 'open' or 'steal'
let pollInterval = null;
let lastUpdated = 0;
let isMusicPlaying = false;

// DOM Elements
const screens = {
  home: document.getElementById('home-screen'),
  create: document.getElementById('create-screen'),
  join: document.getElementById('join-screen'),
  waiting: document.getElementById('waiting-screen'),
  register: document.getElementById('register-screen'),
  game: document.getElementById('game-screen'),
  results: document.getElementById('results-screen'),
};

const modal = document.getElementById('gift-modal');
const userInfoBar = document.getElementById('user-info-bar');
const christmasMusic = document.getElementById('christmas-music');
const musicToggle = document.getElementById('music-toggle');

// Initialize
function init() {
  // Check URL for party code
  const urlParams = new URLSearchParams(window.location.search);
  const partyCode = urlParams.get('party');
  if (partyCode) {
    document.getElementById('party-code').value = partyCode;
    showScreen('join');
  }

  // Check localStorage for existing session
  const savedSession = localStorage.getItem('whiteElephantSession');
  if (savedSession) {
    const session = JSON.parse(savedSession);
    currentPartyId = session.partyId;
    currentPlayerId = session.playerId;
    isHost = session.isHost;
    rejoinParty();
  }

  // Initialize music state from localStorage
  initMusic();

  setupEventListeners();
}

function setupEventListeners() {
  // Home screen
  document.getElementById('create-party-btn').addEventListener('click', () => showScreen('create'));
  document.getElementById('join-party-btn').addEventListener('click', () => showScreen('join'));

  // Create screen
  document.getElementById('start-party-btn').addEventListener('click', createParty);
  document.getElementById('back-home-btn').addEventListener('click', () => showScreen('home'));

  // Join screen
  document.getElementById('join-btn').addEventListener('click', joinParty);
  document.getElementById('back-home-btn-2').addEventListener('click', () => showScreen('home'));

  // Waiting screen
  document.getElementById('copy-link-btn').addEventListener('click', copyInviteLink);
  document.getElementById('start-registration-btn').addEventListener('click', startRegistration);

  // Register screen
  document.getElementById('register-gift-btn').addEventListener('click', registerGift);
  document.getElementById('start-game-btn').addEventListener('click', startGame);

  // Game screen
  document.getElementById('action-open').addEventListener('click', () => showGiftSelection('open'));
  document.getElementById('action-steal').addEventListener('click', () => showGiftSelection('steal'));
  document.getElementById('stolen-open').addEventListener('click', () => showGiftSelection('open'));
  document.getElementById('stolen-steal').addEventListener('click', () => showGiftSelection('steal'));

  // Modal
  document.getElementById('modal-cancel').addEventListener('click', () => hideModal());

  // Results screen
  document.getElementById('new-party-btn').addEventListener('click', () => {
    leaveParty();
  });

  // User info bar
  document.getElementById('leave-party-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to leave this party?')) {
      leaveParty();
    }
  });

  // Music toggle
  musicToggle.addEventListener('click', toggleMusic);
}

// Leave party and go home
function leaveParty() {
  stopPolling();
  localStorage.removeItem('whiteElephantSession');
  currentPartyId = null;
  currentPlayerId = null;
  currentPlayerName = null;
  isHost = false;
  party = null;
  hideUserInfoBar();
  showScreen('home');
  // Clear URL params
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Music Functions
function initMusic() {
  const savedMusicState = localStorage.getItem('whiteElephantMusic');
  if (savedMusicState === 'playing') {
    // Try to auto-play if user previously had music on
    // Note: Most browsers block autoplay, so we just set the visual state
    // and the music will start on first user interaction
    updateMusicUI(true);
    isMusicPlaying = true;
    // Attempt to play (may be blocked by browser)
    christmasMusic.play().catch(() => {
      // Autoplay blocked, will play on next toggle
    });
  }
}

function toggleMusic() {
  if (isMusicPlaying) {
    christmasMusic.pause();
    isMusicPlaying = false;
    localStorage.setItem('whiteElephantMusic', 'paused');
    updateMusicUI(false);
  } else {
    christmasMusic.play().then(() => {
      isMusicPlaying = true;
      localStorage.setItem('whiteElephantMusic', 'playing');
      updateMusicUI(true);
    }).catch((error) => {
      console.log('Music playback failed:', error);
      updateMusicUI(false);
    });
  }
}

function updateMusicUI(isPlaying) {
  const statusText = musicToggle.querySelector('.music-status');
  if (isPlaying) {
    musicToggle.classList.add('playing');
    statusText.textContent = 'ON';
  } else {
    musicToggle.classList.remove('playing');
    statusText.textContent = 'OFF';
  }
}

// User Info Bar functions
function showUserInfoBar() {
  if (currentPlayerName && currentPartyId) {
    document.getElementById('display-player-name').textContent = currentPlayerName;
    document.getElementById('display-party-code').textContent = currentPartyId.toUpperCase();
    userInfoBar.style.display = 'flex';
  }
}

function hideUserInfoBar() {
  userInfoBar.style.display = 'none';
}

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// Polling for updates
function startPolling() {
  stopPolling();
  pollInterval = setInterval(pollPartyUpdates, 2000); // Poll every 2 seconds
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function pollPartyUpdates() {
  if (!currentPartyId) return;

  try {
    const response = await fetch(`/api/party/${currentPartyId}`);
    if (!response.ok) return;

    const data = await response.json();
    if (data.error) return;

    // Only update if something changed
    if (data.lastUpdated && data.lastUpdated !== lastUpdated) {
      lastUpdated = data.lastUpdated;
      handlePartyUpdate(data);
    }
  } catch (error) {
    console.error('Polling error:', error);
  }
}

// API Functions
async function createParty() {
  const hostName = document.getElementById('host-name').value.trim();
  if (!hostName) {
    alert('Please enter your name!');
    return;
  }

  try {
    const response = await fetch('/api/party', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    currentPartyId = data.partyId;
    currentPlayerId = data.hostId;
    currentPlayerName = hostName;
    isHost = true;
    party = data.party;
    lastUpdated = data.party.lastUpdated || 0;

    saveSession();
    startPolling();
    showUserInfoBar();
    updateWaitingScreen();
    showScreen('waiting');
  } catch (error) {
    console.error('Error creating party:', error);
    alert('Failed to create party. Please try again.');
  }
}

async function joinParty() {
  const partyCode = document.getElementById('party-code').value.trim().toLowerCase();
  const playerName = document.getElementById('player-name').value.trim();

  if (!partyCode || !playerName) {
    alert('Please enter the party code and your name!');
    return;
  }

  try {
    const response = await fetch(`/api/party/${partyCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    currentPartyId = partyCode;
    currentPlayerId = data.playerId;
    currentPlayerName = playerName;
    isHost = false;
    party = data.party;
    lastUpdated = data.party.lastUpdated || 0;

    saveSession();
    startPolling();
    showUserInfoBar();
    updateWaitingScreen();
    showScreen('waiting');
  } catch (error) {
    console.error('Error joining party:', error);
    alert('Failed to join party. Please check the code and try again.');
  }
}

async function rejoinParty() {
  try {
    const response = await fetch(`/api/party/${currentPartyId}`);
    const data = await response.json();

    if (data.error) {
      localStorage.removeItem('whiteElephantSession');
      return;
    }

    party = data;
    lastUpdated = data.lastUpdated || 0;

    // Check if player still exists in party
    const player = party.players.find(p => p.id === currentPlayerId);
    if (!player) {
      localStorage.removeItem('whiteElephantSession');
      return;
    }

    // Restore player name from party data
    currentPlayerName = player.name;
    isHost = player.isHost;

    startPolling();
    showUserInfoBar();
    navigateToCurrentState();
  } catch (error) {
    console.error('Error rejoining party:', error);
    localStorage.removeItem('whiteElephantSession');
  }
}

function navigateToCurrentState() {
  switch (party.state) {
    case 'waiting':
      updateWaitingScreen();
      showScreen('waiting');
      break;
    case 'registering':
      updateRegisterScreen();
      showScreen('register');
      break;
    case 'playing':
      updateGameScreen();
      showScreen('game');
      break;
    case 'finished':
      updateResultsScreen();
      showScreen('results');
      stopPolling(); // Stop polling when game is finished
      break;
  }
}

async function startRegistration() {
  try {
    const response = await fetch(`/api/party/${currentPartyId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: currentPlayerId }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    party = data;
    lastUpdated = data.lastUpdated || 0;
    navigateToCurrentState();
  } catch (error) {
    console.error('Error starting registration:', error);
  }
}

async function registerGift() {
  const giftName = document.getElementById('gift-name').value.trim();
  const giftDesc = document.getElementById('gift-desc').value.trim();

  if (!giftName) {
    alert('Please enter a gift name!');
    return;
  }

  try {
    const response = await fetch(`/api/party/${currentPartyId}/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: currentPlayerId,
        giftName,
        giftDescription: giftDesc,
      }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    party = data.party;
    lastUpdated = data.party.lastUpdated || 0;
    updateRegisterScreen();
  } catch (error) {
    console.error('Error registering gift:', error);
  }
}

async function startGame() {
  try {
    const response = await fetch(`/api/party/${currentPartyId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: currentPlayerId }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    party = data;
    lastUpdated = data.lastUpdated || 0;
    navigateToCurrentState();
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

async function openGift(giftId) {
  try {
    const response = await fetch(`/api/party/${currentPartyId}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: currentPlayerId, giftId }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      hideModal();
      return;
    }

    party = data;
    lastUpdated = data.lastUpdated || 0;
    hideModal();
    navigateToCurrentState();
  } catch (error) {
    console.error('Error opening gift:', error);
  }
}

async function stealGift(giftId) {
  try {
    const response = await fetch(`/api/party/${currentPartyId}/steal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: currentPlayerId, giftId }),
    });

    const data = await response.json();
    if (data.error) {
      alert(data.error);
      hideModal();
      return;
    }

    party = data;
    lastUpdated = data.lastUpdated || 0;
    hideModal();
    navigateToCurrentState();
  } catch (error) {
    console.error('Error stealing gift:', error);
  }
}

// UI Update Functions
function handlePartyUpdate(updatedParty) {
  party = updatedParty;
  navigateToCurrentState();
}

function updateWaitingScreen() {
  document.getElementById('invite-code').textContent = currentPartyId.toUpperCase();
  document.getElementById('player-count').textContent = party.players.length;

  const playersList = document.getElementById('players-list');
  playersList.innerHTML = party.players.map(p => `
    <li>
      ${p.name}
      ${p.isHost ? '<span class="host-badge">[HOST]</span>' : ''}
    </li>
  `).join('');

  const hostControls = document.getElementById('host-controls');
  const waitingText = document.getElementById('waiting-text');

  if (isHost) {
    hostControls.style.display = 'block';
    waitingText.style.display = 'none';
  } else {
    hostControls.style.display = 'none';
    waitingText.style.display = 'block';
  }
}

function updateRegisterScreen() {
  const currentPlayer = party.players.find(p => p.id === currentPlayerId);
  const hasRegistered = currentPlayer?.hasGift;

  const giftForm = document.getElementById('gift-form');
  const giftRegistered = document.getElementById('gift-registered');
  const hostStartGame = document.getElementById('host-start-game');

  if (hasRegistered) {
    giftForm.style.display = 'none';
    giftRegistered.style.display = 'block';
  } else {
    giftForm.style.display = 'block';
    giftRegistered.style.display = 'none';
  }

  // Update gift status list
  const giftStatusList = document.getElementById('gift-status-list');
  giftStatusList.innerHTML = party.players.map(p => `
    <li>
      ${p.name}
      <span class="gift-status">${p.hasGift ? '🎁' : '⏳'}</span>
    </li>
  `).join('');

  // Show start game button for host when all gifts are registered
  const allGiftsRegistered = party.players.every(p => p.hasGift);
  if (isHost && allGiftsRegistered) {
    hostStartGame.style.display = 'block';
  } else {
    hostStartGame.style.display = 'none';
  }
}

function updateGameScreen() {
  const isMyTurn = party.currentPlayerId === currentPlayerId;
  const currentPlayer = party.players.find(p => p.id === currentPlayerId);

  // Check if the last action was someone stealing FROM this player
  const lastAction = party.actions.length > 0 ? party.actions[party.actions.length - 1] : null;
  const wasJustStolen = isMyTurn &&
    lastAction &&
    lastAction.type === 'stolen' &&
    lastAction.fromPlayerId === currentPlayerId;

  // Update turn indicator
  document.getElementById('current-player-name').textContent = party.currentPlayerName || '???';

  // Update wrapped gifts
  const wrappedGifts = document.getElementById('wrapped-gifts');
  const unopenedGifts = party.gifts.filter(g => !g.opened);
  wrappedGifts.innerHTML = unopenedGifts.map(g => `
    <div class="gift-card wrapped" data-gift-id="${g.id}">
      <div class="gift-emoji">🎁</div>
      <div class="gift-name">???</div>
    </div>
  `).join('');

  if (unopenedGifts.length === 0) {
    wrappedGifts.innerHTML = '<p style="color: var(--text-secondary); font-size: 10px;">All gifts opened!</p>';
  }

  // Update opened gifts
  const openedGifts = document.getElementById('opened-gifts');
  const openedGiftsList = party.gifts.filter(g => g.opened);
  openedGifts.innerHTML = openedGiftsList.map(g => {
    const isLocked = g.stealCount >= g.maxSteals || g.id === party.lastStolenGiftId;
    const isMine = g.currentHolder === currentPlayerId;
    return `
      <div class="gift-card opened ${isLocked ? 'locked' : ''}" data-gift-id="${g.id}">
        ${g.stealCount > 0 ? `<span class="steal-count">${g.stealCount}/${g.maxSteals}</span>` : ''}
        <div class="gift-emoji">🎁</div>
        <div class="gift-name">${g.name}</div>
        ${g.description ? `<div class="gift-desc">${g.description}</div>` : ''}
        <div class="gift-holder">${isMine ? '(yours)' : g.currentHolderName}</div>
        <div class="gift-from">from ${g.broughtByName}</div>
      </div>
    `;
  }).join('');

  if (openedGiftsList.length === 0) {
    openedGifts.innerHTML = '<p style="color: var(--text-secondary); font-size: 10px;">No gifts opened yet!</p>';
  }

  // Update turn actions
  const yourTurnActions = document.getElementById('your-turn-actions');
  const stolenTurnActions = document.getElementById('stolen-turn-actions');

  yourTurnActions.style.display = 'none';
  stolenTurnActions.style.display = 'none';

  if (isMyTurn) {
    if (wasJustStolen) {
      stolenTurnActions.style.display = 'block';
      // Disable steal back if the stolen gift can't be stolen
      const stolenStealBtn = document.getElementById('stolen-steal');
      const canStealAny = party.gifts.some(g =>
        g.opened &&
        g.currentHolder !== currentPlayerId &&
        g.stealCount < g.maxSteals &&
        g.id !== party.lastStolenGiftId
      );
      stolenStealBtn.disabled = !canStealAny;
    } else {
      yourTurnActions.style.display = 'block';
      // Check if there are gifts to steal
      const canSteal = party.gifts.some(g =>
        g.opened &&
        g.currentHolder !== currentPlayerId &&
        g.stealCount < g.maxSteals
      );
      document.getElementById('action-steal').disabled = !canSteal;
    }
  }

  // Update action log
  updateActionLog('action-log');
}

function updateActionLog(elementId) {
  const actionLog = document.getElementById(elementId);
  const actions = party.actions.slice().reverse();

  actionLog.innerHTML = actions.map(action => {
    switch (action.type) {
      case 'game_started':
        return `<div class="action action-start">Game started! Turn order: ${action.turnOrder.join(' → ')}</div>`;
      case 'opened':
        return `<div class="action action-open">${action.playerName} opened "${action.giftName}"!</div>`;
      case 'stolen':
        return `<div class="action action-steal">${action.playerName} stole "${action.giftName}" from ${action.fromPlayerName}!</div>`;
      case 'game_ended':
        return `<div class="action action-start">Game over!</div>`;
      default:
        return '';
    }
  }).join('');
}

function updateResultsScreen() {
  const endAction = party.actions.find(a => a.type === 'game_ended');
  const results = endAction?.results || [];

  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = results.map(r => `
    <li>
      <span class="player-name">${r.playerName}</span>
      <div class="gift-info">
        <div class="gift-got">🎁 ${r.giftName}</div>
        ${r.giftDescription ? `<div class="gift-desc">${r.giftDescription}</div>` : ''}
        <div class="gift-from">from ${r.broughtBy}</div>
      </div>
    </li>
  `).join('');

  updateActionLog('final-action-log');
}

function showGiftSelection(type) {
  selectingGiftFor = type;
  const modalTitle = document.getElementById('modal-title');
  const modalGifts = document.getElementById('modal-gifts');

  if (type === 'open') {
    modalTitle.textContent = 'Choose a Gift to Open';
    const unopenedGifts = party.gifts.filter(g => !g.opened);
    modalGifts.innerHTML = unopenedGifts.map(g => `
      <div class="gift-card wrapped" onclick="selectGift('${g.id}')">
        <div class="gift-emoji">🎁</div>
        <div class="gift-name">Mystery Gift</div>
      </div>
    `).join('');
  } else {
    modalTitle.textContent = 'Choose a Gift to Steal';
    const stealableGifts = party.gifts.filter(g =>
      g.opened &&
      g.currentHolder !== currentPlayerId &&
      g.stealCount < g.maxSteals &&
      g.id !== party.lastStolenGiftId
    );
    modalGifts.innerHTML = stealableGifts.map(g => `
      <div class="gift-card opened" onclick="selectGift('${g.id}')">
        <span class="steal-count">${g.stealCount}/${g.maxSteals}</span>
        <div class="gift-emoji">🎁</div>
        <div class="gift-name">${g.name}</div>
        ${g.description ? `<div class="gift-desc">${g.description}</div>` : ''}
        <div class="gift-holder">${g.currentHolderName}</div>
      </div>
    `).join('');
  }

  modal.style.display = 'flex';
}

window.selectGift = function(giftId) {
  if (selectingGiftFor === 'open') {
    openGift(giftId);
  } else {
    stealGift(giftId);
  }
};

function hideModal() {
  modal.style.display = 'none';
  selectingGiftFor = null;
}

function copyInviteLink() {
  const url = `${window.location.origin}?party=${currentPartyId}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copy-link-btn');
    btn.textContent = 'COPIED!';
    setTimeout(() => {
      btn.textContent = 'COPY LINK';
    }, 2000);
  });
}

function saveSession() {
  localStorage.setItem('whiteElephantSession', JSON.stringify({
    partyId: currentPartyId,
    playerId: currentPlayerId,
    isHost,
  }));
}

// Initialize the app
init();
