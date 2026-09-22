export default class Input {
  constructor() {
    this.keys = {};
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.crouch = false;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Мобильные джойстики пока не делаем — сначала проверим на ПК
    this.touchEnabled = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  update() {
    let x = 0, y = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    y -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  y += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;

    // Нормализация диагонали
    if (x !== 0 && y !== 0) {
      const m = Math.SQRT1_2;
      x *= m;
      y *= m;
    }

    this.moveX = x;
    this.moveY = y;
    this.sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.crouch = !!this.keys['KeyC'];
  }
}