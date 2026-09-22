import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('player', 'assets/characters/player/player_stand.png');
  }

  create() {
    this.scene.start('Game');
  }
}