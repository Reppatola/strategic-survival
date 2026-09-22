import Phaser from 'phaser';
import { COLORS, PLAYER, WORLD, ZOMBIE } from '../config.js';

export default class PlayerSystem {
  constructor(scene) {
    this.scene = scene;
    this.hp = 100;
    this.isDead = false;
    this.lastTouch = 0;
    this.isMoving = false;
    this.isCrouching = false;
    this.isSprinting = false;
    this.velocity = 0;
    this.baseScale = 1.4;       // ← было 2, стало меньше
    this.footstepTimer = 0;
    this.swayTime = 0;

    const s = scene;
    this.sprite = s.add.sprite(WORLD.width / 2, WORLD.height / 2, 'player');
    this.sprite.setDisplaySize(PLAYER.size * this.baseScale, PLAYER.size * this.baseScale);
    this.sprite.setDepth(10);
    s.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);
    s.physics.add.collider(this.sprite, s.walls);
  }

  update(time, delta) {
    if (this.isDead) return;
    const keys = this.scene.keys;
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
    this.sprite.body.setVelocity(vx, vy);

    // Поворот в сторону движения
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      this.sprite.setRotation(angle);
    }

    this.isMoving = vx !== 0 || vy !== 0;
    this.isCrouching = isCrouching;
    this.isSprinting = isSprinting;
    this.velocity = Math.hypot(vx, vy);

    // --- Покачивание при ходьбе ---
    let swayY = 1;
    if (this.isMoving) {
      this.swayTime += delta;
      const speedFactor = this.isCrouching ? 140 : (this.isSprinting ? 60 : 90);
      swayY = 1 + Math.sin(this.swayTime / speedFactor) * 0.06;
    } else {
      this.swayTime = 0;
    }

    const sc = PLAYER.size * this.baseScale;
    this.sprite.setDisplaySize(sc, sc * swayY);

    // --- Следы от шагов ---
    this.footstepTimer += delta;
    const stepInterval = this.isCrouching ? 500 : (this.isSprinting ? 130 : 220);
    if (this.isMoving && this.footstepTimer > stepInterval) {
      this.footstepTimer = 0;
      this.spawnFootstep();
    } else if (!this.isMoving) {
      this.footstepTimer = 0;
    }

    // Tint: синий в стелсе
    this.sprite.setTint(isCrouching ? 0x6688ff : 0xffffff);
  }

  spawnFootstep() {
    const s = this.scene;
    // Следы смещены назад по направлению движения, чтобы не «печатались» под ногами
    const f = s.add.circle(this.sprite.x, this.sprite.y, 4, 0x000000, 0.35);
    f.setDepth(1);
    s.tweens.add({
      targets: f,
      alpha: 0,
      scale: 0.4,
      duration: 2500,
      onComplete: () => f.destroy(),
    });
  }

  damage(amount) {
    if (this.isDead) return;
    const now = this.scene.time.now;
    if (now - this.lastTouch < ZOMBIE.touchCooldown) return;
    this.lastTouch = now;
    this.hp -= amount;
    this.scene.cameras.main.shake(120, 0.008);
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }

  die() {
    this.isDead = true;
    this.sprite.body.setVelocity(0, 0);
    if (this.scene.zombies) {
      this.scene.zombies.list.forEach(z => z.sprite.body.setVelocity(0, 0));
    }
  }
}