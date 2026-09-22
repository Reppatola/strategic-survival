import Phaser from 'phaser';
import { ZOMBIE, WORLD, TERRITORY, NOISE } from '../config.js';

export default class ZombieSystem {
  constructor(scene) {
    this.scene = scene;
    this.list = [];

    const s = scene;
    this.group = s.physics.add.group();
    s.physics.add.collider(this.group, s.walls);
    s.physics.add.collider(this.group, this.group);

    this.visionGfx = s.add.graphics();
    this.visionGfx.setDepth(-1);

    this.spawnStatic();
  }

  spawnStatic() {
    const positions = [
      [500, 400, 0], [900, 700, Math.PI], [1300, 350, Math.PI/2],
      [1500, 900, -Math.PI/2], [700, 1000, Math.PI/4],
      [1200, 800, -Math.PI/4], [400, 500, Math.PI/2], [1700, 600, Math.PI],
    ];
    positions.forEach(([x, y, ang]) => this.create(x, y, ang, true));
  }

  create(x, y, facing, isStatic) {
    const s = this.scene;
    const sprite = s.add.sprite(x, y, 'zombie');
    sprite.setDisplaySize(ZOMBIE.size * 1.4, ZOMBIE.size * 1.4);
    sprite.setRotation(facing);
    sprite.setDepth(5);
    s.physics.add.existing(sprite);
    sprite.body.setAllowGravity(false);
    sprite.body.setCollideWorldBounds(true);
    this.group.add(sprite);

    const data = {
      sprite, facing, isStatic,
      isAlerted: false, hasTarget: false,
      targetX: x, targetY: y,
      jitterX: 0, jitterY: 0,
      hp: ZOMBIE.hp,
    };
    this.list.push(data);
    return data;
  }

  spawnGroupFromEdge() {
    if (this.list.length >= ZOMBIE.maxAlive) return;
    const count = Phaser.Math.Between(ZOMBIE.groupMin, ZOMBIE.groupMax);
    const edge = Phaser.Math.Between(0, 3);
    const m = TERRITORY.edgeMargin;

    for (let i = 0; i < count; i++) {
      if (this.list.length >= ZOMBIE.maxAlive) break;
      let x, y;
      if (edge === 0) { x = Phaser.Math.Between(60, WORLD.width - 60); y = m; }
      else if (edge === 1) { x = WORLD.width - m; y = Phaser.Math.Between(60, WORLD.height - 60); }
      else if (edge === 2) { x = Phaser.Math.Between(60, WORLD.width - 60); y = WORLD.height - m; }
      else { x = m; y = Phaser.Math.Between(60, WORLD.height - 60); }

      const data = this.create(x, y, 0, false);
      data.jitterX = Phaser.Math.Between(-40, 40);
      data.jitterY = Phaser.Math.Between(-40, 40);
      data.targetX = this.scene.noise.lastKnownX + data.jitterX;
      data.targetY = this.scene.noise.lastKnownY + data.jitterY;
      data.hasTarget = true;
    }
  }

  spawnAroundPlayer(count) {
    const s = this.scene;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 250;
      const x = Phaser.Math.Clamp(s.player.sprite.x + Math.cos(angle) * r, 40, WORLD.width - 40);
      const y = Phaser.Math.Clamp(s.player.sprite.y + Math.sin(angle) * r, 40, WORLD.height - 40);
      const data = this.create(x, y, angle, false);
      data.hasTarget = true;
      data.targetX = s.player.sprite.x;
      data.targetY = s.player.sprite.y;
    }
  }

  damage(data, amount) {
    if (!data.sprite.active) return;
    data.hp -= amount;
    // Вспышка урона
    const s = this.scene;
    s.tweens.add({
      targets: data.sprite,
      alpha: 0.4,
      duration: 80,
      yoyo: true,
    });
    if (data.hp <= 0) {
      this.kill(data);
      s.kills++;
    }
  }

  kill(data) {
    const idx = this.list.indexOf(data);
    if (idx !== -1) this.list.splice(idx, 1);
    if (data.sprite.active) data.sprite.destroy();
  }

  count() { return this.list.length; }

  update() {
    const s = this.scene;
    const halfAngle = Phaser.Math.DegToRad(ZOMBIE.visionAngle / 2);
    this.visionGfx.clear();

    for (const z of this.list) {
      if (!z.sprite.active) continue;
      const sx = z.sprite.x, sy = z.sprite.y;
      const px = s.player.sprite.x, py = s.player.sprite.y;

      if (!z.isStatic && s.noise.level > NOISE.lastKnownThreshold) {
        z.targetX = s.noise.lastKnownX + z.jitterX;
        z.targetY = s.noise.lastKnownY + z.jitterY;
        z.hasTarget = true;
      }

      const dist = Phaser.Math.Distance.Between(sx, sy, px, py);
      const toPlayer = Phaser.Math.Angle.Between(sx, sy, px, py);
      const diff = Phaser.Math.Angle.Wrap(toPlayer - z.facing);
      const inCone = Math.abs(diff) < halfAngle;

      if (inCone && dist < ZOMBIE.visionRange) {
        z.isAlerted = true;
        z.targetX = px;
        z.targetY = py;
        z.hasTarget = true;
      } else {
        z.isAlerted = false;
      }

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

      z.sprite.setTint(
        z.isAlerted ? 0xff4444 : (z.isStatic ? 0xffffff : 0xffcccc)
      );

      if (dist < 26) s.player.damage(ZOMBIE.damage);
    }
  }
}