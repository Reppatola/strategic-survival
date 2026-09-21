export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const WORLD = { width: 2000, height: 1200 };

export const COLORS = {
  bg: 0x1a1a1a,
  floor: 0x222222,
  player: 0x44ff44,
  wall: 0x555555,
  wallEdge: 0x777777,
  bullet: 0xffdd44,
  zone: 0x4488ff,
  zoneActive: 0xff4488,
};

export const PLAYER = {
  size: 22,
  walkSpeed: 180,
  sprintSpeed: 320,
};

export const NOISE = {
  max: 100,

  // Базовый шум от передвижения
  walkTarget: 20,
  sprintTarget: 50,
  walkRamp: 0.6,
  sprintRamp: 1.2,
  baseDecay: 1.5,

  // Импульс от выстрела: 3 выстрела = 100%
  shotImpulse: 34,
  pulseDecay: 0.20,

  // Визуальный круг
  circleMin: 18,
  circleMax: 160,

  // Критический режим
  critical: 100,          // активируется при достижении
  criticalRelease: 10,    // снимается, когда шум падает до этого значения

  // Порог «громкой точки» — пока шум выше, зомби знают, где игрок
  lastKnownThreshold: 10,
};

export const BULLET = {
  size: 6,
  speed: 700,
  lifespan: 1200,
};

export const ZONE = {
  radius: 90,
};