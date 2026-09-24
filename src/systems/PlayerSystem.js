import Phaser from 'phaser';
import { COLORS, PLAYER, WORLD, ZOMBIE, MELEE, NOISE_DB } from '../config.js';

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
    this.baseScale = 1.4;
    this.footstepTimer = 0;
    this.swayTime = 0;
    this.weaponTimer = null;
    this.aimAngle = 0;        // последнее направление выстрела
    this.lastMeleeTime = 0;
    this.footwear = PLAYER.footwear;   // ключ из NOISE_DB.footwear (позже — из экипировки)

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

    // Поворот в сторону движения
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      this.sprite.setRotation(angle);
      this.aimAngle = angle;
    }

    this.isMoving = vx !== 0 || vy !== 0;
    this.isCrouching = isCrouching;
    this.isSprinting = isSprinting;
    this.velocity = Math.hypot(vx, vy);

    // Покачивание при ходьбе
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

    // Следы
    this.footstepTimer += delta;
    const stepInterval = this.isCrouching ? 500 : (this.isSprinting ? 130 : 220);
    if (this.isMoving && this.footstepTimer > stepInterval) {
      this.footstepTimer = 0;
      this.spawnFootstep();
    } else if (!this.isMoving) {
      this.footstepTimer = 0;
    }

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

  melee() {
    if (this.isDead) return false;
    const s = this.scene;
    const now = s.time.now;
    if (now - this.lastMeleeTime < MELEE.cooldown) return false;
    this.lastMeleeTime = now;

    const px = this.sprite.x;
    const py = this.sprite.y;
    const facing = this.sprite.rotation;
    const halfArc = Phaser.Math.DegToRad(MELEE.arc / 2);
    const halfBack = Phaser.Math.DegToRad(MELEE.backstabAngle / 2);

    let didHit = false;

    // Копия массива — потому что будем удалять зомби в цикле
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
        // Спереди — урон + отбрасывание + оглушение
        didHit = true;
        s.zombies.damage(z, MELEE.damage);
        if (z.sprite.active) {
          const kb = MELEE.knockback;
          z.sprite.body.setVelocity(
            Math.cos(angleToZombie) * kb,
            Math.sin(angleToZombie) * kb
          );
          // ФИКС: оглушаем, чтобы AI не перезаписал velocity в тот же кадр
          z.stunnedUntil = now + MELEE.stunMs;
        }
        // Зомби становится агрессивным — увидел игрока в упор
        z.isAlerted = true;
        z.hasTarget = true;
        z.targetX = px;
        z.targetY = py;
      } else if (diff > Math.PI - halfBack) {
        // ФИКС: СЗАДИ — дуга 120° за спиной, а не «всё кроме переднего конуса»
        didHit = true;
        s.zombies.kill(z);
        s.kills++;
      }
    }

    // Шум от удара в dB (VISION.md: удар кулаком +20 dB)
    s.noise.addPulse(NOISE_DB.impulses.melee);

    // Визуал: вспышка дуги перед игроком
    const arcGfx = s.add.graphics();
    arcGfx.setDepth(9);
    arcGfx.lineStyle(3, didHit ? 0xffffff : 0xffaa44, 0.9);
    arcGfx.beginPath();
    arcGfx.arc(
      px, py,
      MELEE.range,
      facing - halfArc,
      facing + halfArc
    );
    arcGfx.strokePath();
    s.tweens.add({
      targets: arcGfx,
      alpha: 0,
      duration: 180,
      onComplete: () => arcGfx.destroy(),
    });

    return true;
  }

  // Поворот героя в сторону выстрела и смена спрайта
  aimAndFlash(angle) {
    if (this.isDead) return;

    // Поворачиваем героя в сторону выстрела
    this.aimAngle = angle;
    this.sprite.setRotation(angle);

    // Меняем спрайт на «с оружием»
    this.sprite.setTexture('player_gun');
    const sc = PLAYER.size * this.baseScale;
    this.sprite.setDisplaySize(sc, sc);

    // Сбрасываем предыдущий таймер, если есть
    if (this.weaponTimer) this.weaponTimer.remove();

    // Через 280 мс — возвращаем в обычное состояние
    this.weaponTimer = this.scene.time.delayedCall(280, () => {
      if (this.isDead) return;
      this.sprite.setTexture('player');
      const sc2 = PLAYER.size * this.baseScale;
      this.sprite.setDisplaySize(sc2, sc2);
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