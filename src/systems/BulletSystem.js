import Phaser from 'phaser';
import { COLORS, BULLET, NOISE_DB, ZOMBIE } from '../config.js';

export default class BulletSystem {
  constructor(scene) {
    this.scene = scene;
    const s = scene;
    this.group = s.physics.add.group();
    s.physics.add.collider(this.group, s.walls, (b) => b.destroy());
  }

  shoot(pointer) {
    if (this.scene.touch && this.scene.touch.enabled) return;
    const s = this.scene;
    if (s.player.isDead) return;
    const p = s.player.sprite;
    const angle = Phaser.Math.Angle.Between(p.x, p.y, pointer.worldX, pointer.worldY);
    this.shootAtAngle(angle);
  }

  shootAtAngle(angle) {
    const s = this.scene;
    if (s.player.isDead) return;
    const p = s.player.sprite;

    const bullet = s.add.rectangle(p.x, p.y, BULLET.size * 2, BULLET.size, COLORS.bullet);
    bullet.setRotation(angle);
    bullet.setStrokeStyle(1, 0xffffff, 0.8);
    s.physics.add.existing(bullet);
    this.group.add(bullet);
    bullet.body.setAllowGravity(false);
    bullet.body.setVelocity(
      Math.cos(angle) * BULLET.speed,
      Math.sin(angle) * BULLET.speed
    );

    const flash = s.add.rectangle(p.x, p.y, 24, 3, 0xffee66, 0.9)
      .setOrigin(0, 0.5).setRotation(angle);
    s.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });

    s.player.aimAndFlash(angle);
    // Выстрел из пистолета: +110 dB (VISION.md)
    s.noise.addPulse(NOISE_DB.impulses.pistol);

    if (s.noise.criticalActive && !s.territory.locked) {
      s.zombies.spawnGroupFromEdge();
    }

    s.time.delayedCall(BULLET.lifespan, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  update() {
    const bullets = this.group.getChildren();
    for (const b of bullets) {
      if (!b.active) continue;
      for (const z of this.scene.zombies.list) {
        if (!z.sprite.active || !b.active) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, z.sprite.x, z.sprite.y) < 18) {
          b.destroy();
          this.scene.zombies.damage(z, ZOMBIE.hp); // пуля мгновенно убивает
          this.scene.cameras.main.shake(60, 0.003);
          break;
        }
      }
    }
  }
}