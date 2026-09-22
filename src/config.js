// ==== Общие ====
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// ==== 3D мир ====
export const WORLD = {
  width: 40,      // 40 юнитов в ширину
  depth: 40,      // 40 в глубину
};

export const PLAYER = {
  radius: 0.14,
  height: 0.55,
  walkSpeed: 2.5,
  sprintSpeed: 4.5,
  crouchSpeed: 1.2,
};

export const COLORS = {
  bg: 0x1a1a1a,
  ground: 0x3b5c2e,     // трава
  player: 0x4488ff,
  playerCrouch: 0x6688ff,
  tree: 0x2d4a22,
  trunk: 0x5a3820,
};

export const TREE = {
  trunkRadius: 0.16,
  trunkHeight: 2.8,
  crownRadius: 1.7,
  crownY: 3.4,
};

export const CAMERA = {
  offset: { x: 5, y: 6, z: 5 },
  lookAtHeight: 0.5,
  lerp: 0.08,
};

// ЗАГЛУШКИ — пока пустые, механики перенесём потом
export const NOISE = {
  max: 100,

  // Базовый шум от передвижения (держится, пока двигаешься)
  crouchTarget: 5,
  walkTarget: 20,
  sprintTarget: 50,

  crouchRamp: 0.3,
  walkRamp: 0.6,
  sprintRamp: 1.2,
  baseDecay: 1.0,

  // Импульс от выстрела/удара (затухает)
  shotImpulse: 34,
  meleeImpulse: 8,
  pulseDecay: 0.25,

  // Визуальное кольцо
  circleMin: 1.0,
  circleMax: 8.0,

  // Критический режим
  critical: 100,
  criticalRelease: 10,
  lastKnownThreshold: 10,
};

export const ZOMBIE = { size: 1, speed: 2 };
export const BULLET = { speed: 10 };
export const MELEE = { range: 1.5 };
export const AMMO = { start: 30, max: 60 };