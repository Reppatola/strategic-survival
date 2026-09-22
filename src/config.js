// ==== Общие ====
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// ==== 3D мир ====
export const WORLD = {
  width: 40,      // 40 юнитов в ширину
  depth: 40,      // 40 в глубину
};

export const PLAYER = {
  radius: 0.4,
  height: 1.6,
  walkSpeed: 4,     // юнитов/сек
  sprintSpeed: 7,
  crouchSpeed: 2,
};

export const COLORS = {
  bg: 0x1a1a1a,
  ground: 0x3b5c2e,     // трава
  player: 0x4488ff,
  playerCrouch: 0x6688ff,
  tree: 0x2d4a22,
  trunk: 0x5a3820,
};

export const CAMERA = {
  // Изометрический угол: сверху-сбоку
  offset: { x: 12, y: 14, z: 12 },
  lookAtHeight: 1,
  lerp: 0.08,
};

// ЗАГЛУШКИ — пока пустые, механики перенесём потом
export const NOISE = { max: 100 };
export const ZOMBIE = { size: 1, speed: 2 };
export const BULLET = { speed: 10 };
export const MELEE = { range: 1.5 };
export const AMMO = { start: 30, max: 60 };