import Phaser from 'phaser';
import {
  COLORS, PLAYER, WORLD, NOISE, BULLET, ZONE,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.baseNoise = 0;
    this.pulseNoise = 0;
    this.noiseLevel = 0;
    this.lastShot = -999;

    // Критический режим
    this.criticalActive = false;

    // Последняя «громкая» позиция игрока
    this.lastKnownX = WORLD.width / 2;
    this.lastKnownY = WORLD.height / 2;

    // --- Мир ---
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.floor)
      .setDepth(-1);

    // --- Зоны-«цели» (будущие зомби / объекты) ---
    this.zones = [];
    const zoneData = [
      [500, 400],
      [900, 700],
      [1300, 350],
      [1500, 900],
      [700, 1000],
    ];
    zoneData.forEach(([x, y]) => {
      const circle = this.add.circle(x, y, ZONE.radius, COLORS.zone, 0.05);
      circle.setStrokeStyle(2, COLORS.zone, 0.4);
      circle.setDepth(-1);
      this.zones.push(circle);
    });

    // --- Игрок ---
    this.player = this.add.rectangle(
      WORLD.width / 2, WORLD.height / 2,
      PLAYER.size, PLAYER.size, COLORS.player
    );
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.lastKnownX = this.player.x;
    this.lastKnownY = this.player.y;

    // --- Визуальная волна шума ---
    this.noiseCircle = this.add.circle(
      this.player.x, this.player.y,
      NOISE.circleMin, 0xff4444, 0.15
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

    // --- Пули ---
    this.bullets = this.physics.add.group();
    this.physics.add.collider(this.bullets, this.walls, (b) => b.destroy());

    // --- Управление ---
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D', shift: 'SHIFT',
    });

    this.input.on('pointerdown', (pointer) => this.shoot(pointer));

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
      .rectangle(GAME_WIDTH / 2, 24, 400, 16, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x444444);

    this.baseBar = this.add
      .rectangle(GAME_WIDTH / 2 - 200, 24, 0, 10, 0xffcc44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.pulseBar = this.add
      .rectangle(GAME_WIDTH / 2 - 200, 24, 0, 10, 0xff4444)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);

    this.add
      .text(GAME_WIDTH / 2, 24, 'NOISE', {
        fontSize: '11px', color: '#ffffff', fontFamily: 'Courier New, monospace',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(103);

    // Подсказки управления
    this.add
      .text(GAME_WIDTH - 12, 10, 'WASD — walk\nSHIFT — sprint\nLMB — shoot', {
        fontSize: '11px',
        color: '#666666',
        fontFamily: 'Courier New, monospace',
        align: 'right',
      })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Красный оверлей
    this.dangerOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(99);
  }

  shoot(pointer) {
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      pointer.worldX, pointer.worldY
    );

    // Создаём пулю
    const bullet = this.add.rectangle(
      this.player.x, this.player.y,
      BULLET.size * 2, BULLET.size,
      COLORS.bullet
    );
    bullet.setRotation(angle);
    bullet.setStrokeStyle(1, 0xffffff, 0.8);

    // 1. Физика
    this.physics.add.existing(bullet);

    // 2. В группу (сбрасывает тело)
    this.bullets.add(bullet);

    // 3. Скорость — ПОСЛЕ группы
    bullet.body.setAllowGravity(false);
    bullet.body.setVelocity(
      Math.cos(angle) * BULLET.speed,
      Math.sin(angle) * BULLET.speed
    );

    // Вспышка ствола
    const flash = this.add.rectangle(
      this.player.x, this.player.y,
      24, 3, 0xffee66, 0.9
    ).setOrigin(0, 0.5).setRotation(angle);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // Импульс шума
    this.pulseNoise = Math.min(NOISE.max, this.pulseNoise + NOISE.shotImpulse);
    this.lastShot = this.time.now;

    // Автоудаление
    this.time.delayedCall(BULLET.lifespan, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  update(time) {
    // --- Ввод ---
    const keys = this.keys;
    const sprinting = keys.shift.isDown;
    const speed = sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

    let vx = 0, vy = 0;
    if (keys.left.isDown) vx -= speed;
    if (keys.right.isDown) vx += speed;
    if (keys.up.isDown) vy -= speed;
    if (keys.down.isDown) vy += speed;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }
    this.player.body.setVelocity(vx, vy);

    const isMoving = vx !== 0 || vy !== 0;

    // --- Базовый шум (движение) ---
    let target, ramp;
    if (!isMoving) {
      target = 0;
      ramp = NOISE.baseDecay;
    } else if (sprinting) {
      target = NOISE.sprintTarget;
      ramp = NOISE.sprintRamp;
    } else {
      target = NOISE.walkTarget;
      ramp = NOISE.walkRamp;
    }

    if (this.baseNoise < target) {
      this.baseNoise = Math.min(target, this.baseNoise + ramp);
    } else {
      this.baseNoise = Math.max(target, this.baseNoise - ramp);
    }

    // --- Импульсный шум (выстрелы) ---
    this.pulseNoise = Math.max(0, this.pulseNoise - NOISE.pulseDecay);

    // --- Итоговый шум ---
    this.noiseLevel = Math.min(NOISE.max, this.baseNoise + this.pulseNoise);
    const ratio = this.noiseLevel / NOISE.max;

    // --- Визуал круга ---
    const radius = Phaser.Math.Linear(NOISE.circleMin, NOISE.circleMax, ratio);
    this.noiseCircle.setPosition(this.player.x, this.player.y);
    this.noiseCircle.setRadius(radius);

    const pulse = Math.sin(time / 180) * 3;
    this.noiseCircle.setScale((radius + pulse) / Math.max(radius, 1));

    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(68, 255, 68),
      new Phaser.Display.Color(255, 68, 68),
      100, ratio * 100
    );
    const tint = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
    this.noiseCircle.setFillStyle(tint, 0.05 + ratio * 0.18);
    this.noiseCircle.setStrokeStyle(2, tint, 0.35 + ratio * 0.55);

    // --- Зоны: подсветка при пересечении ---
    this.zones.forEach(zone => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, zone.x, zone.y
      );
      const inside = dist < radius + ZONE.radius;
      if (inside) {
        zone.setFillStyle(COLORS.zoneActive, 0.15 + ratio * 0.15);
        zone.setStrokeStyle(3, COLORS.zoneActive, 0.9);
      } else {
        zone.setFillStyle(COLORS.zone, 0.05);
        zone.setStrokeStyle(2, COLORS.zone, 0.4);
      }
    });

    // --- Полоска шума ---
    const baseW = (this.baseNoise / NOISE.max) * 400;
    const pulseW = (this.pulseNoise / NOISE.max) * 400;
    this.baseBar.width = baseW;
    this.pulseBar.x = GAME_WIDTH / 2 - 200 + baseW;
    this.pulseBar.width = Math.min(pulseW, 400 - baseW);

    // --- Критический режим (гистерезис) ---
    if (this.noiseLevel >= NOISE.critical) {
      this.criticalActive = true;
    } else if (this.noiseLevel <= NOISE.criticalRelease) {
      this.criticalActive = false;
    }

    if (this.criticalActive) {
      const a = 0.10 + Math.abs(Math.sin(time / 140)) * 0.20;
      this.dangerOverlay.fillAlpha = a;
    } else {
      this.dangerOverlay.fillAlpha = Math.max(0, this.dangerOverlay.fillAlpha - 0.025);
    }

    // --- Обновление «последней громкой точки» ---
    if (this.noiseLevel > NOISE.lastKnownThreshold) {
      this.lastKnownX = this.player.x;
      this.lastKnownY = this.player.y;
    }

    // --- HUD ---
    const state = !isMoving ? 'IDLE' : (sprinting ? 'SPRINT' : 'WALK');
    const warn = this.criticalActive ? '   ⚠ ALERT ACTIVE' : '';
    this.hud.setText(
      `STATE ${state}   V ${Math.round(Math.hypot(vx, vy))}\n` +
      `BASE  ${Math.round(this.baseNoise)}%\n` +
      `PULSE ${Math.round(this.pulseNoise)}%\n` +
      `TOTAL ${Math.round(this.noiseLevel)}%${warn}\n` +
      `LAST KNOWN  ${Math.round(this.lastKnownX)} : ${Math.round(this.lastKnownY)}`
    );
  }
}