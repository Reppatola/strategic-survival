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
    this.criticalActive = false;

    this.lastKnownX = WORLD.width / 2;
    this.lastKnownY = WORLD.height / 2;

    // --- Мир ---
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.floor)
      .setDepth(-1);

    // --- Зоны ---
    this.zones = [];
    const zoneData = [
      [500, 400], [900, 700], [1300, 350], [1500, 900], [700, 1000],
    ];
    zoneData.forEach(([x, y]) => {
      const circle = this.add.circle(x, y, ZONE.radius, COLORS.zone, 0.05);
      circle.setStrokeStyle(2, COLORS.zone, 0.4);
      circle.setDepth(-1);
      this.zones.push(circle);
    });

    // --- Маркер LAST KNOWN (крестик на карте) ---
    this.lastKnownMarker = this.add.container(this.lastKnownX, this.lastKnownY);
    const crossH = this.add.rectangle(0, 0, 22, 2, COLORS.lastKnown, 1);
    const crossV = this.add.rectangle(0, 0, 2, 22, COLORS.lastKnown, 1);
    const crossRing = this.add.circle(0, 0, 14);
    crossRing.setStrokeStyle(2, COLORS.lastKnown, 0.7);
    this.lastKnownMarker.add([crossH, crossV, crossRing]);
    this.lastKnownMarker.setDepth(2);

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
      up: 'W', down: 'S', left: 'A', right: 'D',
      shift: 'SHIFT',
      crouch: 'C',
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

    // Подсказки
    this.add
      .text(GAME_WIDTH - 12, 10, 'WASD — walk\nSHIFT — sprint\nC — crouch\nLMB — shoot', {
        fontSize: '11px',
        color: '#666666',
        fontFamily: 'Courier New, monospace',
        align: 'right',
      })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.dangerOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(99);
  }

  shoot(pointer) {
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      pointer.worldX, pointer.worldY
    );

    const bullet = this.add.rectangle(
      this.player.x, this.player.y,
      BULLET.size * 2, BULLET.size,
      COLORS.bullet
    );
    bullet.setRotation(angle);
    bullet.setStrokeStyle(1, 0xffffff, 0.8);

    this.physics.add.existing(bullet);
    this.bullets.add(bullet);

    bullet.body.setAllowGravity(false);
    bullet.body.setVelocity(
      Math.cos(angle) * BULLET.speed,
      Math.sin(angle) * BULLET.speed
    );

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

    // Выстрел громкий — выбивает из стелса
    this.pulseNoise = Math.min(NOISE.max, this.pulseNoise + NOISE.shotImpulse);
    this.lastShot = this.time.now;

    this.time.delayedCall(BULLET.lifespan, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  update(time) {
    const keys = this.keys;
    const isCrouching = keys.crouch.isDown;
    const isSprinting = keys.shift.isDown && !isCrouching;

    let speed = PLAYER.walkSpeed;
    if (isCrouching) speed = PLAYER.crouchSpeed;
    else if (isSprinting) speed = PLAYER.sprintSpeed;

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

    // --- Определение состояния ---
    let state, target, ramp;
    if (isMoving && isCrouching) {
      state = 'CROUCH';
      target = NOISE.crouchTarget;
      ramp = NOISE.crouchRamp;
    } else if (isMoving && isSprinting) {
      state = 'SPRINT';
      target = NOISE.sprintTarget;
      ramp = NOISE.sprintRamp;
    } else if (isMoving) {
      state = 'WALK';
      target = NOISE.walkTarget;
      ramp = NOISE.walkRamp;
    } else {
      state = 'IDLE';
      target = 0;
      ramp = NOISE.baseDecay;
    }

    // --- Базовый шум ---
    if (this.baseNoise < target) {
      this.baseNoise = Math.min(target, this.baseNoise + ramp);
    } else {
      this.baseNoise = Math.max(target, this.baseNoise - ramp);
    }

    // --- Импульсный шум ---
    this.pulseNoise = Math.max(0, this.pulseNoise - NOISE.pulseDecay);

    // --- Итог ---
    this.noiseLevel = Math.min(NOISE.max, this.baseNoise + this.pulseNoise);
    const ratio = this.noiseLevel / NOISE.max;

    // --- Визуал игрока: цвет зависит от режима ---
    if (isCrouching) {
      this.player.setFillStyle(COLORS.playerCrouch);
    } else {
      this.player.setFillStyle(COLORS.player);
    }

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

    // --- Зоны ---
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

    // --- Маркер LAST KNOWN ---
    this.lastKnownMarker.setPosition(this.lastKnownX, this.lastKnownY);
    const mkPulse = 1 + Math.sin(time / 250) * 0.15;
    this.lastKnownMarker.setScale(mkPulse);
    this.lastKnownMarker.setAlpha(0.5 + Math.sin(time / 400) * 0.3);

    // --- Полоска шума ---
    const baseW = (this.baseNoise / NOISE.max) * 400;
    const pulseW = (this.pulseNoise / NOISE.max) * 400;
    this.baseBar.width = baseW;
    this.pulseBar.x = GAME_WIDTH / 2 - 200 + baseW;
    this.pulseBar.width = Math.min(pulseW, 400 - baseW);

    // --- Критический режим ---
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

    // --- Обновление LAST KNOWN ---
    if (this.noiseLevel > NOISE.lastKnownThreshold) {
      this.lastKnownX = this.player.x;
      this.lastKnownY = this.player.y;
    }

    // --- HUD ---
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