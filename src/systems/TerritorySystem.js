import Phaser from 'phaser';
import { TERRITORY, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class TerritorySystem {
  constructor(scene) {
    this.scene = scene;
    this.locked = false;
    this.border = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(98);
    this.border.setStrokeStyle(10, 0xff0000, 0.85);
    this.border.setVisible(false);
  }

  update(time) {
    const s = this.scene;
    if (s.noise.criticalActive && s.noise.criticalStartTime > 0 && !this.locked) {
      if (time - s.noise.criticalStartTime > TERRITORY.lockAfterCriticalMs) {
        this.lock();
      }
    }
    if (this.locked && s.zombies.count() === 0) {
      this.unlock();
    }
  }

  lock() {
    this.locked = true;
    this.border.setVisible(true);
    this.scene.zombies.spawnAroundPlayer(TERRITORY.zombieSpawnOnLock);
  }

  unlock() {
    this.locked = false;
    this.border.setVisible(false);
    this.scene.noise.criticalStartTime = 0;
  }
}