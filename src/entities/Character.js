import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER } from '../config.js';

export default class Character {
  constructor(scene, modelPath, animationsPath) {
    this.scene = scene;
    this.modelPath = modelPath;
    this.animationsPath = animationsPath;

    // Контейнер — существует с самого начала
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);
    scene.add(this.mesh);

    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;

    this.velocity = 0;
    this.isMoving = false;
    this.isSprinting = false;
    this.isCrouching = false;

    this.loadModelAndAnimations();
  }

  loadModelAndAnimations() {
    const loader = new GLTFLoader();

    // Загружаем модель и анимации параллельно
    Promise.all([
      loader.loadAsync(this.modelPath),
      loader.loadAsync(this.animationsPath),
    ])
      .then(([modelGltf, animGltf]) => {
        this.setupModel(modelGltf);
        this.setupAnimations(animGltf);
      })
      .catch(err => {
        console.error('Ошибка загрузки модели или анимаций:', err);
      });
  }

  setupModel(gltf) {
    this.model = gltf.scene;
    this.model.castShadow = true;
    this.model.receiveShadow = true;
    this.model.scale.setScalar(0.4);
    this.mesh.add(this.model);
    console.log('Модель загружена');
  }

  setupAnimations(gltf) {
    this.mixer = new THREE.AnimationMixer(this.model);

    console.log('=== ВСЕ АНИМАЦИИ ===');
    gltf.animations.forEach(a => console.log('•', a.name));

    gltf.animations.forEach(clip => {
      const n = clip.name.toLowerCase();
      if (n.includes('idle')) {
        this.actions.idle = this.mixer.clipAction(clip);
      } else if (n.includes('walk')) {
        this.actions.walk = this.mixer.clipAction(clip);
      } else if (n.includes('run') || n.includes('sprint')) {
        this.actions.run = this.mixer.clipAction(clip);
      }
    });

    if (this.actions.idle) {
      this.currentAction = this.actions.idle;
      this.currentAction.play();
    }

    // Скорость анимации — подстраивается под реальную скорость движения
    // Чем больше baseSpeed, тем БЫСТРЕЕ должна проигрываться анимация
    this.walkBaseSpeed = 2.0;    // ← подбери это число
    this.runBaseSpeed = 4.5;     // ← и это

    console.log('=== НАЙДЕННЫЕ ДЕЙСТВИЯ ===', Object.keys(this.actions));
  }

  update(dt, input) {
    if (this.mixer) this.mixer.update(dt);
    if (!this.model) return;

    this.isCrouching = input.crouch;
    this.isSprinting = input.sprint && !input.crouch;

    let speed = PLAYER.walkSpeed;
    if (this.isCrouching) speed = PLAYER.crouchSpeed;
    else if (this.isSprinting) speed = PLAYER.sprintSpeed;

    const dx = input.moveX * speed * dt;
    const dz = input.moveY * speed * dt;

    // Плавное движение с использованием скорости напрямую
    this.mesh.position.x += dx;
    this.mesh.position.z += dz;

    this.velocity = Math.hypot(dx, dz) / Math.max(dt, 0.0001);
    this.isMoving = this.velocity > 0.1;

    if (input.moveX !== 0 || input.moveY !== 0) {
      const targetAngle = Math.atan2(input.moveX, input.moveY);
      this.mesh.rotation.y = targetAngle;
    }

    // Выбор анимации
    let desired = this.actions.idle;
    if (this.isMoving) {
      if (this.isSprinting && this.actions.run) desired = this.actions.run;
      else if (this.actions.walk) desired = this.actions.walk;
    }

    if (desired && desired !== this.currentAction) {
      this.fadeToAction(desired);
    }

    // === СИНХРОНИЗАЦИЯ: анимация играет со скоростью, равной реальной ===
    if (this.currentAction && this.currentAction !== this.actions.idle) {
      const base = (this.currentAction === this.actions.run)
        ? this.runBaseSpeed
        : this.walkBaseSpeed;
      // При реальной скорости = base → timeScale = 1 (нормальная анимация)
      // Быстрее движешься → анимация ускоряется; медленнее → замедляется
      const scale = this.velocity / base;
      this.currentAction.timeScale = Math.max(0.3, Math.min(scale, 2.0));
    }
  }

  fadeToAction(newAction) {
    if (!newAction) return;
    const duration = 0.2;
    if (this.currentAction && this.currentAction !== newAction) {
      this.currentAction.fadeOut(duration);
    }
    newAction.reset().fadeIn(duration).play();
    this.currentAction = newAction;
  }
}