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

    // === УДАЛЯЕМ ROOT MOTION ===
    // Каждая анимация содержит треки: position, quaternion, scale для каждой кости.
    // Треки position на корневой кости заставляют модель «уезжать» внутри клипа.
    // Мы убираем все position-треки — оставляем только вращение и масштаб.
    gltf.animations.forEach(clip => {
      const before = clip.tracks.length;
      clip.tracks = clip.tracks.filter(track => {
        return !track.name.endsWith('.position');
      });
      const after = clip.tracks.length;
      console.log(`Анимация "${clip.name}": удалено ${before - after} position-треков`);
    });

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

  update(dt, input, camera) {
    if (this.mixer) this.mixer.update(dt);
    if (!this.model) return;

    this.isCrouching = input.crouch;
    this.isSprinting = input.sprint && !input.crouch;

    let speed = PLAYER.walkSpeed;
    if (this.isCrouching) speed = PLAYER.crouchSpeed;
    else if (this.isSprinting) speed = PLAYER.sprintSpeed;

    let worldX = 0, worldZ = 0;
    const inputMag = Math.hypot(input.moveX, input.moveY);

    // Движение относительно камеры: W = «вверх по экрану», D = «вправо по экрану»
    if (inputMag > 0.01 && camera) {
      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();

      const camRight = new THREE.Vector3();
      camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

      const forwardAmount = -input.moveY; // W даёт -1 по moveY → +1 вперёд
      const rightAmount = input.moveX;    // D даёт +1

      worldX = camForward.x * forwardAmount + camRight.x * rightAmount;
      worldZ = camForward.z * forwardAmount + camRight.z * rightAmount;

      // Нормализуем направление и умножаем на длину ввода (диагональ не быстрее)
      const len = Math.hypot(worldX, worldZ) || 1;
      worldX = (worldX / len) * inputMag;
      worldZ = (worldZ / len) * inputMag;
    }

    const dx = worldX * speed * dt;
    const dz = worldZ * speed * dt;

    this.mesh.position.x += dx;
    this.mesh.position.z += dz;

    this.velocity = Math.hypot(dx, dz) / Math.max(dt, 0.0001);
    this.isMoving = this.velocity > 0.1;

    if (this.isMoving) {
      this.mesh.rotation.y = Math.atan2(worldX, worldZ);
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

    // Синхронизация скорости анимации
    if (this.currentAction && this.currentAction !== this.actions.idle) {
      const base = (this.currentAction === this.actions.run)
        ? this.runBaseSpeed
        : this.walkBaseSpeed;
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