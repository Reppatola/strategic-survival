import { NOISE } from '../config.js';

export default class HUD {
  constructor() {
    this.buildUI();
  }

  buildUI() {
    const root = document.createElement('div');
    root.id = 'hud';
    root.innerHTML = `
      <div class="noise-wrap">
        <div class="noise-label">NOISE</div>
        <div class="noise-bar-bg">
          <div class="noise-bar-base"></div>
          <div class="noise-bar-pulse"></div>
        </div>
      </div>
      <div class="stats"></div>
      <div class="hint">WASD — walk · SHIFT — sprint · C — crouch</div>
      <div class="danger-overlay"></div>
    `;
    document.body.appendChild(root);

    this.noiseBase = root.querySelector('.noise-bar-base');
    this.noisePulse = root.querySelector('.noise-bar-pulse');
    this.stats = root.querySelector('.stats');
    this.danger = root.querySelector('.danger-overlay');
  }

  update(player, noise) {
    const ratio = noise.level / NOISE.max;
    const basePct = (noise.base / NOISE.max) * 100;
    const pulsePct = (noise.pulse / NOISE.max) * 100;

    this.noiseBase.style.width = basePct + '%';
    this.noisePulse.style.left = basePct + '%';
    this.noisePulse.style.width = pulsePct + '%';

    const warn = noise.criticalActive ? ' ⚠ ALERT' : '';
    this.stats.textContent =
      `STATE ${noise.state}\n` +
      `BASE ${Math.round(noise.base)}% · PULSE ${Math.round(noise.pulse)}% · TOTAL ${Math.round(noise.level)}%${warn}\n` +
      `LAST KNOWN ${Math.round(noise.lastKnownX)} : ${Math.round(noise.lastKnownZ)}`;

    if (noise.criticalActive) {
      const a = 0.08 + Math.abs(Math.sin(performance.now() / 150)) * 0.15;
      this.danger.style.background = `rgba(255,0,0,${a})`;
    } else {
      this.danger.style.background = 'transparent';
    }
  }
}