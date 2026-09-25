const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD_WIDTH = 900;
const WORLD_HEIGHT = 1200;
const LANES = [170, 450, 730];
const PLAYER_BASE_Y = 1008;
const GRAVITY = 2500;
const JUMP_VELOCITY = -1000;
const BOOST_DURATION = 5;
const PHASES = [
  {
    name: 'ÓRBITA BAIXA',
    sector: 'SETOR 01',
    description: 'Uma rota tranquila para aprender os controles.',
    difficulty: 0,
    goal: 8,
    baseSpeed: 300,
    speedIncrease: 150,
    reward: 500,
    skyTop: '#080923',
    skyMiddle: '#10113b',
    accent: '#63efff'
  },
  {
    name: 'CINTURÃO DE ASTEROIDES',
    sector: 'SETOR 02',
    description: 'Detritos densos exigem mudanças rápidas de órbita.',
    difficulty: 0.28,
    goal: 10,
    baseSpeed: 330,
    speedIncrease: 180,
    reward: 750,
    skyTop: '#110b2e',
    skyMiddle: '#23124a',
    accent: '#b78cff'
  },
  {
    name: 'FRONTEIRA VIOLETA',
    sector: 'SETOR 03',
    description: 'Lasers e drones cruzam a galáxia em alta velocidade.',
    difficulty: 0.55,
    goal: 12,
    baseSpeed: 360,
    speedIncrease: 205,
    reward: 1000,
    skyTop: '#170d38',
    skyMiddle: '#3b1554',
    accent: '#ff72b7'
  },
  {
    name: 'COLAPSO DO NÚCLEO',
    sector: 'SETOR 04',
    description: 'A rota final combina todos os perigos da galáxia.',
    difficulty: 0.8,
    goal: 15,
    baseSpeed: 390,
    speedIncrease: 235,
    reward: 1500,
    skyTop: '#210d2d',
    skyMiddle: '#4b153e',
    accent: '#ffd166'
  }
];
const OBJECT_CYCLES = [
  { name: 'CRISTAIS', accent: '#63efff', types: ['asteroid', 'drone', 'laser'] },
  { name: 'SATÉLITES', accent: '#9e78ff', types: ['satellite', 'asteroid', 'laser'] },
  { name: 'COMETAS', accent: '#ff72b7', types: ['comet', 'drone', 'laser'] }
];
const OBJECT_CHANGE_INTERVAL = 8;
const PROGRESS_STORAGE_KEY = 'orbita-run-progress';
const PREFERENCES_STORAGE_KEY = 'orbita-run-preferences';

const ui = {
  frame: document.getElementById('gameFrame'),
  hud: document.getElementById('gameHud'),
  distance: document.getElementById('distanceValue'),
  score: document.getElementById('scoreValue'),
  energy: document.getElementById('energyValue'),
  phaseValue: document.getElementById('phaseValue'),
  phaseName: document.getElementById('phaseName'),
  objectModeValue: document.getElementById('objectModeValue'),
  menuPhaseValue: document.getElementById('menuPhaseValue'),
  menuCameraButton: document.getElementById('menuCameraButton'),
  menuCameraValue: document.getElementById('menuCameraValue'),
  cameraToggle: document.getElementById('cameraToggle'),
  cameraModeValue: document.getElementById('cameraModeValue'),
  boostFill: document.getElementById('boostFill'),
  boostLabel: document.getElementById('boostLabel'),
  missionValue: document.getElementById('missionValue'),
  missionFill: document.getElementById('missionFill'),
  missionRewardValue: document.getElementById('missionRewardValue'),
  phaseProgressValue: document.getElementById('phaseProgressValue'),
  missionToast: document.getElementById('missionToast'),
  startScreen: document.getElementById('startScreen'),
  phasesScreen: document.getElementById('phasesScreen'),
  accessibilityScreen: document.getElementById('accessibilityScreen'),
  howToPlayScreen: document.getElementById('howToPlayScreen'),
  pauseScreen: document.getElementById('pauseScreen'),
  missionCompleteScreen: document.getElementById('missionCompleteScreen'),
  gameoverScreen: document.getElementById('gameoverScreen'),
  phaseGrid: document.getElementById('phaseGrid'),
  startButton: document.getElementById('startButton'),
  choosePhaseButton: document.getElementById('choosePhaseButton'),
  accessibilityButton: document.getElementById('accessibilityButton'),
  howToPlayButton: document.getElementById('howToPlayButton'),
  closePhasesButton: document.getElementById('closePhasesButton'),
  closeAccessibilityButton: document.getElementById('closeAccessibilityButton'),
  closeHelpButton: document.getElementById('closeHelpButton'),
  continueMissionButton: document.getElementById('continueMissionButton'),
  missionMapButton: document.getElementById('missionMapButton'),
  completeEnergy: document.getElementById('completeEnergy'),
  completeReward: document.getElementById('completeReward'),
  pauseButton: document.getElementById('pauseButton'),
  resumeButton: document.getElementById('resumeButton'),
  quitButton: document.getElementById('quitButton'),
  restartButton: document.getElementById('restartButton'),
  gameoverMenuButton: document.getElementById('gameoverMenuButton'),
  soundButton: document.getElementById('soundButton'),
  soundState: document.getElementById('soundState'),
  contrastToggle: document.getElementById('contrastToggle'),
  textToggle: document.getElementById('textToggle'),
  motionToggle: document.getElementById('motionToggle'),
  soundToggle: document.getElementById('soundToggle'),
  bestScore: document.getElementById('bestScoreValue'),
  finalScore: document.getElementById('finalScore'),
  finalDistance: document.getElementById('finalDistance'),
  finalEnergy: document.getElementById('finalEnergy'),
  finalBest: document.getElementById('finalBest'),
  gameoverMessage: document.getElementById('gameoverMessage')
};

const preferences = loadPreferences();
const phaseProgress = loadPhaseProgress();

const state = {
  mode: 'menu',
  elapsed: 0,
  visualTime: 0,
  distance: 0,
  score: 0,
  energy: 0,
  best: loadBest(),
  phaseIndex: 0,
  selectedPhase: 0,
  unlockedPhase: phaseProgress.unlocked,
  completedPhases: phaseProgress.completed,
  missionGoal: PHASES[0].goal,
  speed: PHASES[0].baseSpeed,
  objectCycleIndex: 0,
  objectCycleTime: 0,
  missionPrompt: false,
  worldOffset: 0,
  spawnTimer: 1,
  waveCount: 0,
  lastWaveType: -1,
  combo: 0,
  comboTimer: 0,
  boostTimer: 0,
  missionComplete: false,
  hitFlash: 0,
  shake: 0,
  hudTimer: 0
};

let player = createPlayer();
let obstacles = [];
let pickups = [];
let powerups = [];
let particles = [];
let floaters = [];
let stars = createStars(150);
let lastTime = performance.now();
let toastTimer = 0;
let audioContext = null;
let soundEnabled = preferences.sound !== false;

function createPlayer() {
  return {
    lane: 1,
    x: LANES[1],
    jumpOffset: 0,
    jumpVelocity: 0,
    sliding: false,
    slideTimer: 0,
    invulnerability: 0,
    shield: false,
    rotation: 0
  };
}

function createStars(count) {
  const list = [];
  for (let index = 0; index < count; index += 1) {
    list.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      size: Math.random() * 2.4 + 0.35,
      depth: Math.random() * 0.8 + 0.2,
      alpha: Math.random() * 0.72 + 0.18,
      twinkle: Math.random() * Math.PI * 2,
      tint: Math.random() > 0.74 ? '#a68cff' : '#d9f6ff'
    });
  }
  return list;
}

function loadBest() {
  try {
    return Number(window.localStorage.getItem('orbita-run-best') || 0);
  } catch (error) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('orbita-run-best', String(value));
  } catch (error) {
    return;
  }
}

function loadPreferences() {
  const systemReduceMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults = {
    highContrast: false,
    largeText: false,
    reduceMotion: Boolean(systemReduceMotion),
    sound: true,
    firstPerson: false
  };
  try {
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') {
      return defaults;
    }
    return {
      highContrast: Boolean(stored.highContrast),
      largeText: Boolean(stored.largeText),
      reduceMotion: Boolean(stored.reduceMotion),
      sound: stored.sound !== false,
      firstPerson: Boolean(stored.firstPerson)
    };
  } catch (error) {
    return defaults;
  }
}

function savePreferences() {
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    return;
  }
}

function loadPhaseProgress() {
  const defaults = { unlocked: 0, completed: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') {
      return defaults;
    }
    const unlocked = clamp(Number(stored.unlocked) || 0, 0, PHASES.length - 1);
    const completed = Array.isArray(stored.completed)
      ? stored.completed.filter((index) => Number.isInteger(index) && index >= 0 && index < PHASES.length)
      : [];
    return { unlocked, completed };
  } catch (error) {
    return defaults;
  }
}

function savePhaseProgress() {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      unlocked: state.unlockedPhase,
      completed: state.completedPhases
    }));
  } catch (error) {
    return;
  }
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(bounds.width * dpr));
  canvas.height = Math.max(1, Math.floor(bounds.height * dpr));
  ctx.setTransform(canvas.width / WORLD_WIDTH, 0, 0, canvas.height / WORLD_HEIGHT, 0, 0);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function formatScore(value) {
  return Math.floor(value).toString().padStart(6, '0');
}

function formatDistance(value) {
  return `${Math.floor(value).toString().padStart(4, '0')} m`;
}

function showToast(message, duration = 1500) {
  ui.missionToast.textContent = message;
  ui.missionToast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    ui.missionToast.classList.remove('show');
  }, duration);
}

function updateHud() {
  const phase = PHASES[state.phaseIndex];
  const objectCycle = OBJECT_CYCLES[state.objectCycleIndex];
  const missionProgress = Math.min(state.energy, state.missionGoal);
  const completedCount = new Set(state.completedPhases).size;
  const cameraLabel = preferences.firstPerson ? '1ª PESSOA' : '3ª PESSOA';
  ui.phaseValue.textContent = phase.sector;
  ui.phaseName.textContent = phase.name;
  ui.objectModeValue.textContent = `OBJETOS: ${objectCycle.name}`;
  ui.menuPhaseValue.textContent = `${phase.sector} · ${phase.name}`;
  ui.menuCameraValue.textContent = cameraLabel;
  ui.cameraModeValue.textContent = cameraLabel;
  ui.cameraToggle.setAttribute('aria-pressed', String(preferences.firstPerson));
  ui.distance.textContent = formatDistance(state.distance);
  ui.score.textContent = formatScore(state.score);
  ui.energy.textContent = `${missionProgress} / ${state.missionGoal}`;
  ui.missionValue.textContent = `${missionProgress} / ${state.missionGoal}`;
  ui.missionFill.style.width = `${(missionProgress / state.missionGoal) * 100}%`;
  ui.missionRewardValue.textContent = `+${phase.reward} PTS`;
  ui.phaseProgressValue.textContent = `${completedCount} / ${PHASES.length}`;
  ui.boostFill.style.width = `${(state.boostTimer / BOOST_DURATION) * 100}%`;
  ui.boostLabel.textContent = state.boostTimer > 0 ? `IMPULSO ${state.boostTimer.toFixed(1)}s` : 'IMPULSO';
  ui.bestScore.textContent = formatScore(state.best);
}

function setScreen(screen, visible) {
  screen.classList.toggle('hidden', !visible);
}

function focusElement(element) {
  if (element) {
    window.setTimeout(() => element.focus(), 0);
  }
}

function openPhases() {
  if (state.mode !== 'menu') {
    return;
  }
  setScreen(ui.startScreen, false);
  setScreen(ui.phasesScreen, true);
  renderPhaseGrid();
  focusElement(ui.closePhasesButton);
}

function closePhases() {
  setScreen(ui.phasesScreen, false);
  setScreen(ui.startScreen, true);
  updateHud();
  focusElement(ui.choosePhaseButton);
}

function openAccessibility() {
  if (state.mode !== 'menu') {
    return;
  }
  setScreen(ui.startScreen, false);
  setScreen(ui.accessibilityScreen, true);
  updatePreferenceUi();
  focusElement(ui.contrastToggle);
}

function closeAccessibility() {
  setScreen(ui.accessibilityScreen, false);
  setScreen(ui.startScreen, true);
  focusElement(ui.accessibilityButton);
}

function openHowToPlay() {
  if (state.mode !== 'menu') {
    return;
  }
  setScreen(ui.startScreen, false);
  setScreen(ui.howToPlayScreen, true);
  focusElement(ui.closeHelpButton);
}

function closeHowToPlay() {
  setScreen(ui.howToPlayScreen, false);
  setScreen(ui.startScreen, true);
  focusElement(ui.howToPlayButton);
}

function closeMenuOverlay() {
  const overlays = [ui.phasesScreen, ui.accessibilityScreen, ui.howToPlayScreen];
  const openOverlay = overlays.find((screen) => !screen.classList.contains('hidden'));
  if (!openOverlay) {
    return false;
  }
  setScreen(ui.phasesScreen, false);
  setScreen(ui.accessibilityScreen, false);
  setScreen(ui.howToPlayScreen, false);
  setScreen(ui.startScreen, true);
  updateHud();
  focusElement(ui.startButton);
  return true;
}

function renderPhaseGrid() {
  ui.phaseGrid.innerHTML = '';
  PHASES.forEach((phase, index) => {
    const locked = index > state.unlockedPhase;
    const completed = state.completedPhases.includes(index);
    const selected = index === state.phaseIndex;
    const card = document.createElement('article');
    card.className = `phase-card${selected ? ' selected' : ''}${locked ? ' locked' : ''}`;
    card.tabIndex = locked ? -1 : 0;
    card.setAttribute('aria-label', `${phase.sector}, ${phase.name}${locked ? ', bloqueada' : ''}`);
    card.innerHTML = `
      <div class="phase-card-top">
        <span class="phase-number">${phase.sector}</span>
        <span class="phase-status${locked ? ' locked' : ''}">${locked ? 'BLOQUEADA' : completed ? 'CONCLUÍDA' : 'DISPONÍVEL'}</span>
      </div>
      <h3>${phase.name}</h3>
      <p>${phase.description}</p>
      <div class="phase-card-bottom">
        <small>${phase.goal} CRISTAIS · +${phase.reward} PTS</small>
        <button class="phase-start" type="button" ${locked ? 'disabled' : ''}>${locked ? 'BLOQUEADA' : 'JOGAR'}</button>
      </div>
    `;
    if (!locked) {
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) {
          return;
        }
        state.phaseIndex = index;
        state.selectedPhase = index;
        state.missionGoal = phase.goal;
        renderPhaseGrid();
        updateHud();
      });
      card.addEventListener('keydown', (event) => {
        if (event.target.closest('button')) {
          return;
        }
        if (event.code === 'Enter' || event.code === 'Space') {
          event.preventDefault();
          state.phaseIndex = index;
          state.selectedPhase = index;
          state.missionGoal = phase.goal;
          renderPhaseGrid();
          updateHud();
        }
      });
      card.querySelector('.phase-start').addEventListener('click', () => beginGame(index));
    }
    ui.phaseGrid.appendChild(card);
  });
  const completedCount = new Set(state.completedPhases).size;
  ui.phaseProgressValue.textContent = `${completedCount} / ${PHASES.length}`;
}

function unlockNextPhase() {
  const phaseIndex = state.phaseIndex;
  if (!state.completedPhases.includes(phaseIndex)) {
    state.completedPhases.push(phaseIndex);
  }
  const nextPhase = Math.min(phaseIndex + 1, PHASES.length - 1);
  if (nextPhase > state.unlockedPhase) {
    state.unlockedPhase = nextPhase;
  }
  savePhaseProgress();
  renderPhaseGrid();
}

function beginGame(phaseIndex = state.phaseIndex) {
  const safeIndex = Number.isFinite(Number(phaseIndex))
    ? clamp(Math.round(Number(phaseIndex)), 0, PHASES.length - 1)
    : state.phaseIndex;
  initializeAudio();
  resetGame(safeIndex);
  [
    ui.startScreen,
    ui.phasesScreen,
    ui.accessibilityScreen,
    ui.howToPlayScreen,
    ui.pauseScreen,
    ui.missionCompleteScreen,
    ui.gameoverScreen
  ].forEach((screen) => setScreen(screen, false));
  ui.hud.classList.add('visible');
  ui.hud.setAttribute('aria-hidden', 'false');
  ui.pauseButton.disabled = false;
  ui.pauseButton.textContent = 'PAUSA';
  showToast(`MISSÃO INICIADA · ${PHASES[safeIndex].sector}`, 1500);
  playTone(420, 0.12, 'triangle', 0.045);
  window.setTimeout(() => playTone(680, 0.16, 'triangle', 0.04), 80);
  updateHud();
}

function resetGame(phaseIndex = state.phaseIndex) {
  const numericPhase = Number(phaseIndex);
  const safeIndex = Number.isFinite(numericPhase)
    ? clamp(Math.round(numericPhase), 0, PHASES.length - 1)
    : state.phaseIndex;
  const phase = PHASES[safeIndex];
  state.mode = 'playing';
  state.elapsed = 0;
  state.distance = 0;
  state.score = 0;
  state.energy = 0;
  state.phaseIndex = safeIndex;
  state.selectedPhase = safeIndex;
  state.missionGoal = phase.goal;
  state.speed = phase.baseSpeed;
  state.worldOffset = 0;
  state.spawnTimer = 1.15;
  state.waveCount = 0;
  state.lastWaveType = -1;
  state.combo = 0;
  state.comboTimer = 0;
  state.boostTimer = 0;
  state.missionComplete = false;
  state.missionPrompt = false;
  state.objectCycleIndex = 0;
  state.objectCycleTime = 0;
  state.hitFlash = 0;
  state.shake = 0;
  state.hudTimer = 0;
  player = createPlayer();
  obstacles = [];
  pickups = [];
  powerups = [];
  particles = [];
  floaters = [];
  addPickup(1, 310);
  addPickup(0, 555);
  addPickup(2, 800);
}

function returnToMenu() {
  state.mode = 'menu';
  state.distance = 0;
  state.score = 0;
  state.energy = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.boostTimer = 0;
  state.missionComplete = false;
  state.missionPrompt = false;
  state.phaseIndex = state.selectedPhase;
  state.missionGoal = PHASES[state.phaseIndex].goal;
  player = createPlayer();
  obstacles = [];
  pickups = [];
  powerups = [];
  particles = [];
  floaters = [];
  ui.hud.classList.remove('visible');
  ui.hud.setAttribute('aria-hidden', 'true');
  ui.pauseButton.disabled = true;
  ui.pauseButton.textContent = 'PAUSA';
  [
    ui.pauseScreen,
    ui.missionCompleteScreen,
    ui.gameoverScreen,
    ui.phasesScreen,
    ui.accessibilityScreen,
    ui.howToPlayScreen
  ].forEach((screen) => setScreen(screen, false));
  setScreen(ui.startScreen, true);
  renderPhaseGrid();
  updateHud();
}

function pauseGame() {
  if (state.mode !== 'playing') {
    return;
  }
  state.mode = 'paused';
  setScreen(ui.pauseScreen, true);
  ui.pauseButton.textContent = 'CONTINUAR';
  playTone(250, 0.12, 'sine', 0.035);
}

function resumeGame() {
  if (state.mode !== 'paused') {
    return;
  }
  state.mode = 'playing';
  setScreen(ui.pauseScreen, false);
  ui.pauseButton.textContent = 'PAUSA';
  playTone(520, 0.12, 'sine', 0.035);
}

function togglePause() {
  if (state.mode === 'playing') {
    pauseGame();
  } else if (state.mode === 'paused') {
    resumeGame();
  }
}

function endGame() {
  if (state.mode !== 'playing') {
    return;
  }
  state.mode = 'over';
  state.hitFlash = 1;
  state.shake = 0.35;
  const finalScore = Math.floor(state.score);
  if (finalScore > state.best) {
    state.best = finalScore;
    saveBest(state.best);
  }
  ui.finalScore.textContent = formatScore(finalScore);
  ui.finalDistance.textContent = formatDistance(state.distance);
  ui.finalEnergy.textContent = `${Math.min(state.energy, state.missionGoal)}`;
  ui.finalBest.textContent = formatScore(state.best);
  ui.gameoverMessage.textContent = state.energy >= state.missionGoal
    ? 'Missão cumprida, piloto. A próxima rota está esperando por você.'
    : 'A próxima rota está esperando por você. Recarregue e tente de novo.';
  ui.hud.classList.remove('visible');
  ui.hud.setAttribute('aria-hidden', 'true');
  ui.pauseButton.disabled = true;
  ui.pauseButton.textContent = 'PAUSA';
  setScreen(ui.gameoverScreen, true);
  playTone(150, 0.32, 'sawtooth', 0.045);
  updateHud();
}

function showMissionCompleteScreen() {
  state.mode = 'mission-complete';
  state.missionPrompt = true;
  const phase = PHASES[state.phaseIndex];
  ui.completeEnergy.textContent = `${Math.min(state.energy, state.missionGoal)} / ${state.missionGoal}`;
  ui.completeReward.textContent = `+${phase.reward} PTS`;
  setScreen(ui.missionCompleteScreen, true);
  ui.pauseButton.disabled = true;
  ui.pauseButton.textContent = 'PAUSA';
  focusElement(ui.continueMissionButton);
}

function continueMission() {
  if (state.mode !== 'mission-complete') {
    return;
  }
  state.mode = 'playing';
  state.missionPrompt = false;
  setScreen(ui.missionCompleteScreen, false);
  ui.pauseButton.disabled = false;
  ui.pauseButton.textContent = 'PAUSA';
  lastTime = performance.now();
  showToast('MISSÃO ATIVA · CONTINUE SUA CORRIDA', 1500);
  updateHud();
}

function openMissionMap() {
  if (state.mode !== 'mission-complete') {
    return;
  }
  returnToMenu();
  openPhases();
}

function moveLane(direction) {
  if (state.mode !== 'playing') {
    return;
  }
  const nextLane = clamp(player.lane + direction, 0, LANES.length - 1);
  if (nextLane === player.lane) {
    return;
  }
  player.lane = nextLane;
  playTone(nextLane === 0 ? 310 : nextLane === 2 ? 390 : 350, 0.055, 'sine', 0.018);
}

function jump() {
  if (state.mode !== 'playing' || player.jumpOffset > 0 || player.jumpVelocity !== 0) {
    return;
  }
  player.sliding = false;
  player.slideTimer = 0;
  player.jumpVelocity = JUMP_VELOCITY;
  spawnThrusterBurst(8);
  playTone(620, 0.11, 'sine', 0.04);
}

function slide() {
  if (state.mode !== 'playing' || player.jumpOffset > 0 || player.jumpVelocity !== 0) {
    return;
  }
  player.sliding = true;
  player.slideTimer = 0.78;
  spawnThrusterBurst(5);
  playTone(210, 0.1, 'triangle', 0.035);
}

function performAction(action) {
  if (action === 'left') {
    moveLane(-1);
  } else if (action === 'right') {
    moveLane(1);
  } else if (action === 'jump') {
    jump();
  } else if (action === 'slide') {
    slide();
  }
}

function currentSpeed() {
  const phase = PHASES[state.phaseIndex];
  const distanceDifficulty = Math.min(state.distance / 1500, 1);
  return phase.baseSpeed + distanceDifficulty * phase.speedIncrease + (state.boostTimer > 0 ? 180 : 0);
}

function updatePlayer(dt) {
  if (player.jumpOffset > 0 || player.jumpVelocity !== 0) {
    player.jumpVelocity += GRAVITY * dt;
    player.jumpOffset += player.jumpVelocity * dt;
    if (player.jumpOffset >= 0) {
      player.jumpOffset = 0;
      player.jumpVelocity = 0;
    }
  }
  if (player.slideTimer > 0) {
    player.slideTimer -= dt;
    if (player.slideTimer <= 0) {
      player.sliding = false;
      player.slideTimer = 0;
    }
  }
  player.x = lerp(player.x, LANES[player.lane], Math.min(1, dt * 13));
  player.rotation = lerp(player.rotation, (LANES[player.lane] - player.x) * -0.006, Math.min(1, dt * 10));
  player.invulnerability = Math.max(0, player.invulnerability - dt);
}

function currentObjectCycle() {
  return OBJECT_CYCLES[state.objectCycleIndex];
}

function changeObjectCycle() {
  state.objectCycleIndex = (state.objectCycleIndex + 1) % OBJECT_CYCLES.length;
  state.objectCycleTime = 0;
  const cycle = currentObjectCycle();
  showToast(`OBJETOS MUDARAM · ${cycle.name}`, 1500);
  playTone(280 + state.objectCycleIndex * 90, 0.16, 'triangle', 0.03);
}

function updateGame(dt) {
  state.elapsed += dt;
  state.objectCycleTime += dt;
  if (state.objectCycleTime >= OBJECT_CHANGE_INTERVAL) {
    changeObjectCycle();
  }
  const speed = currentSpeed();
  state.speed = speed;
  state.worldOffset = (state.worldOffset + speed * dt) % 112;
  state.distance += speed * dt * 0.22;
  state.score += speed * dt * 0.08;
  state.hitFlash = Math.max(0, state.hitFlash - dt * 2.8);
  state.shake = Math.max(0, state.shake - dt * 2.5);
  state.boostTimer = Math.max(0, state.boostTimer - dt);
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer <= 0) {
    state.combo = 0;
  }
  updatePlayer(dt);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnWave();
  }

  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index];
    obstacle.y += speed * dt;
    obstacle.rotation += obstacle.rotationSpeed * dt;
    if (obstacle.y > WORLD_HEIGHT + 180) {
      obstacles.splice(index, 1);
      continue;
    }
    if (!obstacle.passed && obstacle.y > PLAYER_BASE_Y + 86) {
      obstacle.passed = true;
      if (!obstacle.hit) {
        state.score += 18;
        if (obstacle.type === 'laser' && player.sliding) {
          state.combo = Math.min(state.combo + 1, 8);
          state.comboTimer = 2.6;
          addFloater(player.x, PLAYER_BASE_Y - 135, 'PERFEITO', '#63efff');
        }
      }
    }
  }

  for (let index = pickups.length - 1; index >= 0; index -= 1) {
    if (state.mode !== 'playing') {
      break;
    }
    const pickup = pickups[index];
    pickup.y += speed * dt;
    pickup.rotation += dt * 2.6;
    if (pickup.y > WORLD_HEIGHT + 80) {
      pickups.splice(index, 1);
      continue;
    }
    if (collectibleAt(pickup.x, pickup.y, 45)) {
      pickups.splice(index, 1);
      collectEnergy();
    }
  }

  for (let index = powerups.length - 1; index >= 0; index -= 1) {
    if (state.mode !== 'playing') {
      break;
    }
    const powerup = powerups[index];
    powerup.y += speed * dt;
    powerup.rotation += dt * 1.7;
    if (powerup.y > WORLD_HEIGHT + 80) {
      powerups.splice(index, 1);
      continue;
    }
    if (collectibleAt(powerup.x, powerup.y, 55)) {
      powerups.splice(index, 1);
      activatePowerup(powerup.type);
    }
  }

  if (state.mode !== 'playing') {
    updateParticles(dt);
    updateFloaters(dt);
    return;
  }

  checkObstacleCollisions();
  updateParticles(dt);
  updateFloaters(dt);

  if (state.mode === 'playing') {
    state.hudTimer -= dt;
    if (state.hudTimer <= 0) {
      state.hudTimer = 0.07;
      updateHud();
    }
  }
}

function updateAmbient(dt) {
  state.visualTime += dt;
  const motionScale = preferences.reduceMotion ? 0.35 : 1;
  const drift = (state.mode === 'playing' ? currentSpeed() * 0.13 : 18) * motionScale;
  for (const star of stars) {
    star.y += drift * star.depth * dt;
    if (star.y > WORLD_HEIGHT + 10) {
      star.y = -10;
      star.x = Math.random() * WORLD_WIDTH;
    }
  }
  if (state.mode !== 'playing') {
    state.hitFlash = Math.max(0, state.hitFlash - dt * 2.8);
    state.shake = Math.max(0, state.shake - dt * 2.5);
    updateParticles(dt * (preferences.reduceMotion ? 0.2 : 0.55));
    updateFloaters(dt);
  }
}

function addObstacle(type, lane, y) {
  let obstacle;
  if (type === 'laser') {
    obstacle = {
      type,
      x: WORLD_WIDTH / 2,
      y,
      w: 770,
      h: 35,
      rotation: 0,
      rotationSpeed: 0,
      hit: false,
      passed: false
    };
  } else if (type === 'drone') {
    obstacle = {
      type,
      x: LANES[lane],
      y,
      w: 112,
      h: 82,
      rotation: 0,
      rotationSpeed: 0.5,
      hit: false,
      passed: false
    };
  } else if (type === 'satellite') {
    obstacle = {
      type,
      x: LANES[lane],
      y,
      w: 108,
      h: 72,
      rotation: 0,
      rotationSpeed: 0.8,
      hit: false,
      passed: false
    };
  } else if (type === 'comet') {
    obstacle = {
      type,
      x: LANES[lane],
      y,
      w: 78,
      h: 78,
      rotation: 0,
      rotationSpeed: -1.4,
      hit: false,
      passed: false
    };
  } else {
    obstacle = {
      type: 'asteroid',
      x: LANES[lane],
      y,
      w: randomBetween(88, 116),
      h: randomBetween(88, 116),
      rotation: Math.random() * Math.PI,
      rotationSpeed: randomBetween(-1.1, 1.1),
      hit: false,
      passed: false,
      shape: createAsteroidShape()
    };
  }
  obstacles.push(obstacle);
  return obstacle;
}

function createAsteroidShape() {
  const points = [];
  const count = 9;
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const radius = randomBetween(0.72, 1);
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

function addPickup(lane, y) {
  pickups.push({
    x: LANES[lane],
    y,
    rotation: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2,
    color: currentObjectCycle().accent
  });
}

function addPowerup(type, lane, y) {
  powerups.push({
    type,
    x: LANES[lane],
    y,
    rotation: 0,
    pulse: Math.random() * Math.PI * 2
  });
}

function themedObstacle(baseType) {
  const cycle = currentObjectCycle();
  if (baseType === 'laser' || cycle.types.includes(baseType)) {
    return baseType;
  }
  return cycle.types[0] === 'laser' ? 'asteroid' : cycle.types[0];
}

function spawnWave() {
  const phase = PHASES[state.phaseIndex];
  const difficulty = clamp(phase.difficulty + state.distance / 2600, 0, 1);
  let pattern = randomInt(0, difficulty > 0.38 ? 5 : 3);
  if (pattern === state.lastWaveType) {
    pattern = (pattern + 1) % (difficulty > 0.38 ? 6 : 4);
  }
  state.lastWaveType = pattern;
  state.waveCount += 1;
  const y = -145;

  if (pattern === 0) {
    const blockedLane = randomInt(0, 2);
    addObstacle(themedObstacle('asteroid'), blockedLane, y);
    addPickup((blockedLane + 1) % 3, y + 18);
  } else if (pattern === 1) {
    const safeLane = randomInt(0, 2);
    const firstLane = (safeLane + 1) % 3;
    const secondLane = (safeLane + 2) % 3;
    addObstacle(themedObstacle('drone'), firstLane, y);
    addObstacle(themedObstacle('asteroid'), secondLane, y);
    addPickup(safeLane, y + 22);
  } else if (pattern === 2) {
    addObstacle('laser', 0, y);
    addPickup(randomInt(0, 2), y + 20);
  } else if (pattern === 3) {
    const blockedLane = randomInt(0, 2);
    addObstacle(themedObstacle('drone'), blockedLane, y);
    addPickup((blockedLane + 1) % 3, y + 14);
    if (difficulty > 0.22) {
      addPowerup(Math.random() > 0.5 ? 'shield' : 'boost', (blockedLane + 2) % 3, y + 54);
    }
  } else if (pattern === 4) {
    const firstLane = randomInt(0, 2);
    const secondLane = (firstLane + 1) % 3;
    addObstacle(themedObstacle('asteroid'), firstLane, y);
    addObstacle(themedObstacle('asteroid'), secondLane, y);
    addPickup((firstLane + 2) % 3, y + 25);
  } else {
    const centerLane = randomInt(0, 2);
    addObstacle(themedObstacle('drone'), centerLane, y);
    addObstacle(themedObstacle('asteroid'), (centerLane + 1) % 3, y + 34);
    addPickup((centerLane + 2) % 3, y + 48);
  }

  if (state.waveCount % 6 === 0) {
    addPowerup(Math.random() > 0.5 ? 'shield' : 'boost', randomInt(0, 2), y - 38);
  }
  state.spawnTimer = Math.max(0.72, 1.48 - difficulty * 0.46) + randomBetween(-0.08, 0.12);
}

function collectibleAt(x, y, radius) {
  const rect = getPlayerRect();
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  return Math.hypot(centerX - x, centerY - y) < radius + Math.min(rect.w, rect.h) * 0.28;
}

function collectEnergy() {
  const phase = PHASES[state.phaseIndex];
  state.energy += 1;
  state.combo = Math.min(state.combo + 1, 8);
  state.comboTimer = 3;
  const multiplier = 1 + Math.max(0, state.combo - 1) * 0.2;
  const points = Math.round(125 * multiplier);
  state.score += points;
  spawnBurst(player.x, PLAYER_BASE_Y - player.jumpOffset - 48, '#63efff', 13, 180);
  addFloater(player.x, PLAYER_BASE_Y - player.jumpOffset - 105, `+${points}`, '#63efff');
  playTone(510 + Math.min(state.combo, 8) * 42, 0.09, 'sine', 0.035);
  if (state.energy >= state.missionGoal && !state.missionComplete) {
    state.missionComplete = true;
    state.score += phase.reward;
    player.shield = true;
    unlockNextPhase();
    const nextMessage = state.phaseIndex < PHASES.length - 1
      ? `MISSÃO CONCLUÍDA · ${PHASES[state.phaseIndex + 1].sector} LIBERADA`
      : 'MISSÃO CONCLUÍDA · GALÁXIA ESTABILIZADA';
    showToast(`${nextMessage} · ESCUDO ATIVO`, 2600);
    addFloater(player.x, PLAYER_BASE_Y - 185, `MISSÃO +${phase.reward}`, '#ffd166');
    playTone(820, 0.2, 'triangle', 0.05);
    showMissionCompleteScreen();
  } else {
    showToast(state.combo > 1 ? `COMBO x${state.combo}` : 'ENERGIA COLETADA', 700);
  }
}

function activatePowerup(type) {
  if (type === 'shield') {
    player.shield = true;
    showToast('ESCUDO ATIVADO', 1500);
    addFloater(player.x, PLAYER_BASE_Y - player.jumpOffset - 140, 'ESCUDO', '#63efff');
    playTone(700, 0.16, 'sine', 0.04);
  } else {
    state.boostTimer = BOOST_DURATION;
    showToast('IMPULSO HIPERLUZ', 1500);
    addFloater(player.x, PLAYER_BASE_Y - player.jumpOffset - 140, 'IMPULSO', '#9e78ff');
    playTone(360, 0.16, 'sawtooth', 0.04);
  }
  spawnBurst(player.x, PLAYER_BASE_Y - player.jumpOffset - 45, type === 'shield' ? '#63efff' : '#9e78ff', 22, 240);
}

function getPlayerRect() {
  const height = player.sliding ? 64 : 126;
  const top = PLAYER_BASE_Y - height - player.jumpOffset;
  return { x: player.x - 38, y: top, w: 76, h: height };
}

function checkObstacleCollisions() {
  const rect = getPlayerRect();
  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index];
    if (obstacle.hit || obstacle.destroyed) {
      continue;
    }
    if (obstacleIntersects(obstacle, rect)) {
      obstacle.hit = true;
      if (player.invulnerability > 0) {
        continue;
      }
      if (player.shield) {
        obstacle.destroyed = true;
        player.shield = false;
        player.invulnerability = 1.1;
        state.score += 100;
        state.shake = 0.2;
        spawnBurst(obstacle.x, obstacle.y + (obstacle.h || 40) / 2, '#63efff', 24, 280);
        addFloater(obstacle.x, obstacle.y - 24, 'ABSORVIDO', '#63efff');
        showToast('ESCUDO ABSORVIDO O IMPACTO', 1300);
        playTone(480, 0.13, 'triangle', 0.04);
      } else {
        spawnBurst(rect.x + rect.w / 2, rect.y + rect.h / 2, '#ff5d7c', 34, 300);
        endGame();
        return;
      }
    }
  }
  obstacles = obstacles.filter((obstacle) => !obstacle.destroyed);
}

function obstacleIntersects(obstacle, rect) {
  if (obstacle.type === 'laser') {
    if (player.sliding) {
      return false;
    }
    return rect.x < obstacle.x + obstacle.w / 2
      && rect.x + rect.w > obstacle.x - obstacle.w / 2
      && rect.y < obstacle.y + obstacle.h
      && rect.y + rect.h > obstacle.y;
  }
  if (obstacle.type === 'asteroid' || obstacle.type === 'comet') {
    const centerX = obstacle.x;
    const centerY = obstacle.y + obstacle.h / 2;
    const radius = obstacle.w * (obstacle.type === 'comet' ? 0.46 : 0.43);
    const closestX = clamp(centerX, rect.x, rect.x + rect.w);
    const closestY = clamp(centerY, rect.y, rect.y + rect.h);
    return Math.hypot(centerX - closestX, centerY - closestY) < radius;
  }
  return rect.x < obstacle.x + obstacle.w / 2
    && rect.x + rect.w > obstacle.x - obstacle.w / 2
    && rect.y < obstacle.y + obstacle.h
    && rect.y + rect.h > obstacle.y;
}

function spawnBurst(x, y, color, count, velocity) {
  const particleCount = preferences.reduceMotion ? Math.max(3, Math.ceil(count * 0.3)) : count;
  for (let index = 0; index < particleCount; index += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(velocity * 0.25, velocity);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomBetween(0.3, 0.75),
      maxLife: 0.75,
      size: randomBetween(2, 6),
      color
    });
  }
}

function spawnThrusterBurst(count) {
  const rect = getPlayerRect();
  spawnBurst(
    player.x,
    rect.y + rect.h * 0.78,
    state.boostTimer > 0 ? '#9e78ff' : '#ff8e6e',
    count,
    130
  );
}

function addFloater(x, y, text, color) {
  floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function updateParticles(dt) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= dt;
    if (particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 90 * dt;
    particle.vx *= 1 - dt * 1.4;
  }
}

function updateFloaters(dt) {
  for (let index = floaters.length - 1; index >= 0; index -= 1) {
    const floater = floaters[index];
    floater.life -= dt;
    floater.y -= 32 * dt;
    if (floater.life <= 0) {
      floaters.splice(index, 1);
    }
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  if (state.shake > 0 && !preferences.reduceMotion) {
    const amount = state.shake * 12;
    ctx.translate(randomBetween(-amount, amount), randomBetween(-amount, amount));
  }

  drawBackground();

  ctx.save();
  if (preferences.firstPerson) {
    ctx.translate(-(player.x - WORLD_WIDTH / 2) * 0.08, 0);
  }

  drawTrack();
  drawPickups();
  drawPowerups();
  drawObstacles();
  ctx.restore();

  if (preferences.firstPerson) {
    drawFirstPersonView();
  } else {
    drawPlayer();
  }

  drawParticles();
  drawFloaters();

  if (state.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 75, 119, ${state.hitFlash * 0.2})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  ctx.restore();
}

function drawBackground() {
  const phase = PHASES[state.phaseIndex];
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, phase.skyTop);
  gradient.addColorStop(0.42, phase.skyMiddle);
  gradient.addColorStop(1, '#070b21');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const nebula = ctx.createRadialGradient(210, 170, 10, 210, 170, 390);
  nebula.addColorStop(0, 'rgba(107, 72, 216, 0.2)');
  nebula.addColorStop(0.5, 'rgba(37, 49, 151, 0.08)');
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, WORLD_WIDTH, 600);

  const cyanGlow = ctx.createRadialGradient(770, 490, 5, 770, 490, 320);
  cyanGlow.addColorStop(0, 'rgba(30, 191, 214, 0.11)');
  cyanGlow.addColorStop(1, 'rgba(30, 191, 214, 0)');
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(420, 210, 480, 560);

  for (const star of stars) {
    const twinkle = 0.7 + Math.sin(state.visualTime * 2.2 + star.twinkle) * 0.3;
    ctx.globalAlpha = star.alpha * twinkle;
    ctx.fillStyle = star.tint;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawPlanet(145, 150, 74, '#171544', '#8268e8', 0.8);
  drawPlanet(780, 172, 42, '#122b4e', '#3eb6df', 0.35);
  drawShootingStar();
}

function drawPlanet(x, y, radius, darkColor, lightColor, ringAlpha) {
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.translate(x, y);
  ctx.rotate(-0.32);
  ctx.strokeStyle = `rgba(143, 204, 255, ${ringAlpha})`;
  ctx.lineWidth = Math.max(2, radius * 0.045);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.55, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.17;
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = radius * 0.1;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.75, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const planet = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.08, 0, 0, radius);
  planet.addColorStop(0, lightColor);
  planet.addColorStop(0.4, darkColor);
  planet.addColorStop(1, '#050717');
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.27, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShootingStar() {
  const cycle = state.visualTime % 8;
  if (cycle > 0.65) {
    return;
  }
  const progress = cycle / 0.65;
  const x = 120 + progress * 280;
  const y = 70 + progress * 190;
  ctx.save();
  ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
  ctx.strokeStyle = '#b4f6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 42, y - 30);
  ctx.stroke();
  ctx.restore();
}

function trackWidthAt(y) {
  const t = clamp((y - 330) / (WORLD_HEIGHT - 330), 0, 1);
  return lerp(278, 1120, t);
}

function drawTrack() {
  const horizonY = 330;
  const topWidth = trackWidthAt(horizonY);
  const bottomWidth = trackWidthAt(WORLD_HEIGHT);
  const trackGradient = ctx.createLinearGradient(0, horizonY, 0, WORLD_HEIGHT);
  trackGradient.addColorStop(0, 'rgba(27, 31, 80, 0.76)');
  trackGradient.addColorStop(0.25, 'rgba(11, 17, 48, 0.9)');
  trackGradient.addColorStop(1, 'rgba(3, 7, 24, 0.98)');
  ctx.fillStyle = trackGradient;
  ctx.beginPath();
  ctx.moveTo(WORLD_WIDTH / 2 - topWidth / 2, horizonY);
  ctx.lineTo(WORLD_WIDTH / 2 + topWidth / 2, horizonY);
  ctx.lineTo(WORLD_WIDTH / 2 + bottomWidth / 2, WORLD_HEIGHT);
  ctx.lineTo(WORLD_WIDTH / 2 - bottomWidth / 2, WORLD_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(99, 239, 255, 0.45)';
  ctx.strokeStyle = 'rgba(99, 239, 255, 0.52)';
  ctx.lineWidth = 3;
  drawPerspectiveLine(horizonY, WORLD_HEIGHT, -0.5, 0.5);
  drawPerspectiveLine(horizonY, WORLD_HEIGHT, 0.5, 0.5);
  ctx.shadowBlur = 0;
  ctx.restore();

  const laneTop = [385, 515];
  const laneBottom = [310, 590];
  ctx.save();
  ctx.strokeStyle = 'rgba(130, 162, 255, 0.24)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 18]);
  for (let index = 0; index < 2; index += 1) {
    ctx.beginPath();
    ctx.moveTo(
      WORLD_WIDTH / 2 + (laneTop[index] - WORLD_WIDTH / 2) * 0.12,
      horizonY
    );
    ctx.lineTo(laneBottom[index], WORLD_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(150, 186, 255, 0.11)';
  ctx.lineWidth = 1;
  for (
    let y = horizonY + (state.worldOffset % 112) - 112;
    y < WORLD_HEIGHT;
    y += 112
  ) {
    if (y < horizonY) {
      continue;
    }
    const width = trackWidthAt(y);
    ctx.beginPath();
    ctx.moveTo(WORLD_WIDTH / 2 - width / 2, y);
    ctx.lineTo(WORLD_WIDTH / 2 + width / 2, y);
    ctx.stroke();
  }
  ctx.restore();

  const horizonGlow = ctx.createLinearGradient(0, horizonY - 25, 0, horizonY + 110);
  horizonGlow.addColorStop(0, 'rgba(99, 239, 255, 0)');
  horizonGlow.addColorStop(0.5, 'rgba(99, 239, 255, 0.13)');
  horizonGlow.addColorStop(1, 'rgba(99, 239, 255, 0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, horizonY - 25, WORLD_WIDTH, 135);
}

function drawPerspectiveLine(startY, endY, startOffset, endOffset) {
  const startWidth = trackWidthAt(startY);
  const endWidth = trackWidthAt(endY);
  ctx.beginPath();
  ctx.moveTo(WORLD_WIDTH / 2 + startWidth * startOffset, startY);
  ctx.lineTo(WORLD_WIDTH / 2 + endWidth * endOffset, endY);
  ctx.stroke();
}

function drawPickups() {
  for (const pickup of pickups) {
    const color = pickup.color || '#63efff';
    const pulse = 1 + Math.sin(state.visualTime * 5 + pickup.pulse) * 0.12;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(pickup.rotation);
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 31 * pulse);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    glow.addColorStop(0.22, color);
    glow.addColorStop(1, color);
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.arc(0, 0, 31 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPowerups() {
  for (const powerup of powerups) {
    const color = powerup.type === 'shield' ? '#63efff' : '#b78cff';
    const pulse = 1 + Math.sin(state.visualTime * 4 + powerup.pulse) * 0.1;
    ctx.save();
    ctx.translate(powerup.x, powerup.y);
    ctx.rotate(powerup.rotation);
    ctx.shadowBlur = 26;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 29 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(8, 19, 53, 0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0
