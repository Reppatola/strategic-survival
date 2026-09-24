import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, NOISE_DB } from '../config.js';

export default class HUDSystem {
  constructor(scene) {
    this.scene = scene;
    const s = scene;

    this.text = s.add.text(12, 10, '', {
      fontSize: '13px', color: '#88ff88', fontFamily: 'Courier New, monospace',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(100);

    s.add.rectangle(GAME_WIDTH/2, 24, 400, 16, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x444444);
    this.baseBar = s.add.rectangle(GAME_WIDTH/2 - 200, 24, 0, 10, 0xffcc44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.pulseBar = s.add.rectangle(GAME_WIDTH/2 - 200, 24, 0, 10, 0xff4444)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);
    s.add.text(GAME_WIDTH/2, 24, 'NOISE dB', {
      fontSize: '11px', color: '#fff', fontFamily: 'Courier New, monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103);

    s.add.rectangle(GAME_WIDTH/2, 46, 400, 12, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x444444);
    this.hpBar = s.add.rectangle(GAME_WIDTH/2 - 200, 46, 400, 8, 0x44ff44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    s.add.text(GAME_WIDTH - 12, 10, 'WASD walk · SHIFT sprint · C crouch · LMB shoot · SPACE melee', {
      fontSize: '11px', color: '#666', fontFamily: 'Courier New, monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.gameOver = s.add.text(GAME_WIDTH/2, GAME_HEIGHT/2, '', {
      fontSize: '40px', color: '#ff4444', fontFamily: 'Courier New, monospace',
      align: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: { x: 30, y: 20 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  update() {
    const s = this.scene;
    const n = s.noise;
    const p = s.player;

    const baseW = (n.base / NOISE_DB.max) * 400;
    const pulseW = (n.pulse / NOISE_DB.max) * 400;
    this.baseBar.width = baseW;
    this.pulseBar.x = GAME_WIDTH / 2 - 200 + baseW;
    this.pulseBar.width = Math.min(pulseW, 400 - baseW);

    const hpRatio = p.hp / 100;
    this.hpBar.width = 400 * hpRatio;
    this.hpBar.fillColor = hpRatio > 0.5 ? 0x44ff44 : (hpRatio > 0.25 ? 0xffaa44 : 0xff4444);

    let warn = '';
    if (s.territory.locked) {
      warn = `\n⚠ TERRITORY LOCKED — CLEAR ALL (${s.zombies.count()} left)`;
    } else if (n.criticalActive) {
      warn = '   ⚠ ALERT';
    }

    // Модификаторы шума видны вживую — удобно калибровать баланс
    const surface = s.map.surfaceAt(p.sprite.x, p.sprite.y);

    this.text.setText(
      `STATE ${n.state}   V ${Math.round(p.velocity)}\n` +
      `BASE  ${Math.round(n.base)} dB\n` +
      `PULSE ${Math.round(n.pulse)} dB\n` +
      `TOTAL ${Math.round(n.level)} dB${warn}\n` +
      `SURFACE ${surface}   SHOES ${p.footwear}\n` +
      `HP ${p.hp}   KILLS ${s.kills}   ZOMBIES ${s.zombies.count()}\n` +
      `LAST KNOWN  ${Math.round(n.lastKnownX)} : ${Math.round(n.lastKnownY)}`
    );

    if (p.isDead) {
      this.gameOver.setText(`YOU DIED\nKills: ${s.kills}\nPress R`).setVisible(true);
    }
  }
}