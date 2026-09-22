import * as THREE from 'three';

// Позиции домиков (x, z) + размеры
const HOUSES = [
  { x: -8, z: -8, w: 4, d: 4, h: 3.0, wall: 0xb8935a, roof: 0x8b2f2f, name: 'tavern' },
  { x: 10, z: -5, w: 5, d: 4, h: 3.5, wall: 0xa87848, roof: 0x6b2f2f, name: 'smithy' },
  { x: 0,  z: 10, w: 4, d: 4, h: 3.0, wall: 0xc8a878, roof: 0x8b2f2f, name: 'house' },
];

// Соединяем домики дорожками: 0-1, 1-2, 2-0
const PATHS = [
  [0, 1], [1, 2], [2, 0],
];

export default class Village {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];        // AABB для проверки столкновений
    this.buildHouses();
    this.buildPaths();
  }

  buildHouses() {
    for (const h of HOUSES) {
      // Стены (коробка)
      const wallGeom = new THREE.BoxGeometry(h.w, h.h, h.d);
      const wallMat = new THREE.MeshStandardMaterial({ color: h.wall, roughness: 0.9 });
      const walls = new THREE.Mesh(wallGeom, wallMat);
      walls.position.set(h.x, h.h / 2, h.z);
      walls.castShadow = true;
      walls.receiveShadow = true;
      this.scene.add(walls);

      // Крыша — пирамида на 4 грани
      const roofSize = Math.max(h.w, h.d) * 0.85;
      const roofGeom = new THREE.ConeGeometry(roofSize, 1.8, 4);
      const roofMat = new THREE.MeshStandardMaterial({
        color: h.roof,
        flatShading: true,
        roughness: 0.8,
      });
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.position.set(h.x, h.h + 0.9, h.z);
      roof.rotation.y = Math.PI / 4;    // выравниваем пирамиду по стенам
      roof.castShadow = true;
      this.scene.add(roof);

      // Дверь (тёмный прямоугольник на южной стене)
      const doorGeom = new THREE.PlaneGeometry(0.9, 1.7);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2210 });
      const door = new THREE.Mesh(doorGeom, doorMat);
      door.position.set(h.x, 0.85, h.z + h.d / 2 + 0.02);
      this.scene.add(door);

      // Окно (маленький квадратик)
      const windowGeom = new THREE.PlaneGeometry(0.7, 0.7);
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xffd97a,
        emissive: 0xffa030,
        emissiveIntensity: 0.6,
      });
      const win = new THREE.Mesh(windowGeom, windowMat);
      win.position.set(h.x - h.w / 2 - 0.02, 1.8, h.z);
      win.rotation.y = -Math.PI / 2;
      this.scene.add(win);

      // Коллайдер — прямоугольник стен (без крыши, чтобы камера летала свободно)
      this.colliders.push({
        minX: h.x - h.w / 2,
        maxX: h.x + h.w / 2,
        minZ: h.z - h.d / 2,
        maxZ: h.z + h.d / 2,
      });
    }
  }

  buildPaths() {
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xa08060,
      roughness: 1,
    });

    for (const [a, b] of PATHS) {
      const h1 = HOUSES[a];
      const h2 = HOUSES[b];
      const dx = h2.x - h1.x;
      const dz = h2.z - h1.z;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      // Плоская коробка, длинная сторона по Z, потом поворачиваем
      const pathGeom = new THREE.BoxGeometry(1.4, 0.05, length);
      const path = new THREE.Mesh(pathGeom, pathMat);
      path.position.set((h1.x + h2.x) / 2, 0.03, (h1.z + h2.z) / 2);
      path.rotation.y = angle;
      path.receiveShadow = true;
      this.scene.add(path);
    }
  }

  // Проверка: попадает ли точка (+радиус) в коллайдер
  collides(x, z, radius = 0.3) {
    for (const c of this.colliders) {
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  // Проверка для деревьев: не спавним дерево рядом с домом/дорогами
  isInsideVillage(x, z, margin = 3) {
    for (const h of HOUSES) {
      if (Math.abs(x - h.x) < h.w / 2 + margin && Math.abs(z - h.z) < h.d / 2 + margin) {
        return true;
      }
    }
    return false;
  }
}