export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const WORLD = { width: 2000, height: 1200 };

export const COLORS = {
  bg: 0x1a1a1a,
  floor: 0x222222,
  player: 0x44ff44,
  playerCrouch: 0x4488ff,
  wall: 0x555555,
  wallEdge: 0x777777,
  bullet: 0xffdd44,
  zone: 0x4488ff,
  zoneActive: 0xff4488,
  lastKnown: 0xff4488,
};

export const PLAYER = {
  size: 22,
  crouchSpeed: 90,
  walkSpeed: 180,
  sprintSpeed: 320,
};

export const NOISE = {
  max: 100,
  crouchTarget: 5,
  walkTarget: 20,
  sprintTarget: 50,
  crouchRamp: 0.3,
  walkRamp: 0.6,
  sprintRamp: 1.2,
  baseDecay: 1.0,
  shotImpulse: 34,
  pulseDecay: 0.25,
  circleMin: 12,
  circleMax: 160,
  critical: 100,
  criticalRelease: 10,
  lastKnownThreshold: 10,
};

export const BULLET = {
  size: 6,
  speed: 700,
  lifespan: 1200,
};

export const ZONE = { radius: 90 };

export const ZOMBIE = {
  size: 22,
  hp: 2,
  speed: 75,
  visionAngle: 90,        // градусы, полный угол конуса
  visionRange: 200,       // пиксели
  damage: 20,
  touchCooldown: 700,
  maxAlive: 30,
  groupMin: 2,
  groupMax: 4,
  colorStatic: 0xaa2222,
  colorSpawned: 0xcc4444,
  colorAlerted: 0xff2222,
};

export const TERRITORY = {
  lockAfterCriticalMs: 12000,   // 12 сек непрерывного крита → блок
  silentToUnlockMs: 5000,       // 5 сек тишины → разлок
  zombieSpawnOnLock: 5,         // сколько спавнить вокруг игрока
  edgeMargin: 40,               // отступ спавна от края
  lockSpawnInterval: 3000,      // мс между доп. спавнами при локе
};

export const MELEE = {
  range: 45,           // радиус удара
  arc: 60,             // угол конуса (полный), градусы
  damage: 1,           // урон спереди
  backstabAngle: 120,  // угол «сзади» (полный), градусы
  cooldown: 400,       // мс между ударами
  noise: 8,            // шум за удар
  knockback: 180,      // сила отбрасывания
};