export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const WORLD = { width: 2000, height: 1200 };

export const COLORS = {
  bg: 0x1a1a1a,
  floor: 0x222222,
  player: 0x44ff44,
  wall: 0x555555,
  wallEdge: 0x777777,
};

export const PLAYER = { size: 22, speed: 220 };

export const NOISE = {
  walkGain: 0.30,      // прирост шума за кадр при движении
  decay: 0.20,         // затухание шума за кадр
  max: 100,            // максимальное значение
  critical: 70,        // порог тревоги
  circleMin: 20,       // минимальный радиус визуальной волны
  circleMax: 140,      // максимальный радиус
};