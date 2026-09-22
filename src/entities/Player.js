import * as THREE from 'three';
import { PLAYER, COLORS } from '../config.js';

export default class Player {
  constructor(scene) {
    this.speed = 0;

    // Простая капсула как заглушка героя
    const geom = new THREE.CapsuleGeometry(PLAYER.radius, PLAYER.height * 0.5, 4, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.player,
      roughness: 0.6,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.set(0, PLAYER.height * 0.5, 0);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Индикатор направления (маленький конус перед игроком)
    const noseGeom = new THREE.ConeGeometry(0.15, 0.4, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xffdd44 });
    this.nose = new THREE.Mesh(noseGeom, noseMat);
    this.nose.position.set(0, PLAYER.height * 0.5, -PLAYER.radius - 0.2);
    this.nose.rotation.x = -Math.PI / 2;
    this.mesh.add(this.nose);
  }

  update(dt, input) {
    let speed = PLAYER.walkSpeed;
    if (input.crouch) speed = PLAYER.crouchSpeed;
    else if (input.sprint) speed = PLAYER.sprintSpeed;

    const dx = input.moveX * speed * dt;
    const dz = input.moveY * speed * dt;

    this.mesh.position.x += dx;
    this.mesh.position.z += dz;

    this.speed = Math.hypot(dx, dz) / Math.max(dt, 0.0001);

    // Поворот в сторону движения
    if (input.moveX !== 0 || input.moveY !== 0) {
      const targetAngle = Math.atan2(input.moveX, input.moveY);
      this.mesh.rotation.y = targetAngle;
    }
  }
}