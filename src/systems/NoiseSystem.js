import * as THREE from 'three';
import { NOISE, COLORS } from '../config.js';

export default class NoiseSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.base = 0;
    this.pulse = 0;
    this.level = 0;
    this.state = 'IDLE';
    this.criticalActive = false;
    this.criticalStartTime = 0;
    this.lastKnownX = 0;
    this.lastKnownZ = 0;

    // Визуальное кольцо на земле
    const ringGeom = new THREE.RingGeometry(0.9, 1.0, 48);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeom, this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    scene.add(this.ring);

    // Маркер LAST KNOWN — крестик на земле
    this.markerGroup = new THREE.Group();
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0xff4488,
      transparent: true,
      opacity: 0.8,
    });
    const bar1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), crossMat);
    bar1.rotation.x = -Math.PI / 2;
    const bar2 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), crossMat);
    bar2.rotation.x = -Math.PI / 2;
    this.markerGroup.add(bar1, bar2);
    this.markerGroup.position.y = 0.08;
    this.markerGroup.visible = false;
    scene.add(this.markerGroup);

    this.crossMat = crossMat;
  }

  addPulse(amount) {
    this.pulse = Math.min(NOISE.max, this.pulse + amount);
  }

  update(dt, time, input) {
    const p = this.player;

    // --- Состояние ---
    let target, ramp;
    const moving = p.speed > 0.1;

    if (moving && input.crouch) { target = NOISE.crouchTarget; ramp = NOISE.crouchRamp; this.state = 'CROUCH'; }
    else if (moving && input.sprint) { target = NOISE.sprintTarget; ramp = NOISE.sprintRamp; this.state = 'SPRINT'; }
    else if (moving) { target = NOISE.walkTarget; ramp = NOISE.walkRamp; this.state = 'WALK'; }
    else { target = 0; ramp = NOISE.baseDecay; this.state = 'IDLE'; }

    // --- Базовый шум ---
    if (this.base < target) this.base = Math.min(target, this.base + ramp * dt * 60);
    else this.base = Math.max(target, this.base - ramp * dt * 60);

    // --- Импульсный шум ---
    this.pulse = Math.max(0, this.pulse - NOISE.pulseDecay * dt * 60);

    // --- Итог ---
    this.level = Math.min(NOISE.max, this.base + this.pulse);
    const ratio = this.level / NOISE.max;

    // --- Кольцо ---
    const radius = THREE.MathUtils.lerp(NOISE.circleMin, NOISE.circleMax, ratio);
    this.ring.position.x = p.mesh.position.x;
    this.ring.position.z = p.mesh.position.z;
    this.ring.scale.set(radius, radius, radius);

    // Пульсация
    const pulseAmt = 1 + Math.sin(time * 0.005) * 0.03;
    this.ring.scale.multiplyScalar(pulseAmt);

    // Цвет: зелёный → красный
    const r = 0.27 + ratio * 0.73;
    const g = 1.0 - ratio * 0.73;
    const b = 0.27 - ratio * 0.27;
    this.ringMat.color.setRGB(r, g, b);
    this.ringMat.opacity = 0.25 + ratio * 0.55;

    // --- LAST KNOWN ---
    if (this.level > NOISE.lastKnownThreshold) {
      this.lastKnownX = p.mesh.position.x;
      this.lastKnownZ = p.mesh.position.z;
      this.markerGroup.visible = false;
    } else if (this.level <= NOISE.lastKnownThreshold && this.lastKnownX !== 0) {
      // Шум упал — показываем маркер
      this.markerGroup.visible = true;
      this.markerGroup.position.x = this.lastKnownX;
      this.markerGroup.position.z = this.lastKnownZ;
      // Пульсация маркера
      this.crossMat.opacity = 0.4 + Math.sin(time * 0.008) * 0.4;
    }

    // --- Критический режим ---
    const wasCritical = this.criticalActive;
    if (this.level >= NOISE.critical) this.criticalActive = true;
    else if (this.level <= NOISE.criticalRelease) this.criticalActive = false;

    if (this.criticalActive && !wasCritical) this.criticalStartTime = time;
    if (!this.criticalActive) this.criticalStartTime = 0;
  }
}