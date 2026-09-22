import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const MAX_DIST = 55;
const FIRE_COOLDOWN = 220;

export default class TouchControls {
  constructor(scene) {
    this.scene = scene;
    // ?touch=1 в адресе заставит показать джойстики даже на ПК (для теста)
    const forceTouch = new URLSearchParams(window.location.search).get('touch') === '1';
    this.enabled = forceTouch || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.aimActive = false;
    this.crouchPressed = false;
    this.sprintPressed = false;

    this.movePointerId = null;
    this.moveStartX = 0;
    this.moveStartY = 0;
    this.aimPointerId = null;
    this.aimStartX = 0;
    this.aimStartY = 0;
    this.lastFireTime = 0;

    if (this.enabled) this.buildUI();
  }

  buildUI() {
    const s = this.scene;
    const half = GAME_WIDTH / 2;

    // Зоны касания — невидимые, на весь экран
    const leftZone = s.add.zone(0, 0, half, GAME_HEIGHT)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200).setInteractive();
    const rightZone = s.add.zone(half, 0, half, GAME_HEIGHT)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200).setInteractive();

    // Визуальные джойстики — движение
    this.moveBase = s.add.circle(0, 0, MAX_DIST, 0x000000, 0.25)
      .setScrollFactor(0).setDepth(201).setVisible(false);
    this.moveBase.setStrokeStyle(2, 0x44ff44, 0.5);
    this.moveKnob = s.add.circle(0, 0, 22, 0x44ff44, 0.6)
      .setScrollFactor(0).setDepth(202).setVisible(false);

    // Визуальные джойстики — стрельба
    this.aimBase = s.add.circle(0, 0, MAX_DIST, 0x000000, 0.25)
      .setScrollFactor(0).setDepth(201).setVisible(false);
    this.aimBase.setStrokeStyle(2, 0xff6666, 0.5);
    this.aimKnob = s.add.circle(0, 0, 22, 0xff6666, 0.6)
      .setScrollFactor(0).setDepth(202).setVisible(false);

    // Кнопки CROUCH / SPRINT — слева от правого джойстика
    this.crouchBtn = s.add.circle(GAME_WIDTH - 90, 90, 32, 0x4488ff, 0.35)
      .setScrollFactor(0).setDepth(201);
    this.crouchBtn.setStrokeStyle(2, 0x88bbff, 0.8);
    s.add.text(GAME_WIDTH - 90, 90, 'C', {
      fontSize: '20px', color: '#fff', fontFamily: 'Courier New, monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    this.sprintBtn = s.add.circle(GAME_WIDTH - 90, 170, 32, 0xffaa44, 0.35)
      .setScrollFactor(0).setDepth(201);
    this.sprintBtn.setStrokeStyle(2, 0xffcc88, 0.8);
    s.add.text(GAME_WIDTH - 90, 170, '🏃', {
      fontSize: '22px', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Кнопки — toggle
    this.crouchBtn.setInteractive();
    this.sprintBtn.setInteractive();
    this.crouchBtn.on('pointerdown', () => {
      this.crouchPressed = !this.crouchPressed;
      this.crouchBtn.setFillStyle(0x4488ff, this.crouchPressed ? 0.8 : 0.35);
    });
    this.sprintBtn.on('pointerdown', () => {
      this.sprintPressed = !this.sprintPressed;
      this.sprintBtn.setFillStyle(0xffaa44, this.sprintPressed ? 0.8 : 0.35);
    });

    // Джойстики
    leftZone.on('pointerdown', (p) => this.startMove(p));
    rightZone.on('pointerdown', (p) => this.startAim(p));

    s.input.on('pointermove', (p) => this.onMove(p));
    s.input.on('pointerup', (p) => this.onUp(p));
  }

  startMove(p) {
    if (this.movePointerId !== null) return;
    this.movePointerId = p.id;
    this.moveStartX = p.x;
    this.moveStartY = p.y;
    this.moveBase.setPosition(p.x, p.y).setVisible(true);
    this.moveKnob.setPosition(p.x, p.y).setVisible(true);
  }

  startAim(p) {
    if (this.aimPointerId !== null) return;
    this.aimPointerId = p.id;
    this.aimStartX = p.x;
    this.aimStartY = p.y;
    this.aimBase.setPosition(p.x, p.y).setVisible(true);
    this.aimKnob.setPosition(p.x, p.y).setVisible(true);
    this.aimActive = true;
  }

  onMove(p) {
    if (p.id === this.movePointerId) {
      this.updateStick(p, 'move');
    } else if (p.id === this.aimPointerId) {
      this.updateStick(p, 'aim');
    }
  }

  updateStick(p, which) {
    const startX = which === 'move' ? this.moveStartX : this.aimStartX;
    const startY = which === 'move' ? this.moveStartY : this.aimStartY;
    const dx = p.x - startX;
    const dy = p.y - startY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_DIST);
    const angle = Math.atan2(dy, dx);

    const knobX = startX + Math.cos(angle) * clamped;
    const knobY = startY + Math.sin(angle) * clamped;

    if (which === 'move') {
      this.moveKnob.setPosition(knobX, knobY);
      if (dist > 8) {
        const norm = Math.min(dist / MAX_DIST, 1);
        this.moveX = Math.cos(angle) * norm;
        this.moveY = Math.sin(angle) * norm;
      } else {
        this.moveX = 0;
        this.moveY = 0;
      }
    } else {
      this.aimKnob.setPosition(knobX, knobY);
      if (dist > 8) {
        const norm = Math.min(dist / MAX_DIST, 1);
        this.aimX = Math.cos(angle) * norm;
        this.aimY = Math.sin(angle) * norm;
      }
    }
  }

  onUp(p) {
    if (p.id === this.movePointerId) {
      this.movePointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      this.moveBase.setVisible(false);
      this.moveKnob.setVisible(false);
    }
    if (p.id === this.aimPointerId) {
      this.aimPointerId = null;
      this.aimX = 0;
      this.aimY = 0;
      this.aimActive = false;
      this.aimBase.setVisible(false);
      this.aimKnob.setVisible(false);
    }
  }

  // Возвращает: стреляем ли в этот кадр и куда
  getShootAngle(now) {
    if (!this.aimActive) return null;
    if (Math.hypot(this.aimX, this.aimY) < 0.2) return null;
    if (now - this.lastFireTime < FIRE_COOLDOWN) return null;
    this.lastFireTime = now;
    return Math.atan2(this.aimY, this.aimX);
  }
}