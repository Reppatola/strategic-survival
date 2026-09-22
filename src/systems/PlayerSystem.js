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

    const s = scene;
    this.sprite = s.add.sprite(WORLD.width / 2, WORLD.height / 2, 'player');
    this.sprite.setDisplaySize(PLAYER.size * 2, PLAYER.size * 2);
    this.sprite.setDepth(10);
    s.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);
    s.physics.add.collider(this.sprite, s.walls);
  }

  update() {
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
    // Поворот спрайта в сторону движения
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      this.sprite.setRotation(angle);
    }

    this.isMoving = vx !== 0 || vy !== 0;
    this.isCrouching = isCrouching;
    this.isSprinting = isSprinting;
    this.velocity = Math.hypot(vx, vy);

        this.sprite.setTint(isCrouching ? 0x6688ff : 0xffffff);
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