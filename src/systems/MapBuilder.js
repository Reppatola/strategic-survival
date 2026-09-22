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
    s.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.floor)
      .setDepth(-3);
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
      const wall = s.add.rectangle(x, y, w, h, COLORS.wall);
      wall.setStrokeStyle(2, COLORS.wallEdge);
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