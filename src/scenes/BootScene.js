import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Персонажи
    this.load.image('player', 'assets/characters/player/player_stand.png');
    this.load.image('player_gun', 'assets/characters/player/player_gun.png');
    this.load.image('zombie', 'assets/characters/zombies/zombie_stand.png');

    // Тайлы земли
    this.load.image('grass', 'assets/environment/tiles/grass.png');
    this.load.image('dirt', 'assets/environment/tiles/dirt.png');
    this.load.image('cement', 'assets/environment/tiles/cement.png');
  }

  create() {
    this.scene.start('Game');
  }
}