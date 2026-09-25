import Phaser from 'phaser';
import { COLORS, PLAYER, WORLD, ZOMBIE, MELEE, NOISE_DB } from '../config.js';

const DIRS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
const WALK_FRAMES = 31;
const FRAME_DURATION = 40;   // мс на кадр анимации
const GLOW_ALPHA = 0.35;     // сила подсветки героя (0.2 — слабо, 0.5 — сильно)

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
    this.baseScale = 4.5;
    this.footstepTimer = 0;
    this.weaponTimer = null;
    this.aimAngle = 0;
    this.lastMeleeTime = 0;
    this.footwear = PLAYER.footwear;

    // Направление и анимация
    this.facing = 's';
    this.facingAngle = Math.PI / 2;
    this.frame = 1;
    this.animTimer = 0;

    const s = scene;

    // === ГЛАВНЫЙ СПРАЙТ ГЕРОЯ ===
    this.sprite = s.add.sprite(WORLD.width / 2, WORLD.height / 2, 'hero_idle_s');
    this.sprite.setDisplaySize(PLAYER.size * this.baseScale, PLAYER.size * this.baseScale);
    this.sprite.setDepth(10);

    // === СЛОЙ ПОДСВЕТКИ (поверх спрайта, blend ADD) ===
    this.glow = s.add.sprite(
      WORLD.width / 2, WORLD.height / 2,
      'hero_idle_s'
    );
    this.glow.setDisplaySize(PLAYER.size * this.baseScale, PLAYER.size * this.baseScale);
    this.glow.setDepth(10.01);
    this.glow.setAlpha(GLOW_ALPHA);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);

    // Физика — на основном спрайте
    s.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    // Хитбокс — 20×20, в нижней части спрайта
    this.sprite.body.setSize(20, 20);
    this.sprite.body.setOffset(22, 44);

    s.physics.add.collider(this.sprite, s.walls);
  }

  update(time, delta) {
    if (this.isDead) return;
    const s = this.scene;
    const useTouch = s.touch && s.touch.enabled;

    const isCrouching = useTouch ? s.touch.crouchPressed : s.keys.crouch.isDown;
    const isSprinting = useTouch ? (s.touch.sprintPressed && !isCrouching) : (s.keys.shift.isDown && !isCrouching);

    let speed = PLAYER.walkSpeed;
    if (isCrouching) speed = PLAYER.crouchSpeed;
    else if (isSprinting) speed = PLAYER.sprintSpeed;

    let vx = 0, vy = 0;
    if (useTouch) {
      vx = s.touch.moveX * speed;
      vy = s.touch.moveY * speed;
    } else {
      if (s.keys.left.isDown) vx -= speed;
      if (s.keys.right.isDown) vx += speed;
      if (s.keys.up.isDown) vy -= speed;
      if (s.keys.down.isDown) vy += speed;
      if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
    }

    this.sprite.body.setVelocity(vx, vy);

    const isMoving = vx !== 0 || vy !== 0;

    // === Направление ===
    if (isMoving) {
      const angle = Math.atan2(vy, vx);
      const octant = Math.round(angle / (Math.PI / 4));
      const dirIndex = (octant + 6 + 8) % 8;
      this.facing = DIRS[dirIndex];
      this.facingAngle = angle;
    }

    this.isMoving = isMoving;
    this.isCrouching = isCrouching;
    this.isSprinting = isSprinting;
    this.velocity = Math.hypot(vx, vy);

    // === Анимация ===
    if (isMoving) {
      this.animTimer += delta;
      if (this.animTimer >= FRAME_DURATION) {
        this.animTimer -= FRAME_DURATION;
        this.frame = (this.frame % WALK_FRAMES) + 1;
      }
      this.sprite.setTexture(`hero_walk_${this.facing}_${this.frame}`);
    } else {
      this.sprite.setTexture(`hero_idle_${this.facing}`);
      this.frame = 1;
      this.animTimer = 0;
    }

    const sc = PLAYER.size * this.baseScale;
    this.sprite.setDisplaySize(sc, sc);

    // === Следы от шагов ===
    this.footstepTimer += delta;
    const stepInterval = this.isCrouching ? 500 : (this.isSprinting ? 130 : 220);
    if (isMoving && this.footstepTimer > stepInterval) {
      this.footstepTimer = 0;
      this.spawnFootstep();
    } else if (!isMoving) {
      this.footstepTimer = 0;
    }

    // === Tint стелса ===
    this.sprite.setTint(isCrouching ? 0x6688ff : 0xffffff);

    // === СИНХРОНИЗАЦИЯ ПОДСВЕТКИ ===
    this.glow.x = this.sprite.x;
    this.glow.y = this.sprite.y;
    if (this.glow.texture.key !== this.sprite.texture.key) {
      this.glow.setTexture(this.sprite.texture.key);
    }
    this.glow.setDisplaySize(this.sprite.displayWidth, this.sprite.displayHeight);
    this.glow.setTint(this.sprite.tintTopLeft || 0xffffff);
  }

  spawnFootstep() {
    const s = this.scene;
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

  melee() {
    if (this.isDead) return false;
    const s = this.scene;
    const now = s.time.now;
    if (now - this.lastMeleeTime < MELEE.cooldown) return false;
    this.lastMeleeTime = now;

    const px = this.sprite.x;
    const py = this.sprite.y;
    const facing = this.facingAngle;
    const halfArc = Phaser.Math.DegToRad(MELEE.arc / 2);
    const halfBack = Phaser.Math.DegToRad(MELEE.backstabAngle / 2);

    let didHit = false;
    const zombieList = [...s.zombies.list];

    for (const z of zombieList) {
      if (!z.sprite.active) continue;
      const dx = z.sprite.x - px;
      const dy = z.sprite.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > MELEE.range) continue;

      const angleToZombie = Math.atan2(dy, dx);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(angleToZombie - facing));

      if (diff < halfArc) {
        didHit = true;
        s.zombies.damage(z, MELEE.damage);
        if (z.sprite.active) {
          const kb = MELEE.knockback;
          z.sprite.body.setVelocity(
            Math.cos(angleToZombie) * kb,
            Math.sin(angleToZombie) * kb
          );
          z.stunnedUntil = now + MELEE.stunMs;
        }
        z.isAlerted = true;
        z.hasTarget = true;
        z.targetX = px;
        z.targetY = py;
      } else if (diff > Math.PI - halfBack) {
        didHit = true;
        s.zombies.kill(z);
        s.kills++;
      }
    }

    s.noise.addPulse(NOISE_DB.impulses.melee);

    const arcGfx = s.add.graphics();
    arcGfx.setDepth(9);
    arcGfx.lineStyle(3, didHit ? 0xffffff : 0xffaa44, 0.9);
    arcGfx.beginPath();
    arcGfx.arc(px, py, MELEE.range, facing - halfArc, facing + halfArc);
    arcGfx.strokePath();
    s.tweens.add({
      targets: arcGfx,
      alpha: 0,
      duration: 180,
      onComplete: () => arcGfx.destroy(),
    });

    return true;
  }

  aimAndFlash(angle) {
    if (this.isDead) return;

    this.aimAngle = angle;
    this.facingAngle = angle;

    const octant = Math.round(angle / (Math.PI / 4));
    const dirIndex = (octant + 6 + 8) % 8;
    this.facing = DIRS[dirIndex];

    if (this.weaponTimer) this.weaponTimer.remove();

    this.sprite.setTexture(`hero_idle_${this.facing}`);
    this.sprite.setTint(0xffdd66);

    this.weaponTimer = this.scene.time.delayedCall(280, () => {
      if (this.isDead) return;
      this.sprite.setTint(this.isCrouching ? 0x6688ff : 0xffffff);
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
    if (this.glow) this.glow.setVisible(false);
    if (this.scene.zombies) {
      this.scene.zombies.list.forEach(z => z.sprite.body.setVelocity(0, 0));
    }
  }
}