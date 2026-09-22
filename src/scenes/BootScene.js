import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('player', 'assets/characters/player/player_stand.png');
    this.load.image('player_gun', 'assets/characters/player/player_gun.png');
    this.load.image('zombie', 'assets/characters/zombies/zombie_stand.png');
  }

  create() {
    this.scene.start('Game');
  }
}