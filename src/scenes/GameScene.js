import Phaser from 'phaser';
import {
  COLORS, PLAYER, WORLD, NOISE, BULLET, ZONE,
  ZOMBIE, TERRITORY, GAME_WIDTH, GAME_HEIGHT,
} from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // --- состояние ---
    this.baseNoise = 0;
    this.pulseNoise = 0;
    this.noiseLevel = 0;
    this.criticalActive = false;
    this.criticalStartTime = 0;
    this.kills = 0;
    this.hp = 100;
    this.lastTouch = 0;
    this.isDead = false;
    this.territoryLocked = false;
    this.silentStart = 0;
    this.lockSpawnTime = 0;

    this.lastKnownX = WORLD.width / 2;
    this.lastKnownY = WORLD.height / 2;

    // --- мир ---
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.floor).setDepth(-3);

    // --- зоны ---
    this.zones = [];
    [[500,400],[900,700],[1300,350],[1500,900],[700,1000]].forEach(([x, y]) => {
      const c = this.add.circle(x, y, ZONE.radius, COLORS.zone, 0.05);
      c.setStrokeStyle(2, COLORS.zone, 0.4);
      c.setDepth(-2);
      this.zones.push(c);
    });

    // --- маркер LAST KNOWN ---
    this.lastKnownMarker = this.add.container(this.lastKnownX, this.lastKnownY);
    this.lastKnownMarker.add([
      this.add.rectangle(0, 0, 22, 2, COLORS.lastKnown, 1),
      this.add.rectangle(0, 0, 2, 22, COLORS.lastKnown, 1),
    ]);
    this.lastKnownMarker.setDepth(2);

    // --- игрок ---
    this.player = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, PLAYER.size, PLAYER.size, COLORS.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.lastKnownX = this.player.x;
    this.lastKnownY = this.player.y;

    // --- круг шума ---
    this.noiseCircle = this.add.circle(this.player.x, this.player.y, NOISE.circleMin, 0xff4444, 0.15);
    this.noiseCircle.setStrokeStyle(2, 0xff4444, 0.6);
    this.noiseCircle.setDepth(-1);

    // --- стены ---
    this.walls = this.physics.add.staticGroup();
    [
      [400,300,200,30],[800,500,30,300],[1200,400,250,30],[1500,800,30,250],
      [600,900,300,30],[1000,200,30,200],[1600,300,200,30],[300,800,30,200],[1300,1000,200,30],
    ].forEach(([x, y, w, h]) => {
      const w2 = this.add.rectangle(x, y, w, h, COLORS.wall);
      w2.setStrokeStyle(2, COLORS.wallEdge);
      this.physics.add.existing(w2, true);
      this.walls.add(w2);
    });
    this.physics.add.collider(this.player, this.walls);

    // --- зомби (группа для физики + массив данных) ---
    this.zombieGroup = this.physics.add.group();
    this.zombies = [];
    this.physics.add.collider(this.zombieGroup, this.walls);
    this.physics.add.collider(this.zombieGroup, this.zombieGroup);

    // --- графика конусов обзора (одна на всех) ---
    this.visionGfx = this.add.graphics();
    this.visionGfx.setDepth(-1);

    // --- пули ---
    this.bullets = this.physics.add.group();
    this.physics.add.collider(this.bullets, this.walls, (b) => b.destroy());

    // --- статичные стражи ---
    this.spawnStaticZombies();

    // --- управление ---
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      shift: 'SHIFT', crouch: 'C',
    });
    this.input.on('pointerdown', (p) => this.shoot(p));
    this.input.keyboard.on('keydown-R', () => { if (this.isDead) this.scene.restart(); });

    // --- камера ---
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // --- HUD ---
    this.hud = this.add.text(12, 10, '', {
      fontSize: '13px', color: '#88ff88', fontFamily: 'Courier New, monospace',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(100);

    this.noiseBarBg = this.add.rectangle(GAME_WIDTH/2, 24, 400, 16, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x444444);
    this.baseBar = this.add.rectangle(GAME_WIDTH/2 - 200, 24, 0, 10, 0xffcc44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.pulseBar = this.add.rectangle(GAME_WIDTH/2 - 200, 24, 0, 10, 0xff4444)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);
    this.add.text(GAME_WIDTH/2, 24, 'NOISE', {
      fontSize: '11px', color: '#fff', fontFamily: 'Courier New, monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103);

    this.hpBarBg = this.add.rectangle(GAME_WIDTH/2, 46, 400, 12, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x444444);
    this.hpBar = this.add.rectangle(GAME_WIDTH/2 - 200, 46, 400, 8, 0x44ff44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.add.text(GAME_WIDTH - 12, 10, 'WASD walk · SHIFT sprint · C crouch · LMB shoot', {
      fontSize: '11px', color: '#666', fontFamily: 'Courier New, monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.dangerOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(99);

    this.territoryBorder = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(98);
    this.territoryBorder.setStrokeStyle(10, 0xff0000, 0.85);
    this.territoryBorder.setVisible(false);

    this.gameOverText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2, '', {
      fontSize: '40px', color: '#ff4444', fontFamily: 'Courier New, monospace',
      align: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: { x: 30, y: 20 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  // ============ ЗОМБИ ============

  spawnStaticZombies() {
    const positions = [
      [500, 400, 0], [900, 700, Math.PI], [1300, 350, Math.PI/2],
      [1500, 900, -Math.PI/2], [700, 1000, Math.PI/4],
      [1200, 800, -Math.PI/4], [400, 500, Math.PI/2], [1700, 600, Math.PI],
    ];
    positions.forEach(([x, y, ang]) => this.createZombie(x, y, ang, true));
  }

  createZombie(x, y, facing, isStatic) {
    const sprite = this.add.rectangle(x, y, ZOMBIE.size, ZOMBIE.size, ZOMBIE.colorStatic);
    sprite.setStrokeStyle(2, 0x660000);
    sprite.setRotation(facing);
    this.physics.add.existing(sprite);
    sprite.body.setAllowGravity(false);
    sprite.body.setCollideWorldBounds(true);
    this.zombieGroup.add(sprite);

    const data = {
      sprite,
      facing,
      isStatic,
      isAlerted: false,
      hasTarget: false,
      targetX: x, targetY: y,
      jitterX: 0, jitterY: 0,
    };
    sprite.zombieData = data;
    this.zombies.push(data);
    return data;
  }

  spawnZombieGroupFromEdge() {
    if (this.zombies.length >= ZOMBIE.maxAlive) return;
    const count = Phaser.Math.Between(ZOMBIE.groupMin, ZOMBIE.groupMax);
    const edge = Phaser.Math.Between(0, 3);
    const m = TERRITORY.edgeMargin;

    for (let i = 0; i < count; i++) {
      if (this.zombies.length >= ZOMBIE.maxAlive) break;
      let x, y;
      if (edge === 0) { x = Phaser.Math.Between(60, WORLD.width - 60); y = m; }
      else if (edge === 1) { x = WORLD.width - m; y = Phaser.Math.Between(60, WORLD.height - 60); }
      else if (edge === 2) { x = Phaser.Math.Between(60, WORLD.width - 60); y = WORLD.height - m; }
      else { x = m; y = Phaser.Math.Between(60, WORLD.height - 60); }

      const data = this.createZombie(x, y, 0, false);
      data.jitterX = Phaser.Math.Between(-40, 40);
      data.jitterY = Phaser.Math.Between(-40, 40);
      data.targetX = this.lastKnownX + data.jitterX;
      data.targetY = this.lastKnownY + data.jitterY;
      data.hasTarget = true;
    }
  }

  killZombie(data) {
    const idx = this.zombies.indexOf(data);
    if (idx !== -1) this.zombies.splice(idx, 1);
    if (data.sprite.active) data.sprite.destroy();
  }

  // ============ СТРЕЛЬБА ============

  shoot(pointer) {
    if (this.isDead) return;
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      pointer.worldX, pointer.worldY
    );

    const bullet = this.add.rectangle(
      this.player.x, this.player.y,
      BULLET.size * 2, BULLET.size, COLORS.bullet
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

    const flash = this.add.rectangle(this.player.x, this.player.y, 24, 3, 0xffee66, 0.9)
      .setOrigin(0, 0.5).setRotation(angle);
    this.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });

    this.pulseNoise = Math.min(NOISE.max, this.pulseNoise + NOISE.shotImpulse);

    // КРИТ + каждый выстрел = новая волна с края
    if (this.criticalActive) {
      this.spawnZombieGroupFromEdge();
    }

    this.time.delayedCall(BULLET.lifespan, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  // ============ УРОН ============

  damagePlayer() {
    if (this.isDead) return;
    const now = this.time.now;
    if (now - this.lastTouch < ZOMBIE.touchCooldown) return;
    this.lastTouch = now;
    this.hp -= ZOMBIE.damage;
    this.cameras.main.shake(120, 0.008);
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }

  die() {
    this.isDead = true;
    this.player.body.setVelocity(0, 0);
    this.zombies.forEach(z => z.sprite.body.setVelocity(0, 0));
    this.gameOverText.setText(`YOU DIED\nKills: ${this.kills}\nPress R`).setVisible(true);
  }

  // ============ UPDATE ============

  update(time) {
    if (this.isDead) return;
    this.updatePlayer();
    this.updateNoise(time);
    this.updateZombies();
    this.updateBullets();
    this.updateTerritory(time);
    this.updateHUD();
  }

  updatePlayer() {
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
    if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
    this.player.body.setVelocity(vx, vy);

    this.isMoving = vx !== 0 || vy !== 0;
    this.isCrouching = isCrouching;
    this.isSprinting = isSprinting;
    this.playerVel = Math.hypot(vx, vy);

    this.player.setFillStyle(isCrouching ? COLORS.playerCrouch : COLORS.player);
  }

  updateNoise(time) {
    let state, target, ramp;
    if (this.isMoving && this.isCrouching) { state = 'CROUCH'; target = NOISE.crouchTarget; ramp = NOISE.crouchRamp; }
    else if (this.isMoving && this.isSprinting) { state = 'SPRINT'; target = NOISE.sprintTarget; ramp = NOISE.sprintRamp; }
    else if (this.isMoving) { state = 'WALK'; target = NOISE.walkTarget; ramp = NOISE.walkRamp; }
    else { state = 'IDLE'; target = 0; ramp = NOISE.baseDecay; }
    this.state = state;

    if (this.baseNoise < target) this.baseNoise = Math.min(target, this.baseNoise + ramp);
    else this.baseNoise = Math.max(target, this.baseNoise - ramp);

    this.pulseNoise = Math.max(0, this.pulseNoise - NOISE.pulseDecay);
    this.noiseLevel = Math.min(NOISE.max, this.baseNoise + this.pulseNoise);
    const ratio = this.noiseLevel / NOISE.max;

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

    this.zones.forEach(zone => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
      if (d < radius + ZONE.radius) {
        zone.setFillStyle(COLORS.zoneActive, 0.15 + ratio * 0.15);
        zone.setStrokeStyle(3, COLORS.zoneActive, 0.9);
      } else {
        zone.setFillStyle(COLORS.zone, 0.05);
        zone.setStrokeStyle(2, COLORS.zone, 0.4);
      }
    });

    if (this.noiseLevel > NOISE.lastKnownThreshold) {
      this.lastKnownX = this.player.x;
      this.lastKnownY = this.player.y;
    }
    this.lastKnownMarker.setPosition(this.lastKnownX, this.lastKnownY);
    this.lastKnownMarker.setScale(1 + Math.sin(time / 250) * 0.15);
    this.lastKnownMarker.setAlpha(0.5 + Math.sin(time / 400) * 0.3);

    const baseW = (this.baseNoise / NOISE.max) * 400;
    const pulseW = (this.pulseNoise / NOISE.max) * 400;
    this.baseBar.width = baseW;
    this.pulseBar.x = GAME_WIDTH / 2 - 200 + baseW;
    this.pulseBar.width = Math.min(pulseW, 400 - baseW);

    const wasCritical = this.criticalActive;
    if (this.noiseLevel >= NOISE.critical) this.criticalActive = true;
    else if (this.noiseLevel <= NOISE.criticalRelease) this.criticalActive = false;

    if (this.criticalActive && !wasCritical) this.criticalStartTime = time;
    if (!this.criticalActive) this.criticalStartTime = 0;

    if (this.criticalActive) {
      const a = 0.10 + Math.abs(Math.sin(time / 140)) * 0.20;
      this.dangerOverlay.fillAlpha = a;
    } else {
      this.dangerOverlay.fillAlpha = Math.max(0, this.dangerOverlay.fillAlpha - 0.025);
    }
  }

  updateZombies() {
    const halfAngle = Phaser.Math.DegToRad(ZOMBIE.visionAngle / 2);
    this.visionGfx.clear();

    for (const z of this.zombies) {
      if (!z.sprite.active) continue;
      const sx = z.sprite.x, sy = z.sprite.y;

      // Динамические зомби слышат шум (статичные — нет, только зрение)
      if (!z.isStatic && this.noiseLevel > NOISE.lastKnownThreshold) {
        z.targetX = this.lastKnownX + z.jitterX;
        z.targetY = this.lastKnownY + z.jitterY;
        z.hasTarget = true;
      }

      // Проверка зрения (все зомби)
      const dist = Phaser.Math.Distance.Between(sx, sy, this.player.x, this.player.y);
      const toPlayer = Phaser.Math.Angle.Between(sx, sy, this.player.x, this.player.y);
      const diff = Phaser.Math.Angle.Wrap(toPlayer - z.facing);
      const inCone = Math.abs(diff) < halfAngle;

      if (inCone && dist < ZOMBIE.visionRange) {
        z.isAlerted = true;
        z.targetX = this.player.x;
        z.targetY = this.player.y;
        z.hasTarget = true;
      } else {
        z.isAlerted = false;
      }

      // Движение
      if (z.hasTarget) {
        const dx = z.targetX - sx, dy = z.targetY - sy;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          const nx = dx / d, ny = dy / d;
          z.sprite.body.setVelocity(nx * ZOMBIE.speed, ny * ZOMBIE.speed);
          z.facing = Math.atan2(ny, nx);
          z.sprite.setRotation(z.facing);
        } else {
          z.sprite.body.setVelocity(0, 0);
          if (!z.isStatic) { z.facing += 0.01; z.sprite.setRotation(z.facing); }
        }
      } else {
        z.sprite.body.setVelocity(0, 0);
      }

      // Конус обзора
      const range = ZOMBIE.visionRange;
      const x1 = sx + Math.cos(z.facing - halfAngle) * range;
      const y1 = sy + Math.sin(z.facing - halfAngle) * range;
      const x2 = sx + Math.cos(z.facing + halfAngle) * range;
      const y2 = sy + Math.sin(z.facing + halfAngle) * range;

      const fillColor = z.isAlerted ? 0xff2222 : 0xff5555;
      const fillAlpha = z.isAlerted ? 0.22 : 0.10;
      this.visionGfx.fillStyle(fillColor, fillAlpha);
      this.visionGfx.fillTriangle(sx, sy, x1, y1, x2, y2);
      this.visionGfx.lineStyle(1, fillColor, 0.5);
      this.visionGfx.strokeTriangle(sx, sy, x1, y1, x2, y2);

      // Цвет спрайта
      z.sprite.setFillStyle(
        z.isAlerted ? ZOMBIE.colorAlerted : (z.isStatic ? ZOMBIE.colorStatic : ZOMBIE.colorSpawned)
      );

      // Касание
      if (dist < 26) this.damagePlayer();
    }
  }

  updateBullets() {
    const bullets = this.bullets.getChildren();
    for (const b of bullets) {
      if (!b.active) continue;
      for (const z of this.zombies) {
        if (!z.sprite.active || !b.active) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, z.sprite.x, z.sprite.y) < 18) {
          b.destroy();
          this.killZombie(z);
          this.kills++;
          this.cameras.main.shake(60, 0.003);
          break;
        }
      }
    }
  }

  updateTerritory(time) {
    // Триггер лока
    if (this.criticalActive && this.criticalStartTime > 0 && !this.territoryLocked) {
      if (time - this.criticalStartTime > TERRITORY.lockAfterCriticalMs) {
        this.lockTerritory();
      }
    }

    // Разлок при долгой тишине
    if (this.territoryLocked) {
      if (this.noiseLevel <= NOISE.criticalRelease) {
        if (this.silentStart === 0) this.silentStart = time;
        else if (time - this.silentStart > TERRITORY.silentToUnlockMs) {
          this.unlockTerritory();
        }
      } else {
        this.silentStart = 0;
      }
    }

    // Периодический доп-спавн при локе
    if (this.territoryLocked) {
      if (time - this.lockSpawnTime > TERRITORY.lockSpawnInterval) {
        this.lockSpawnTime = time;
        this.spawnZombieGroupFromEdge();
      }
    }
  }

  lockTerritory() {
    this.territoryLocked = true;
    this.territoryBorder.setVisible(true);
    this.silentStart = 0;
    this.lockSpawnTime = this.time.now;

    for (let i = 0; i < TERRITORY.zombieSpawnOnLock; i++) {
      const angle = (i / TERRITORY.zombieSpawnOnLock) * Math.PI * 2;
      const r = 250;
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * r, 40, WORLD.width - 40);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * r, 40, WORLD.height - 40);
      const data = this.createZombie(x, y, angle, false);
      data.hasTarget = true;
      data.targetX = this.player.x;
      data.targetY = this.player.y;
    }
  }

  unlockTerritory() {
    this.territoryLocked = false;
    this.territoryBorder.setVisible(false);
    this.silentStart = 0;
    this.criticalStartTime = 0;
  }

  updateHUD() {
    const hpRatio = this.hp / 100;
    this.hpBar.width = 400 * hpRatio;
    this.hpBar.fillColor = hpRatio > 0.5 ? 0x44ff44 : (hpRatio > 0.25 ? 0xffaa44 : 0xff4444);

    let warn = '';
    if (this.territoryLocked) warn = '\n⚠ TERRITORY LOCKED — 5s silence to unlock';
    else if (this.criticalActive) warn = '   ⚠ ALERT';

    this.hud.setText(
      `STATE ${this.state}   V ${Math.round(this.playerVel)}\n` +
      `BASE  ${Math.round(this.baseNoise)}%\n` +
      `PULSE ${Math.round(this.pulseNoise)}%\n` +
      `TOTAL ${Math.round(this.noiseLevel)}%${warn}\n` +
      `HP ${this.hp}   KILLS ${this.kills}   ZOMBIES ${this.zombies.length}\n` +
      `LAST KNOWN  ${Math.round(this.lastKnownX)} : ${Math.round(this.lastKnownY)}`
    );
  }
}