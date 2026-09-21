import Phaser from 'phaser';
import { COLORS, PLAYER, WORLD, NOISE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
    this.noiseLevel = 0;
  }

  create() {
    // --- Мир ---
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.floor)
      .setDepth(-1);

    // --- Игрок ---
    this.player = this.add.rectangle(
      WORLD.width / 2, WORLD.height / 2,
      PLAYER.size, PLAYER.size, COLORS.player
    );
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // --- Визуальная волна шума ---
    this.noiseCircle = this.add.circle(
      this.player.x, this.player.y,
      NOISE.circleMin,
      0xff4444, 0.15
    );
    this.noiseCircle.setStrokeStyle(2, 0xff4444, 0.6);
    this.noiseCircle.setDepth(-1);

    // --- Стены ---
    this.walls = this.physics.add.staticGroup();
    const wallData = [
      [400, 300, 200, 30], [800, 500, 30, 300], [1200, 400, 250, 30],
      [1500, 800, 30, 250], [600, 900, 300, 30], [1000, 200, 30, 200],
      [1600, 300, 200, 30], [300, 800, 30, 200], [1300, 1000, 200, 30],
    ];
    wallData.forEach(([x, y, w, h]) => {
      const wall = this.add.rectangle(x, y, w, h, COLORS.wall);
      wall.setStrokeStyle(2, COLORS.wallEdge);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    });
    this.physics.add.collider(this.player, this.walls);

    // --- Управление ---
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
    });

    // --- Камера ---
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // --- HUD ---
    this.hud = this.add
      .text(12, 10, '', {
        fontSize: '13px',
        color: '#88ff88',
        fontFamily: 'Courier New, monospace',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0).setDepth(100);

    // Полоска шума
    this.noiseBarBg = this.add
      .rectangle(GAME_WIDTH / 2, 24, 300, 14, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x444444);
    this.noiseBar = this.add
      .rectangle(GAME_WIDTH / 2 - 150, 24, 0, 10, 0x44ff44)
      .setOrigin(0, 0.5)
      .setScrollFactor(0).setDepth(101);
    this.noiseLabel = this.add
      .text(GAME_WIDTH / 2, 24, 'NOISE', {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'Courier New, monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0).setDepth(102);

    // Красный оверлей для пульсации при критическом шуме
    this.dangerOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0).setDepth(99);
  }

  update(time, delta) {
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

    // --- Логика Шума ---
    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving) {
      this.noiseLevel += NOISE.walkGain;
    } else {
      this.noiseLevel -= NOISE.decay * 0.5;
    }
    this.noiseLevel = Phaser.Math.Clamp(this.noiseLevel, 0, NOISE.max);

    // Плавное затухание когда стоишь
    if (!isMoving) {
      this.noiseLevel -= NOISE.decay * 0.5;
      this.noiseLevel = Math.max(0, this.noiseLevel);
    }

    // --- Визуал волны ---
    const ratio = this.noiseLevel / NOISE.max;
    const radius = Phaser.Math.Linear(NOISE.circleMin, NOISE.circleMax, ratio);

    this.noiseCircle.setPosition(this.player.x, this.player.y);
    this.noiseCircle.setRadius(radius);

    // Пульсация волны — лёгкое «дыхание»
    const pulse = Math.sin(time / 200) * 3;
    this.noiseCircle.setScale((radius + pulse) / radius);

    // Цвет меняется с зелёного (тихо) на красный (громко)
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(68, 255, 68),
      new Phaser.Display.Color(255, 68, 68),
      100,
      ratio * 100
    );
    const tint = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
    this.noiseCircle.setFillStyle(tint, 0.08 + ratio * 0.20);
    this.noiseCircle.setStrokeStyle(2, tint, 0.4 + ratio * 0.5);

    // --- Индикатор ---
    const barWidth = 300 * ratio;
    this.noiseBar.width = barWidth;
    this.noiseBar.fillColor = tint;

    // --- Критический режим ---
    if (this.noiseLevel >= NOISE.critical) {
      const pulseAlpha = 0.08 + Math.abs(Math.sin(time / 150)) * 0.18;
      this.dangerOverlay.fillAlpha = pulseAlpha;
    } else {
      this.dangerOverlay.fillAlpha = Math.max(0, this.dangerOverlay.fillAlpha - 0.02);
    }

    // --- HUD ---
    const warn = this.noiseLevel >= NOISE.critical ? '   ⚠ NOISE CRITICAL' : '';
    this.hud.setText(
      `X ${Math.round(this.player.x)}   Y ${Math.round(this.player.y)}   V ${Math.round(Math.hypot(vx, vy))}\n` +
      `NOISE ${Math.round(this.noiseLevel)} / ${NOISE.max}${warn}`
    );
  }
}