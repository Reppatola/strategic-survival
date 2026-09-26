import Phaser from 'phaser';
import { COLORS, ZONE } from '../config.js';
import ProceduralCity from './ProceduralCity.js';

export default class MapBuilder {
  constructor(scene) {
    this.scene = scene;
    const s = scene;

    // Группа для стен
    s.walls = s.physics.add.staticGroup();

    // Процедурный город
    this.city = new ProceduralCity(scene);
    const size = this.city.getWorldSize();

    // Границы мира
    s.physics.world.setBounds(0, 0, size.w, size.h);
    s.cameras.main.setBounds(0, 0, size.w, size.h);

    // Запоминаем размер
    s.worldSize = size;

    // Зоны и маркер
    this.buildZones();
    this.buildLastKnownMarker();
  }

  buildZones() {
    const s = this.scene;
    s.zones = [];
    const zoneData = [
      [500, 400], [900, 700], [1300, 350], [1500, 900], [700, 1000],
    ];
    zoneData.forEach(([x, y]) => {
      const c = s.add.circle(x, y, ZONE.radius, COLORS.zone, 0.05);
      c.setStrokeStyle(2, COLORS.zone, 0.4);
      c.setDepth(-2);
      s.zones.push(c);
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

  // Прокси для NoiseSystem
  surfaceAt(x, y) {
    return this.city.surfaceAt(x, y);
  }
}