import Phaser from 'phaser';

const DIRECTIONS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
const WALK_FRAMES = 31;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Оставляем старые ассеты (нужны другим системам)
    this.load.image('player_gun', 'assets/characters/player/player_gun.png');
    this.load.image('zombie', 'assets/characters/zombies/zombie_stand.png');
    this.load.image('grass', 'assets/environment/tiles/grass.png');
    this.load.image('dirt', 'assets/environment/tiles/dirt.png');
    this.load.image('cement', 'assets/environment/tiles/cement.png');

    // === НОВЫЙ ГЕРОЙ — свои спрайты из 3D ===
    for (const dir of DIRECTIONS) {
      // Idle — 1 файл
      this.load.image(
        `hero_idle_${dir}`,
        `assets/characters/hero/idle/idle_${dir}.png`
      );

      // Walk — 31 кадр (0001..0031), имя с большой буквы
      const dirUp = dir.toUpperCase();
      for (let f = 1; f <= WALK_FRAMES; f++) {
        const num = String(f).padStart(4, '0');
        this.load.image(
          `hero_walk_${dir}_${f}`,
          `assets/characters/hero/walk_${dir}/walk_${dirUp}_${num}.png`
        );
      }
    }
  }

  create() {
    this.scene.start('Game');
  }
}