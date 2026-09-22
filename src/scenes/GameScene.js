import Phaser from 'phaser';
import { COLORS, WORLD, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import MapBuilder from '../systems/MapBuilder.js';
import PlayerSystem from '../systems/PlayerSystem.js';
import NoiseSystem from '../systems/NoiseSystem.js';
import BulletSystem from '../systems/BulletSystem.js';
import ZombieSystem from '../systems/ZombieSystem.js';
import TerritorySystem from '../systems/TerritorySystem.js';
import HUDSystem from '../systems/HUDSystem.js';
import TouchControls from '../systems/TouchControls.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.kills = 0;

    // Порядок ВАЖЕН — зависимости между системами
    this.map = new MapBuilder(this);

    this.dangerOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(99);

    this.player = new PlayerSystem(this);
    this.noise = new NoiseSystem(this);
    this.zombies = new ZombieSystem(this);
    this.bullets = new BulletSystem(this);
    this.territory = new TerritorySystem(this);
    this.hud = new HUDSystem(this);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      shift: 'SHIFT', crouch: 'C',
    });

    this.input.on('pointerdown', (p) => this.bullets.shoot(p));
    this.touch = new TouchControls(this);
    this.input.keyboard.on('keydown-R', () => {
      if (this.player.isDead) this.scene.restart();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      this.player.melee();
    });

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor(COLORS.bg);
  }

  update(time, delta) {
    if (this.player.isDead) {
      this.hud.update();
      return;
    }

    this.player.update(time, delta);
    // Стрельба с правого джойстика (мобилки)
    if (this.touch && this.touch.enabled) {
      const angle = this.touch.getShootAngle(time);
      if (angle !== null) {
        this.bullets.shootAtAngle(angle);
      }
    }
    this.noise.update(time);
    this.zombies.update();
    this.bullets.update();
    this.territory.update(time);
    this.hud.update();
  }
}