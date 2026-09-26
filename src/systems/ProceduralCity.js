import Phaser from 'phaser';

// Размер тайла и сетки
const TILE = 128;
const GRID_W = 30;
const GRID_H = 20;
const WORLD_W = TILE * GRID_W;   // 3840
const WORLD_H = TILE * GRID_H;   // 2560

// Дороги каждые ROAD_EVERY тайлов, шириной ROAD_W
const ROAD_EVERY = 8;
const ROAD_W = 2;

export default class ProceduralCity {
  constructor(scene) {
    this.scene = scene;
    this.build();
  }

  // Ячейка — дорога?
  isRoad(idx) {
    return (idx % ROAD_EVERY) < ROAD_W;
  }

  // Рядом с дорогой? → это тротуар
  isAdjacentToRoad(col, row) {
    return (
      this.isRoad(col - 1) || this.isRoad(col + 1) ||
      this.isRoad(row - 1) || this.isRoad(row + 1)
    );
  }

  build() {
    const s = this.scene;

    // Базовая земля — трава
    s.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x3b6e2e)
      .setDepth(-1000);

    // Проходим по всей сетке
    for (let row = 0; row < GRID_H; row++) {
      for (let col = 0; col < GRID_W; col++) {
        this.buildTile(col, row);
      }
    }

    // Соединяем края дорог разметкой
    this.addRoadMarkings();
  }

  buildTile(col, row) {
    const s = this.scene;
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE / 2;

    // === ДОРОГА ===
    if (this.isRoad(col) || this.isRoad(row)) {
      s.add.rectangle(x, y, TILE, TILE, 0x2c2c2c).setDepth(-999);
      return;
    }

    // === ТРОТУАР ===
    if (this.isAdjacentToRoad(col, row)) {
      s.add.rectangle(x, y, TILE, TILE, 0x8a8a8a).setDepth(-998);
      // Бордюр
      s.add.rectangle(x, y, TILE, TILE, 0x000000, 0)
        .setStrokeStyle(1, 0x555555, 0.5)
        .setDepth(-997);
      return;
    }

    // === ЗДАНИЕ или ПАРК ===
    const r = Math.random();

    if (r < 0.7) {
      // ЗДАНИЕ
      const colors = [0x555555, 0x6a5a4a, 0x7a7a7a, 0x4a4a4a, 0x5a4a3a, 0x605040];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const building = s.add.rectangle(x, y, TILE - 6, TILE - 6, color);
      building.setStrokeStyle(2, 0x222222);
      building.setDepth(y);   // Y-sorting

      // Физика — препятствие
      s.physics.add.existing(building, true);
      s.walls.add(building);
    } else {
      // ПАРК
      s.add.rectangle(x, y, TILE, TILE, 0x4a8035).setDepth(-997);

      // Дерево
      if (Math.random() < 0.55) {
        const tree = s.add.circle(x, y, 36, 0x1e4d1e);
        tree.setStrokeStyle(3, 0x0d330d);
        tree.setDepth(y);   // Y-sorting
        s.physics.add.existing(tree, true);
        s.walls.add(tree);
      }
    }
  }

  addRoadMarkings() {
    const s = this.scene;
    // Жёлтые пунктирные линии на дорогах
    for (let col = 0; col < GRID_W; col++) {
      for (let row = 0; row < GRID_H; row++) {
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;

        // Горизонтальная дорога — рисуем вертикальные метки
        if (this.isRoad(row) && !this.isRoad(col) && col % 3 === 0) {
          s.add.rectangle(x, y, 8, 50, 0xffcc00).setDepth(-990);
        }
        // Вертикальная дорога — горизонтальные метки
        if (this.isRoad(col) && !this.isRoad(row) && row % 3 === 0) {
          s.add.rectangle(x, y, 50, 8, 0xffcc00).setDepth(-990);
        }
      }
    }
  }

  // Возвращает размер мира — используется для физики и камеры
    getWorldSize() {
    return { w: WORLD_W, h: WORLD_H };
  }

  // Тип поверхности в точке — для системы шума
  surfaceAt(x, y) {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);

    if (this.isRoad(col) || this.isRoad(row)) return 'gravel';
    if (this.isAdjacentToRoad(col, row)) return 'concrete';
    return 'grass';
  }
}