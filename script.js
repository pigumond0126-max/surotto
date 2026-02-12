const SYMBOLS = ['BIG7', 'REG7', 'BAR', 'CHERRY', 'BELL', 'GRAPE', 'REPLAY'];
const REEL_STRIPS = [
  ['REPLAY','BELL','GRAPE','CHERRY','GRAPE','BELL','BAR','GRAPE','BELL','CHERRY','GRAPE','BELL','BIG7','GRAPE','BELL','CHERRY','GRAPE','BELL','REG7','GRAPE','BELL'],
  ['REPLAY','BELL','GRAPE','CHERRY','GRAPE','BELL','BAR','GRAPE','BELL','CHERRY','GRAPE','BELL','BIG7','GRAPE','BELL','CHERRY','GRAPE','BELL','REG7','GRAPE','BELL'],
  ['REPLAY','BELL','GRAPE','CHERRY','GRAPE','BELL','BAR','GRAPE','BELL','CHERRY','GRAPE','BELL','BIG7','GRAPE','BELL','CHERRY','GRAPE','BELL','REG7','GRAPE','BELL']
];

const BONUS_TABLE = {
  1: { BIG: 240, REG: 149 },
  2: { BIG: 242, REG: 164 },
  3: { BIG: 246, REG: 198 },
  4: { BIG: 258, REG: 208 },
  5: { BIG: 272, REG: 249 },
  6: { BIG: 298, REG: 250 }
};

const GRAPE_TABLE = {
  1: 10485, 2: 10600, 3: 10800, 4: 11000, 5: 11200, 6: 11500
};

const NOTICE_TABLE = {
  1: { immediate: 60, after: 30, delay: 8, premium: 2 },
  2: { immediate: 58, after: 32, delay: 8, premium: 2 },
  3: { immediate: 56, after: 33, delay: 8, premium: 3 },
  4: { immediate: 54, after: 34, delay: 9, premium: 3 },
  5: { immediate: 52, after: 35, delay: 9, premium: 4 },
  6: { immediate: 50, after: 35, delay: 10, premium: 5 }
};

const DELAY_RATE = { 1: 8, 2: 9, 3: 9, 4: 10, 5: 11, 6: 12 };
const PREMIUM_RATE = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };
const REG_GRAPE = { 1: 0.87, 2: 0.88, 3: 0.89, 4: 0.91, 5: 0.93, 6: 0.95 };

const GAME_WAIT = 4100;
const SYMBOL_HEIGHT = 120;
const REEL_COUNT = 21;
const BUFFER_SYMBOLS = 5;

let state = {
  setting: 1,
  credits: 50,
  bet: 0,
  mode: 'NORMAL',
  internalRole: null,
  bonusType: null,
  bonusGames: 0,
  gogoLamp: false,
  delayCounter: 0,
  waveMode: 'NORMAL',
  regMode: false,
  waitTimer: 0,
  lastLeverTime: 0,
  spinning: false,
  stoppedReels: [false, false, false],
  reelPositions: [0, 0, 0],
  reelSpeeds: [0, 0, 0],
  reelTargets: [null, null, null],
  noticeType: null,
  gameCount: 0,
  bigCount: 0,
  regCount: 0,
  totalPayout: 0
};

const audio = {
  lever: new Audio(),
  stop: new Audio(),
  peka: new Audio(),
  spin: new Audio(),
  payout: new Audio()
};

function init() {
  createReelStrips();
  updateDisplays();
  
  document.getElementById('betBtn').addEventListener('click', () => bet(1));
  document.getElementById('maxBetBtn').addEventListener('click', () => bet(3));
  document.getElementById('leverBtn').addEventListener('click', startGame);
  document.getElementById('stopBtn1').addEventListener('click', () => stopReel(0));
  document.getElementById('stopBtn2').addEventListener('click', () => stopReel(1));
  document.getElementById('stopBtn3').addEventListener('click', () => stopReel(2));
  document.getElementById('settingSelect').addEventListener('change', (e) => {
    state.setting = parseInt(e.target.value);
  });
  
  gameLoop();
}

function createReelStrips() {
  for (let i = 0; i < 3; i++) {
    const strip = document.querySelectorAll('.reel-strip')[i];
    strip.innerHTML = '';
    
    const extendedStrip = [
      ...REEL_STRIPS[i].slice(-BUFFER_SYMBOLS),
      ...REEL_STRIPS[i],
      ...REEL_STRIPS[i],
      ...REEL_STRIPS[i].slice(0, BUFFER_SYMBOLS)
    ];
    
    extendedStrip.forEach(sym => {
      const div = document.createElement('div');
      div.className = `symbol ${sym.toLowerCase()}`;
      div.textContent = getSymbolChar(sym);
      strip.appendChild(div);
    });
  }
}

function getSymbolChar(sym) {
  const chars = {
    'BIG7': '7',
    'REG7': '7',
    'BAR': 'BAR',
    'CHERRY': '🍒',
    'BELL': '🔔',
    'GRAPE': '🍇',
    'REPLAY': 'RP'
  };
  return chars[sym] || sym;
}

function bet(amount) {
  if (state.spinning || state.mode === 'BIG' || state.mode === 'REG') return;
  if (state.credits < amount) return;
  
  state.credits -= amount;
  state.bet = amount;
  updateDisplays();
}

function getRandom() {
  return Math.floor(Math.random() * 65536);
}

function lottery() {
  const rnd = getRandom();
  const setting = state.setting;
  
  let cumulative = 0;
  
  cumulative += BONUS_TABLE[setting].BIG;
  if (rnd < cumulative) return { role: 'BIG', subtype: 'single' };
  
  cumulative += BONUS_TABLE[setting].REG;
  if (rnd < cumulative) return { role: 'REG', subtype: 'single' };
  
  cumulative += Math.floor(BONUS_TABLE[setting].BIG * 0.3);
  if (rnd < cumulative) return { role: 'BIG', subtype: 'cherry' };
  
  cumulative += Math.floor(BONUS_TABLE[setting].REG * 0.3);
  if (rnd < cumulative) return { role: 'REG', subtype: 'cherry' };
  
  cumulative += GRAPE_TABLE[setting];
  if (rnd < cumulative) return { role: 'GRAPE', subtype: 'single' };
  
  cumulative += 2000;
  if (rnd < cumulative) return { role: 'BELL', subtype: 'single' };
  
  cumulative += 3000;
  if (rnd < cumulative) return { role: 'CHERRY', subtype: 'single' };
  
  cumulative += 8978;
  if (rnd < cumulative) return { role: 'REPLAY', subtype: 'single' };
  
  return { role: 'LOSE', subtype: 'single' };
}

function determineNotice() {
  const rnd = Math.floor(Math.random() * 100);
  const table = NOTICE_TABLE[state.setting];
  let cumulative = 0;
  
  cumulative += table.immediate;
  if (rnd < cumulative) return 'IMMEDIATE';
  
  cumulative += table.after;
  if (rnd < cumulative) return 'AFTER';
  
  cumulative += table.delay;
  if (rnd < cumulative) return 'DELAY';
  
  return 'PREMIUM';
}

function startGame() {
  if (state.bet === 0 && state.mode === 'NORMAL') return;
  if (state.spinning) return;
  
  const now = Date.now();
  if (now - state.lastLeverTime < GAME_WAIT) return;
  
  state.lastLeverTime = now;
  state.waitTimer = now + GAME_WAIT;
  
  if (state.mode === 'NORMAL') {
    const result = lottery();
    state.internalRole = result.role;
    
    if (result.role === 'BIG' || result.role === 'REG') {
      state.noticeType = determineNotice();
      
      const delayChance = Math.floor(Math.random() * 100);
      if (delayChance < DELAY_RATE[state.setting]) {
        state.delayCounter = Math.random() < 0.5 ? 0.3 : 0.5;
      }
    }
  } else if (state.mode === 'BIG' || state.mode === 'REG') {
    if (state.mode === 'REG') {
      const grapeRate = REG_GRAPE[state.setting];
      state.internalRole = Math.random() < grapeRate ? 'GRAPE' : 'BELL';
    } else {
      state.internalRole = Math.random() < 0.95 ? 'GRAPE' : 'BELL';
    }
  }
  
  state.spinning = true;
  state.stoppedReels = [false, false, false];
  state.reelTargets = [null, null, null];
  
  if (state.noticeType === 'IMMEDIATE') {
    activateGogoLamp();
  }
  
  const delay = state.delayCounter > 0 ? state.delayCounter * 1000 : 0;
  
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      state.reelSpeeds[i] = 40;
      document.getElementById(`stopBtn${i + 1}`).disabled = false;
      document.getElementById(`stopBtn${i + 1}`).classList.add('active');
    }
    
    state.delayCounter = 0;
  }, delay);
  
  document.getElementById('leverBtn').disabled = true;
}

function stopReel(index) {
  if (state.stoppedReels[index]) return;
  if (!state.spinning) return;
  
  state.stoppedReels[index] = true;
  document.getElementById(`stopBtn${index + 1}`).disabled = true;
  document.getElementById(`stopBtn${index + 1}`).classList.remove('active');
  
  const target = determineStopPosition(index);
  state.reelTargets[index] = target;
  
  const stoppedCount = state.stoppedReels.filter(s => s).length;
  
  if (stoppedCount === 3 && state.noticeType === 'DELAY') {
    const premiumChance = Math.floor(Math.random() * 100);
    if (premiumChance < PREMIUM_RATE[state.setting]) {
      setTimeout(() => {
        flashPremium();
        setTimeout(() => activateGogoLamp(), 500);
      }, 300);
    } else {
      setTimeout(() => activateGogoLamp(), 300);
    }
  }
  
  if (stoppedCount === 2 && state.noticeType === 'AFTER') {
    setTimeout(() => activateGogoLamp(), 200);
  }
  
  if (stoppedCount === 3) {
    setTimeout(() => checkResult(), 500);
  }
}

function determineStopPosition(reelIndex) {
  const role = state.internalRole;
  let targetSymbol = null;
  
  if (role === 'BIG') targetSymbol = 'BIG7';
  else if (role === 'REG') targetSymbol = 'REG7';
  else if (role === 'GRAPE') targetSymbol = 'GRAPE';
  else if (role === 'BELL') targetSymbol = 'BELL';
  else if (role === 'CHERRY' && reelIndex === 0) targetSymbol = 'CHERRY';
  else if (role === 'REPLAY') targetSymbol = 'REPLAY';
  else {
    const randomPos = Math.floor(Math.random() * REEL_COUNT);
    return randomPos;
  }
  
  const strip = REEL_STRIPS[reelIndex];
  const currentPos = Math.floor(state.reelPositions[reelIndex] / SYMBOL_HEIGHT) % REEL_COUNT;
  
  for (let pull = 0; pull <= 4; pull++) {
    const checkPos = (currentPos + pull) % REEL_COUNT;
    if (strip[checkPos] === targetSymbol) {
      return checkPos;
    }
  }
  
  return Math.floor(Math.random() * REEL_COUNT);
}

function activateGogoLamp() {
  state.gogoLamp = true;
  const lamp = document.querySelector('.gogo-lamp');
  lamp.classList.add('active');
}

function deactivateGogoLamp() {
  state.gogoLamp = false;
  const lamp = document.querySelector('.gogo-lamp');
  lamp.classList.remove('active');
}

function flashPremium() {
  const lamp = document.querySelector('.gogo-lamp');
  lamp.style.background = '#000';
  setTimeout(() => {
    lamp.style.background = '';
  }, 50);
}

function checkResult() {
  state.spinning = false;
  document.getElementById('leverBtn').disabled = false;
  
  const visibleSymbols = getVisibleSymbols();
  const centerLine = [visibleSymbols[0][1], visibleSymbols[1][1], visibleSymbols[2][1]];
  
  let payout = 0;
  let modeChange = false;
  
  if (centerLine[0] === 'BIG7' && centerLine[1] === 'BIG7' && centerLine[2] === 'BIG7') {
    payout = 15;
    state.mode = 'BIG';
    state.bonusGames = 30;
    state.bonusType = 'BIG';
    state.bigCount++;
    modeChange = true;
  } else if (centerLine[0] === 'REG7' && centerLine[1] === 'REG7' && centerLine[2] === 'REG7') {
    payout = 15;
    state.mode = 'REG';
    state.bonusGames = 8;
    state.bonusType = 'REG';
    state.regCount++;
    modeChange = true;
  } else if (centerLine.filter(s => s === 'GRAPE').length === 3) {
    payout = 8;
  } else if (centerLine.filter(s => s === 'BELL').length === 3) {
    payout = 10;
  } else if (centerLine[0] === 'CHERRY') {
    payout = 2;
  } else if (centerLine.filter(s => s === 'REPLAY').length === 3) {
    payout = state.bet;
  }
  
  state.credits += payout;
  state.totalPayout += payout;
  
  if (state.mode === 'BIG' || state.mode === 'REG') {
    state.bonusGames--;
    if (state.bonusGames === 0) {
      state.mode = 'NORMAL';
      state.bonusType = null;
      deactivateGogoLamp();
    }
  } else {
    deactivateGogoLamp();
  }
  
  if (state.mode === 'NORMAL') {
    state.bet = 0;
  }
  
  state.gameCount++;
  updateDisplays();
}

function getVisibleSymbols() {
  const result = [];
  for (let i = 0; i < 3; i++) {
    const pos = Math.floor(state.reelPositions[i] / SYMBOL_HEIGHT);
    const strip = REEL_STRIPS[i];
    const symbols = [];
    for (let j = 0; j < 3; j++) {
      const index = (pos + j + BUFFER_SYMBOLS) % (REEL_COUNT + BUFFER_SYMBOLS * 2);
      const actualIndex = index % REEL_COUNT;
      symbols.push(strip[actualIndex]);
    }
    result.push(symbols);
  }
  return result;
}

function updateDisplays() {
  document.getElementById('credit').textContent = String(state.credits).padStart(3, '0');
  document.getElementById('payout').textContent = String(state.totalPayout).padStart(2, '0');
  const totalBonus = state.bigCount + state.regCount;
  document.getElementById('count').textContent = String(totalBonus).padStart(3, '0');
  
  if (state.mode === 'BIG' || state.mode === 'REG') {
    const buttons = document.querySelectorAll('.btn-stop');
    buttons.forEach(btn => btn.classList.add('bonus-active'));
  } else {
    const buttons = document.querySelectorAll('.btn-stop');
    buttons.forEach(btn => btn.classList.remove('bonus-active'));
  }
}

function gameLoop() {
  for (let i = 0; i < 3; i++) {
    if (state.spinning && !state.stoppedReels[i] && state.reelSpeeds[i] > 0) {
      state.reelPositions[i] += state.reelSpeeds[i];
      
      const totalSymbols = REEL_COUNT + BUFFER_SYMBOLS * 2;
      const maxPosition = totalSymbols * SYMBOL_HEIGHT;
      
      if (state.reelPositions[i] >= maxPosition) {
        state.reelPositions[i] -= REEL_COUNT * SYMBOL_HEIGHT;
      }
    }
    
    if (state.stoppedReels[i] && state.reelTargets[i] !== null) {
      const targetPosition = (state.reelTargets[i] + BUFFER_SYMBOLS) * SYMBOL_HEIGHT;
      const currentPosition = state.reelPositions[i];
      const diff = targetPosition - currentPosition;
      
      if (Math.abs(diff) < 5) {
        state.reelPositions[i] = targetPosition;
        state.reelSpeeds[i] = 0;
        state.reelTargets[i] = null;
      } else {
        const deceleration = 0.85;
        state.reelSpeeds[i] = Math.max(2, state.reelSpeeds[i] * deceleration);
        state.reelPositions[i] += state.reelSpeeds[i];
      }
    }
    
    const strip = document.querySelectorAll('.reel-strip')[i];
    strip.style.transform = `translateY(${-state.reelPositions[i]}px)`;
  }
  
  requestAnimationFrame(gameLoop);
}

init();
