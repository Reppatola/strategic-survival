export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const WORLD = { width: 3840, height: 2560 };

// Масштаб мира: пикселей в одном метре (для физики звука и сенсоров)
export const PX_PER_METER = 20;

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
  footwear: 'boots',      // ключ из NOISE_DB.footwear (позже — из экипировки)
};

// === ШУМ В ДЕЦИБЕЛАХ (VISION.md, раздел «ШУМ») ===
export const NOISE_DB = {
  max: 150,

  // База от движения
  base: { crouch: 30, walk: 50, sprint: 70 },

  // Обувь (модификатор базы)
  footwear: {
    barefoot: -15,
    slippers: -8,
    sneakers: -3,
    boots: 0,
    heavyBoots: 5,
    armored: 10,
  },

  // Поверхность (модификатор базы)
  surface: {
    grass: -10,
    snow: -10,
    dirt: -5,
    moss: -5,
    wood: 0,
    concrete: 5,
    gravel: 10,
    foliage: 15,
    metal: 20,
    water: 10,
  },

  // Импульсы (разовые действия), dB
  impulses: {
    pistol: 110,
    rifle: 130,
    punch: 20,
    axe: 35,
    saw: 50,        // непрерывный (позже)
    hammer: 45,
    crate: 40,
    campfire: 30,
    door: 15,
    melee: 20,      // удар в ближнем бою
  },

  // Затухание: dB_на_расстоянии = источник − attenuation · log10(расстояние_в_м)
  attenuation: 20,

  // Глушение препятствий, dB (за каждое пересечение луча источник→слушатель)
  obstacleDamping: {
    wall: 20,
    tree: 5,
    hill: 10,
  },

  // Пороги режимов, dB
  critical: 120,          // критический режим (уровень выстрела)
  criticalRelease: 60,    // гистерезис: выход из крита
  audible: 18,            // выше — обновляется «последняя громкая точка»

  // Скорости изменения, dB/сек
  baseRampPerSec: 120,    // разгон/спад базы
  pulseDecayPerSec: 25,   // затухание импульсов

  // Визуал круга шума
  circleMin: 12,          // px
  circleMaxRadius: 900,   // px — визуальный предел
};

export const BULLET = {
  size: 6,
  speed: 700,
  lifespan: 1200,
};

export const ZONE = { radius: 90 };

// === АРХЕТИПЫ ЗОМБИ (VISION.md, раздел «ЗОМБИ») ===
// hearingThreshold — минимальные dB на позиции зомби, чтобы он услышал источник.
// Пороги сверены с формулой затухания: ходьба (50 dB) слышна «Обычному» на ~40 м.
// visionRange — в метрах (конвертируется в px через PX_PER_METER).
export const ZOMBIE_ARCHETYPES = {
  listener: { name: 'Слухач',    hearingThreshold: 12, visionAngle: 40, visionRange: 20,  smellBlood: 0,  smellSweat: 0, speed: 75 },
  watcher:  { name: 'Смотрящий', hearingThreshold: 44, visionAngle: 90, visionRange: 100, smellBlood: 0,  smellSweat: 0, speed: 75 },
  sniffer:  { name: 'Нюхач',     hearingThreshold: 21, visionAngle: 60, visionRange: 30,  smellBlood: 50, smellSweat: 20, speed: 75 },
  blind:    { name: 'Слепой',    hearingThreshold: 10, visionAngle: 0,  visionRange: 0,   smellBlood: 0,  smellSweat: 0, speed: 90 },
  normal:   { name: 'Обычный',   hearingThreshold: 18, visionAngle: 60, visionRange: 50,  smellBlood: 0,  smellSweat: 0, speed: 75 },
  officer:  { name: 'Офицер',    hearingThreshold: 14, visionAngle: 80, visionRange: 70,  smellBlood: 30, smellSweat: 0, speed: 90 },
  boss:     { name: 'Улей',      hearingThreshold: 14, visionAngle: 80, visionRange: 70,  smellBlood: 30, smellSweat: 0, speed: 95, hiveMindRadius: 200 },
};

export const ZOMBIE = {
  size: 22,
  hp: 2,
  damage: 20,
  touchCooldown: 700,
  maxAlive: 30,
  groupMin: 2,
  groupMax: 4,
  edgeMargin: 40,
  colorStatic: 0xaa2222,
  colorSpawned: 0xcc4444,
  colorAlerted: 0xff2222,
};

export const TERRITORY = {
  lockAfterCriticalMs: 12000,   // 12 сек непрерывного крита → блок
  silentToUnlockMs: 5000,       // 5 сек тишины → разлок
  zombieSpawnOnLock: 5,         // сколько спавнить вокруг игрока
  lockSpawnInterval: 3000,      // мс между доп. спавнами при локе
};

export const MELEE = {
  range: 45,           // радиус удара
  arc: 60,             // угол конуса спереди (полный), градусы
  backstabAngle: 120,  // дуга «сзади» (полный), градусы
  damage: 1,           // урон спереди
  cooldown: 400,       // мс между ударами
  knockback: 180,      // сила отбрасывания
  stunMs: 150,         // оглушение от удара (фикс: раньше отбрасывание съедалось AI)
};