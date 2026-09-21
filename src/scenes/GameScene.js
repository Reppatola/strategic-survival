import Phaser from 'phaser';
import { COLORS, PLAYER, WORLD } from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.floor)
      .setDepth(-1);

    this.player = this.add.rectangle(
      WORLD.width / 2, WORLD.height / 2,
      PLAYER.size, PLAYER.size, COLORS.player
    );
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.walls = this.physics.add.staticGroup();

    const wallData = [
      [400, 300, 200, 30],
      [800, 500, 30, 300],
      [1200, 400, 250, 30],
      [1500, 800, 30, 250],
      [600, 900, 300, 30],
      [1000, 200, 30, 200],
      [1600, 300, 200, 30],
      [300, 800, 30, 200],
      [1300, 1000, 200, 30],
    ];

    wallData.forEach(([x, y, w, h]) => {
      const wall = this.add.rectangle(x, y, w, h, COLORS.wall);
      wall.setStrokeStyle(2, COLORS.wallEdge);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    });

    this.physics.add.collider(this.player, this.walls);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
    });

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.hud = this.add
      .text(12, 10, '', {
        fontSize: '14px',
        color: '#88ff88',
        fontFamily: 'Courier New, monospace',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update() {
    const speed = PLAYER.speed;
    let vx = 0, vy = 0;

    if (this.keys.left.isDown) vx -= speed;
    if (this.keys.right.isDown) vx += speed;
    if (this.keys.up.isDown) vy -= speed;
    if (this.keys.down.isDown) vy += speed;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.body.setVelocity(vx, vy);

    this.hud.setText(
      `X ${Math.round(this.player.x)}   Y ${Math.round(this.player.y)}   V ${Math.round(Math.hypot(vx, vy))}`
    );
  }
}