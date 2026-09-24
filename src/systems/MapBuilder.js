import Phaser from 'phaser';
import { COLORS, WORLD, ZONE } from '../config.js';

export default class MapBuilder {
  constructor(scene) {
    this.scene = scene;
    this.buildFloor();
    this.buildZones();
    this.buildWalls();
    this.buildLastKnownMarker();
  }

  buildFloor() {
    const s = this.scene;
    s.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    // Фон: тайл травы, повторяется по всей карте
    s.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass')
      .setOrigin(0, 0)
      .setDepth(-3);

    // Пятна земли — декор для разнообразия (и поверхность «земля» для шума)
    this.dirtSpots = [
      [500, 400, 200, 150],
      [1200, 800, 250, 180],
      [1600, 500, 180, 160],
      [800, 1000, 220, 200],
    ];
    this.dirtSpots.forEach(([x, y, w, h]) => {
      s.add.tileSprite(x, y, w, h, 'dirt')
        .setOrigin(0, 0)
        .setDepth(-2)
        .setAlpha(0.6);
    });
  }

  // Поверхность под точкой — для модификаторов шума (VISION.md)
  // Порядок: бетон у стен приоритетнее пятен земли
  surfaceAt(x, y) {
    const walls = this.scene.walls.getChildren();
    for (const w of walls) {
      const b = w.getBounds();
      if (x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8) {
        return 'concrete';
      }
    }
    for (const [sx, sy, sw, sh] of this.dirtSpots) {
      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) return 'dirt';
    }
    return 'grass';
  }

  buildZones() {
    const s = this.scene;
    s.zones = [];
    [[500,400],[900,700],[1300,350],[1500,900],[700,1000]].forEach(([x, y]) => {
      const c = s.add.circle(x, y, ZONE.radius, COLORS.zone, 0.05);
      c.setStrokeStyle(2, COLORS.zone, 0.4);
      c.setDepth(-2);
      s.zones.push(c);
    });
  }

  buildWalls() {
    const s = this.scene;
    s.walls = s.physics.add.staticGroup();
    [
      [400,300,200,30],[800,500,30,300],[1200,400,250,30],[1500,800,30,250],
      [600,900,300,30],[1000,200,30,200],[1600,300,200,30],[300,800,30,200],[1300,1000,200,30],
    ].forEach(([x, y, w, h]) => {
      // Визуал: цементная текстура
      const visual = s.add.tileSprite(x, y, w, h, 'cement');
      visual.setDepth(1);

      // Тёмная обводка для контраста
      const border = s.add.rectangle(x, y, w, h, 0x000000, 0);
      border.setStrokeStyle(2, 0x333333, 0.8);
      border.setDepth(2);

      // Физика — невидимый прямоугольник поверх
      const wall = s.add.rectangle(x, y, w, h, 0x000000, 0);
      s.physics.add.existing(wall, true);
      s.walls.add(wall);
    });
  }

  buildLastKnownMarker() {
    const s = this.scene;
    s.lastKnownMarker = s.add.container(0, 0);
    s.lastKnownMarker.add([
      s.add.rectangle(0, 0, 22, 2, COLORS.lastKnown, 1),
      s.add.rectangle(0, 0, 2, 22, COLORS.lastKnown, 1),
    ]);
    s.lastKnownMarker.setDepth(2);
  }
}