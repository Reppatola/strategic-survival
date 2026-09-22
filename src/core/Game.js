import * as THREE from 'three';
import { WORLD, COLORS, CAMERA } from '../config.js';
import Input from './Input.js';
import Player from '../entities/Player.js';

export default class Game {
  constructor(container) {
    this.container = container;
    this.input = new Input();
    this.clock = new THREE.Clock();

    this.initScene();
    this.initLights();
    this.initWorld();
    this.initPlayer();

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    this.scene.fog = new THREE.Fog(COLORS.bg, 20, 50);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(15, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    this.scene.add(sun);
  }

  initWorld() {
    // Земля
    const groundGeom = new THREE.PlaneGeometry(WORLD.width, WORLD.depth);
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Пара деревьев (простая заглушка — цилиндр + сфера)
    const positions = [
      [-5, 0, -5], [6, 0, -3], [-3, 0, 8], [8, 0, 7],
      [0, 0, -8], [-8, 0, 4],
    ];
    positions.forEach(([x, y, z]) => this.addTree(x, y, z));
  }

  addTree(x, y, z) {
    const trunkGeom = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.set(x, 0.75, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const crownGeom = new THREE.SphereGeometry(0.9, 8, 6);
    const crownMat = new THREE.MeshStandardMaterial({ color: COLORS.tree });
    const crown = new THREE.Mesh(crownGeom, crownMat);
    crown.position.set(x, 1.9, z);
    crown.castShadow = true;
    this.scene.add(crown);
  }

  initPlayer() {
    this.player = new Player(this.scene);
  }

  updateCamera(dt) {
    const target = this.player.mesh.position;
    const desired = {
      x: target.x + CAMERA.offset.x,
      y: CAMERA.offset.y,
      z: target.z + CAMERA.offset.z,
    };

    this.camera.position.x += (desired.x - this.camera.position.x) * CAMERA.lerp;
    this.camera.position.y += (desired.y - this.camera.position.y) * CAMERA.lerp;
    this.camera.position.z += (desired.z - this.camera.position.z) * CAMERA.lerp;

    this.camera.lookAt(target.x, target.y + CAMERA.lookAtHeight, target.z);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.input.update();
    this.player.update(dt, this.input);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);
  }
}