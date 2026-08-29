export type Btn = 'a' | 'b' | 'menu';

/** Manette virtuelle tactile + clavier. */
export class Input {
  axis = { x: 0, y: 0 };
  private pressed = new Set<Btn>();
  private queue: Btn[] = [];
  private keys = new Set<string>();
  private stickId: number | null = null;
  private stickEl: HTMLElement;
  private knob: HTMLElement;
  private origin = { x: 0, y: 0 };
  private radius = 52;
  enabled = true;

  constructor() {
    this.stickEl = document.getElementById('stick')!;
    this.knob = document.getElementById('stick-knob')!;
    this.bindStick();
    this.bindButtons();
    this.bindKeyboard();
  }

  private bindStick() {
    const start = (ev: PointerEvent) => {
      if (this.stickId !== null) return;
      this.stickId = ev.pointerId;
      const r = this.stickEl.getBoundingClientRect();
      this.origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      this.radius = r.width * 0.36;
      this.stickEl.setPointerCapture(ev.pointerId);
      this.move(ev);
      ev.preventDefault();
    };
    const move = (ev: PointerEvent) => { if (ev.pointerId === this.stickId) { this.move(ev); ev.preventDefault(); } };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== this.stickId) return;
      this.stickId = null; this.axis = { x: 0, y: 0 };
      this.knob.style.transform = '';
    };
    this.stickEl.addEventListener('pointerdown', start);
    this.stickEl.addEventListener('pointermove', move);
    this.stickEl.addEventListener('pointerup', end);
    this.stickEl.addEventListener('pointercancel', end);
  }

  private move(ev: PointerEvent) {
    let dx = ev.clientX - this.origin.x;
    let dy = ev.clientY - this.origin.y;
    const d = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(d, this.radius);
    dx = (dx / d) * clamped; dy = (dy / d) * clamped;
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
    // Zone morte courte : en déplacement libre, une poussée légère doit donner
    // une marche lente plutôt que rien du tout. Au-delà, l'amplitude est réétalée
    // sur [0,1] pour que la vitesse reparte de zéro au bord de la zone morte.
    const dead = this.radius * 0.14;
    if (d < dead) { this.axis = { x: 0, y: 0 }; return; }
    const m = Math.min(1, (clamped - dead) / (this.radius - dead));
    this.axis = { x: (dx / clamped) * m, y: (dy / clamped) * m };
  }

  private hold(el: HTMLElement | null, btn: Btn) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.press(btn); });
    el.addEventListener('pointerup', () => this.release(btn));
    el.addEventListener('pointerleave', () => this.release(btn));
    el.addEventListener('pointercancel', () => this.release(btn));
  }

  private bindButtons() {
    this.hold(document.getElementById('btn-a'), 'a');
    this.hold(document.getElementById('btn-b'), 'b');
    this.hold(document.getElementById('menu-btn'), 'menu');
  }

  private bindKeyboard() {
    const map: Record<string, Btn> = {
      Enter: 'a', Space: 'a', KeyE: 'a', KeyZ: 'a',
      Escape: 'b', KeyX: 'b', Backspace: 'b',
      Tab: 'menu', KeyM: 'menu',
    };
    addEventListener('keydown', (ev) => {
      if (ev.repeat) return;
      this.keys.add(ev.code);
      const b = map[ev.code];
      if (b) { this.press(b); ev.preventDefault(); }
      if (ev.code.startsWith('Arrow') || 'KeyW KeyA KeyS KeyD'.includes(ev.code)) ev.preventDefault();
    });
    addEventListener('keyup', (ev) => {
      this.keys.delete(ev.code);
      const b = map[ev.code];
      if (b) this.release(b);
    });
    addEventListener('blur', () => { this.keys.clear(); this.pressed.clear(); this.queue.length = 0; });
  }

  private press(b: Btn) {
    if (!this.enabled || this.pressed.has(b)) return;
    this.pressed.add(b);
    // File d'évènements : un tap très court reste détecté même entre deux frames.
    if (this.queue.length < 8) this.queue.push(b);
  }
  private release(b: Btn) { this.pressed.delete(b); }

  /** Direction combinée manette + clavier, normalisée. */
  dir(): { x: number; y: number } {
    let x = this.axis.x, y = this.axis.y;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) y += 1;
    const d = Math.hypot(x, y);
    return d > 1 ? { x: x / d, y: y / d } : { x, y };
  }

  running(): boolean { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }

  /** true une seule fois par appui (tap court inclus). */
  justPressed(b: Btn): boolean {
    const i = this.queue.indexOf(b);
    if (i < 0) return false;
    this.queue.splice(i, 1);
    return true;
  }

  isDown(b: Btn): boolean { return this.pressed.has(b); }

  clear() { this.pressed.clear(); this.queue.length = 0; this.axis = { x: 0, y: 0 }; this.knob.style.transform = ''; }
}
