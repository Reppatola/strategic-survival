import Phaser from 'phaser';
import { NOISE, WORLD, COLORS, ZONE } from '../config.js';

export default class NoiseSystem {
  constructor(scene) {
    this.scene = scene;
    this.base = 0;
    this.pulse = 0;
    this.level = 0;
    this.state = 'IDLE';
    this.criticalActive = false;
    this.criticalStartTime = 0;
    this.lastKnownX = WORLD.width / 2;
    this.lastKnownY = WORLD.height / 2;
    this.tint = 0x44ff44;

    const s = scene;
    this.circle = s.add.circle(0, 0, NOISE.circleMin, 0xff4444, 0.15);
    this.circle.setStrokeStyle(2, 0xff4444, 0.6);
    this.circle.setDepth(-1);
  }

  addPulse(amount) {
    this.pulse = Math.min(NOISE.max, this.pulse + amount);
  }

  update(time) {
    const s = this.scene;
    const p = s.player;

    let state, target, ramp;
    if (p.isMoving && p.isCrouching) { state = 'CROUCH'; target = NOISE.crouchTarget; ramp = NOISE.crouchRamp; }
    else if (p.isMoving && p.isSprinting) { state = 'SPRINT'; target = NOISE.sprintTarget; ramp = NOISE.sprintRamp; }
    else if (p.isMoving) { state = 'WALK'; target = NOISE.walkTarget; ramp = NOISE.walkRamp; }
    else { state = 'IDLE'; target = 0; ramp = NOISE.baseDecay; }
    this.state = state;

    if (this.base < target) this.base = Math.min(target, this.base + ramp);
    else this.base = Math.max(target, this.base - ramp);

    this.pulse = Math.max(0, this.pulse - NOISE.pulseDecay);
    this.level = Math.min(NOISE.max, this.base + this.pulse);
    const ratio = this.level / NOISE.max;

    const radius = Phaser.Math.Linear(NOISE.circleMin, NOISE.circleMax, ratio);
    this.circle.setPosition(p.sprite.x, p.sprite.y);
    this.circle.setRadius(radius);
    const pulseAmt = Math.sin(time / 180) * 3;
    this.circle.setScale((radius + pulseAmt) / Math.max(radius, 1));

    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(68, 255, 68),
      new Phaser.Display.Color(255, 68, 68),
      100, ratio * 100
    );
    const tint = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
    this.tint = tint;
    this.circle.setFillStyle(tint, 0.05 + ratio * 0.18);
    this.circle.setStrokeStyle(2, tint, 0.35 + ratio * 0.55);

    s.zones.forEach(zone => {
      const d = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, zone.x, zone.y);
      if (d < radius + ZONE.radius) {
        zone.setFillStyle(COLORS.zoneActive, 0.15 + ratio * 0.15);
        zone.setStrokeStyle(3, COLORS.zoneActive, 0.9);
      } else {
        zone.setFillStyle(COLORS.zone, 0.05);
        zone.setStrokeStyle(2, COLORS.zone, 0.4);
      }
    });

    if (this.level > NOISE.lastKnownThreshold) {
      this.lastKnownX = p.sprite.x;
      this.lastKnownY = p.sprite.y;
    }
    s.lastKnownMarker.setPosition(this.lastKnownX, this.lastKnownY);
    s.lastKnownMarker.setScale(1 + Math.sin(time / 250) * 0.15);
    s.lastKnownMarker.setAlpha(0.5 + Math.sin(time / 400) * 0.3);

    const wasCritical = this.criticalActive;
    if (this.level >= NOISE.critical) this.criticalActive = true;
    else if (this.level <= NOISE.criticalRelease) this.criticalActive = false;

    if (this.criticalActive && !wasCritical) this.criticalStartTime = time;
    if (!this.criticalActive) this.criticalStartTime = 0;

    if (this.criticalActive) {
      const a = 0.10 + Math.abs(Math.sin(time / 140)) * 0.20;
      s.dangerOverlay.fillAlpha = a;
    } else {
      s.dangerOverlay.fillAlpha = Math.max(0, s.dangerOverlay.fillAlpha - 0.025);
    }
  }
}