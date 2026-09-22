import * as THREE from 'three';
import { PLAYER, COLORS } from '../config.js';

export default class Player {
  constructor(scene) {
    this.speed = 0;

    // Тело — капсула
    const bodyLength = Math.max(PLAYER.height - PLAYER.radius * 2, 0.1);
    const geom = new THREE.CapsuleGeometry(PLAYER.radius, bodyLength, 4, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.player,
      roughness: 0.6,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    // Ставим так, чтобы низ капсулы касался земли
    this.mesh.position.set(0, PLAYER.radius + bodyLength / 2, 0);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Нос — маленький конус спереди
    const noseGeom = new THREE.ConeGeometry(PLAYER.radius * 0.5, PLAYER.radius * 1.5, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xffdd44 });
    this.nose = new THREE.Mesh(noseGeom, noseMat);
    this.nose.position.set(0, 0, PLAYER.radius + 0.15);
    this.nose.rotation.x = Math.PI / 2;
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

    if (input.moveX !== 0 || input.moveY !== 0) {
      const targetAngle = Math.atan2(input.moveX, input.moveY);
      this.mesh.rotation.y = targetAngle;
    }
  }
}