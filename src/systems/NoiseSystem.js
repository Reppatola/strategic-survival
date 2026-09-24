import Phaser from 'phaser';
import { NOISE_DB, PX_PER_METER, COLORS, ZONE, ZOMBIE_ARCHETYPES } from '../config.js';

// === ШУМ В dB (VISION.md) ===
// итоговый_dB = (база_движения + обувь + поверхность) + импульсы
// dB_на_расстоянии = источник − 20·log10(расстояние_в_м) − глушение_стен
export default class NoiseSystem {
  constructor(scene) {
    this.scene = scene;
    this.base = 0;        // dB: движение + обувь + поверхность
    this.pulse = 0;       // dB: импульсы (выстрелы, удары)
    this.level = 0;       // итоговый уровень, dB
    this.state = 'IDLE';
    this.criticalActive = false;
    this.criticalStartTime = 0;
    this.lastKnownX = 0;
    this.lastKnownY = 0;

    const s = scene;
    this.circle = s.add.circle(0, 0, NOISE_DB.circleMin, 0xff4444, 0.15);
    this.circle.setStrokeStyle(2, 0xff4444, 0.6);
    this.circle.setDepth(-1);

    // Предвычисленные края градиента — без аллокаций в кадре
    this._cGreen = { r: 68, g: 255, b: 68 };
    this._cRed = { r: 255, g: 68, b: 68 };
  }

  addPulse(db) {
    this.pulse = Math.min(NOISE_DB.max, this.pulse + db);
  }

  // Сколько dB от текущего уровня игрока доходит до точки (x, y)
  heardAt(x, y) {
    const p = this.scene.player.sprite;
    let distM = Phaser.Math.Distance.Between(p.x, p.y, x, y) / PX_PER_METER;
    if (distM < 1) distM = 1;
    let db = this.level - NOISE_DB.attenuation * Math.log10(distM);
    db -= this.obstacleDampingBetween(p.x, p.y, x, y);
    return db;
  }

  // Глушение стенами на пути источник → слушатель
  obstacleDampingBetween(x1, y1, x2, y2) {
    const walls = this.scene.walls.getChildren();
    if (!walls.length) return 0;
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    let damp = 0;
    for (const w of walls) {
      if (w.active && Phaser.Geom.Intersects.LineToRectangle(line, w.getBounds())) {
        damp += NOISE_DB.obstacleDamping.wall;
      }
    }
    return damp;
  }

  update(time, delta) {
    const s = this.scene;
    const p = s.player;

    // --- База от движения ---
    let state, baseDb;
    if (p.isMoving && p.isCrouching)      { state = 'CROUCH'; baseDb = NOISE_DB.base.crouch; }
    else if (p.isMoving && p.isSprinting) { state = 'SPRINT'; baseDb = NOISE_DB.base.sprint; }
    else if (p.isMoving)                  { state = 'WALK';   baseDb = NOISE_DB.base.walk; }
    else                                  { state = 'IDLE';   baseDb = 0; }
    this.state = state;

    // --- Модификаторы: обувь + поверхность (VISION.md) ---
    const footwearMod = NOISE_DB.footwear[p.footwear] ?? 0;
    const surface = s.map.surfaceAt(p.sprite.x, p.sprite.y);
    const surfaceMod = NOISE_DB.surface[surface] ?? 0;
    const target = Math.max(0, baseDb + footwearMod + surfaceMod);

    const step = NOISE_DB.baseRampPerSec * (delta / 1000);
    if (this.base < target) this.base = Math.min(target, this.base + step);
    else this.base = Math.max(target, this.base - step);

    // --- Импульсы затухают ---
    this.pulse = Math.max(0, this.pulse - NOISE_DB.pulseDecayPerSec * (delta / 1000));

    this.level = Math.min(NOISE_DB.max, this.base + this.pulse);
    const ratio = this.level / NOISE_DB.max;

    // --- Круг шума: радиус, на котором его ещё слышит «Обычный» ---
    const hearDb = ZOMBIE_ARCHETYPES.normal.hearingThreshold;
    const radiusM = Math.pow(10, (this.level - hearDb) / NOISE_DB.attenuation);
    const radius = Phaser.Math.Clamp(
      radiusM * PX_PER_METER,
      NOISE_DB.circleMin,
      NOISE_DB.circleMaxRadius
    );

    this.circle.setPosition(p.sprite.x, p.sprite.y);
    const pulseAmt = Math.sin(time / 180) * 3;
    this.circle.setRadius(radius + pulseAmt);

    const { r: r0, g: g0, b: b0 } = this._cGreen;
    const { r: r1, g: g1, b: b1 } = this._cRed;
    const tint = Phaser.Display.Color.GetColor(
      Math.round(r0 + (r1 - r0) * ratio),
      Math.round(g0 + (g1 - g0) * ratio),
      Math.round(b0 + (b1 - b0) * ratio)
    );
    this.circle.setFillStyle(tint, 0.05 + ratio * 0.18);
    this.circle.setStrokeStyle(2, tint, 0.35 + ratio * 0.55);

    // --- Зоны: подсветка, если круг шума достаёт ---
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

    // --- Последняя громкая точка ---
    if (this.level >= NOISE_DB.audible) {
      this.lastKnownX = p.sprite.x;
      this.lastKnownY = p.sprite.y;
    }
    s.lastKnownMarker.setPosition(this.lastKnownX, this.lastKnownY);
    s.lastKnownMarker.setScale(1 + Math.sin(time / 250) * 0.15);
    s.lastKnownMarker.setAlpha(0.5 + Math.sin(time / 400) * 0.3);

    // --- Критический режим с гистерезисом ---
    const wasCritical = this.criticalActive;
    if (this.level >= NOISE_DB.critical) this.criticalActive = true;
    else if (this.level <= NOISE_DB.criticalRelease) this.criticalActive = false;

    if (this.criticalActive && !wasCritical) this.criticalStartTime = time;
    if (!this.criticalActive) this.criticalStartTime = 0;

    if (this.criticalActive) {
      s.dangerOverlay.fillAlpha = 0.10 + Math.abs(Math.sin(time / 140)) * 0.20;
    } else {
      s.dangerOverlay.fillAlpha = Math.max(0, s.dangerOverlay.fillAlpha - 0.025);
    }
  }
}