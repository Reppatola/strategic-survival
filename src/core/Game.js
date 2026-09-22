import * as THREE from 'three';
import { WORLD, COLORS, CAMERA, TREE } from '../config.js';
import Input from './Input.js';
import Player from '../entities/Player.js';
import NoiseSystem from '../systems/NoiseSystem.js';
import HUD from '../ui/HUD.js';

export default class Game {
  constructor(container) {
    this.container = container;
    this.input = new Input();
    this.clock = new THREE.Clock();
    this.trees = [];

    this.initScene();
    this.initLights();
    this.initWorld();
    this.initPlayer();

    this.noise = new NoiseSystem(this.scene, this.player);
    this.hud = new HUD();

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

    // Лес — 18 деревьев в разных точках
    const positions = [
      [-6, 0, -7], [7, 0, -5], [-3, 0, 9], [9, 0, 8],
      [0, 0, -10], [-9, 0, 5], [5, 0, 4], [-7, 0, -2],
      [10, 0, -8], [-11, 0, -6], [3, 0, 11], [-5, 0, 13],
      [12, 0, 2], [-13, 0, 1], [8, 0, -12], [-2, 0, -14],
      [14, 0, 10], [-14, 0, -10],
    ];
    positions.forEach(([x, y, z]) => this.addTree(x, y, z));
  }

  addTree(x, y, z) {
    // Ствол
    const trunkGeom = new THREE.CylinderGeometry(
      TREE.trunkRadius * 0.8,
      TREE.trunkRadius,
      TREE.trunkHeight,
      6
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: COLORS.trunk,
      transparent: true,
      opacity: 1,
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.set(x, TREE.trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.scene.add(trunk);

    // Крона — низкий полигонаж, шарообразная
    const crownGeom = new THREE.IcosahedronGeometry(TREE.crownRadius, 1);
    const crownMat = new THREE.MeshStandardMaterial({
      color: COLORS.tree,
      flatShading: true,
      roughness: 0.9,
      transparent: true,
      opacity: 1,
    });
  const crown = new THREE.Mesh(crownGeom, crownMat);
    crown.position.set(x, TREE.crownY, z);
    crown.castShadow = true;
    this.scene.add(crown);

    // Сохраняем для системы видимости
    this.trees.push({ crown, trunk, x, z });
  }
  
  updateTreeFade() {
    const camPos = this.camera.position;
    const playerPos = this.player.mesh.position;

    const dirX = playerPos.x - camPos.x;
    const dirY = playerPos.y - camPos.y;
    const dirZ = playerPos.z - camPos.z;
    const dirLen = Math.hypot(dirX, dirY, dirZ);
    const dirNX = dirX / dirLen;
    const dirNY = dirY / dirLen;
    const dirNZ = dirZ / dirLen;

    for (const tree of this.trees) {
      // Проекция дерева на линию камеры-игрока
      const vX = tree.x - camPos.x;
      const vY = TREE.crownY - camPos.y;
      const vZ = tree.z - camPos.z;
      const proj = vX * dirNX + vY * dirNY + vZ * dirNZ;

      let targetOpacity = 1.0;

      // Дерево между камерой и игроком?
      if (proj > 0 && proj < dirLen) {
        const lineX = camPos.x + dirNX * proj;
        const lineY = camPos.y + dirNY * proj;
        const lineZ = camPos.z + dirNZ * proj;
        const distToLine = Math.hypot(
          tree.x - lineX,
          TREE.crownY - lineY,
          tree.z - lineZ
        );

        if (distToLine < TREE.crownRadius + 0.8) {
          targetOpacity = 0.15;
        }
      }

      // Дерево близко к игроку — тоже просвечивает
      const dxP = tree.x - playerPos.x;
      const dzP = tree.z - playerPos.z;
      const distToPlayer = Math.hypot(dxP, dzP);
      if (distToPlayer < 4) {
        targetOpacity = Math.min(targetOpacity, 0.15);
      }

      // Плавное изменение
      const crown = tree.crown.material;
      const trunk = tree.trunk.material;
      crown.opacity += (targetOpacity - crown.opacity) * 0.2;
      trunk.opacity += (Math.max(0.3, targetOpacity) - trunk.opacity) * 0.2;
    }
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

    const time = performance.now();
    this.noise.update(dt, time, this.input);
    this.hud.update(this.player, this.noise);

    this.updateCamera(dt);
    this.updateTreeFade();

    this.renderer.render(this.scene, this.camera);
  }
}