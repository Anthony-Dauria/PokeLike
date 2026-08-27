/** Petit moteur audio chiptune : musiques bouclées + bruitages, sans aucun asset. */

type Note = [number, number]; // [demi-tons depuis A4 (-99 = silence), durée en temps]

interface Track { bpm: number; lead: Note[]; bass: Note[]; wave: OscillatorType; gain: number }

const R = -99;
const TRACKS: Record<string, Track> = {
  ville: {
    bpm: 132, wave: 'triangle', gain: .16,
    lead: [[4, 1], [7, 1], [11, 1], [12, 1], [11, 1], [7, 1], [9, 2], [2, 1], [5, 1], [9, 1], [12, 1], [9, 1], [5, 1], [4, 2],
           [7, 1], [11, 1], [14, 1], [16, 1], [14, 1], [11, 1], [12, 2], [R, 1], [7, 1], [4, 1], [0, 1], [2, 1], [4, 3]],
    bass: [[-12, 2], [-5, 2], [-10, 2], [-3, 2], [-12, 2], [-5, 2], [-8, 2], [-1, 2]],
  },
  route: {
    bpm: 146, wave: 'square', gain: .13,
    lead: [[0, 1], [4, 1], [7, 1], [4, 1], [9, 2], [7, 2], [2, 1], [5, 1], [9, 1], [5, 1], [11, 2], [9, 2],
           [12, 1], [11, 1], [9, 1], [7, 1], [5, 2], [4, 2], [0, 4]],
    bass: [[-12, 1], [-12, 1], [-5, 2], [-10, 1], [-10, 1], [-3, 2], [-8, 1], [-8, 1], [-1, 2], [-12, 4]],
  },
  grotte: {
    bpm: 96, wave: 'sine', gain: .15,
    lead: [[0, 2], [3, 2], [7, 2], [3, 2], [-2, 2], [2, 2], [5, 4], [0, 2], [3, 2], [10, 2], [7, 2], [5, 4], [3, 4]],
    bass: [[-24, 4], [-19, 4], [-22, 4], [-17, 4]],
  },
  combat: {
    bpm: 168, wave: 'square', gain: .15,
    lead: [[0, 1], [0, 1], [3, 1], [0, 1], [7, 1], [6, 1], [3, 1], [0, 1], [-2, 1], [-2, 1], [3, 1], [-2, 1], [5, 2], [3, 2],
           [8, 1], [7, 1], [5, 1], [3, 1], [2, 1], [3, 1], [5, 2], [0, 2]],
    bass: [[-24, 1], [-24, 1], [-24, 1], [-17, 1], [-22, 1], [-22, 1], [-22, 1], [-15, 1]],
  },
  arene: {
    bpm: 176, wave: 'sawtooth', gain: .13,
    lead: [[0, 1], [7, 1], [12, 1], [7, 1], [11, 1], [7, 1], [10, 1], [7, 1], [-2, 1], [5, 1], [10, 1], [5, 1], [9, 2], [7, 2],
           [3, 1], [10, 1], [15, 1], [10, 1], [14, 2], [12, 2], [0, 4]],
    bass: [[-24, 1], [-12, 1], [-24, 1], [-12, 1], [-26, 1], [-14, 1], [-26, 1], [-14, 1]],
  },
  boss: {
    bpm: 152, wave: 'sawtooth', gain: .16,
    lead: [[0, 2], [1, 1], [0, 1], [-4, 2], [0, 2], [3, 1], [2, 1], [3, 2], [7, 2], [6, 1], [5, 1], [3, 2], [1, 2], [0, 4],
           [12, 1], [11, 1], [10, 1], [7, 1], [8, 2], [3, 2]],
    bass: [[-24, 1], [-24, 1], [-23, 1], [-24, 1], [-29, 1], [-29, 1], [-28, 1], [-29, 1]],
  },
  victoire: {
    bpm: 150, wave: 'triangle', gain: .18,
    lead: [[0, 1], [0, 1], [0, 1], [0, 2], [-4, 1], [-2, 1], [0, 2], [-2, 1], [0, 4]],
    bass: [[-12, 2], [-12, 2], [-17, 2], [-12, 4]],
  },
};

const BIOME_TRACK: Record<string, string> = {
  ville: 'ville', plaine: 'route', foret: 'route', montagne: 'route', plage: 'route',
  desert: 'route', neige: 'route', volcan: 'route', marais: 'grotte', grotte: 'grotte',
  interieur: 'ville', sommet: 'grotte',
};

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private timer: number | null = null;
  private current = '';
  muted = false;

  private ensure(): boolean {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return true; }
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1;
      this.musicGain.connect(this.master);
      return true;
    } catch { return false; }
  }

  unlock() { this.ensure(); }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  private tone(freq: number, at: number, dur: number, wave: OscillatorType, vol: number, dest: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur * 0.95);
    o.connect(g); g.connect(dest);
    o.start(at); o.stop(at + dur);
  }

  private freq(semi: number): number { return 440 * Math.pow(2, semi / 12); }

  /** Lance (ou relance) une boucle musicale. */
  play(name: string) {
    if (!this.ensure() || this.current === name) return;
    const t = TRACKS[name];
    if (!t) return;
    this.stopMusic();
    this.current = name;
    const ctx = this.ctx!;
    const beat = 60 / t.bpm;
    const leadBeats = t.lead.reduce((a, n) => a + n[1], 0);
    const loopLen = leadBeats * beat;

    const schedule = () => {
      if (!this.ctx || this.current !== name) return;
      const t0 = ctx.currentTime + 0.06;
      let at = t0;
      for (const [n, d] of t.lead) {
        if (n !== R) this.tone(this.freq(n), at, d * beat * 0.92, t.wave, t.gain, this.musicGain!);
        at += d * beat;
      }
      let bt = t0;
      const bassBeats = t.bass.reduce((a, n) => a + n[1], 0);
      const reps = Math.max(1, Math.round(leadBeats / bassBeats));
      for (let r = 0; r < reps; r++) {
        for (const [n, d] of t.bass) {
          if (n !== R) this.tone(this.freq(n), bt, d * beat * 0.9, 'triangle', t.gain * 0.75, this.musicGain!);
          bt += d * beat;
        }
      }
      this.timer = window.setTimeout(schedule, loopLen * 1000 - 60);
    };
    schedule();
  }

  playBiome(biome: string) { this.play(BIOME_TRACK[biome] ?? 'route'); }

  stopMusic() {
    this.current = '';
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
  }

  /** Bruitages. */
  sfx(kind: string) {
    if (!this.ensure()) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const d = this.master!;
    const S = (semi: number, off: number, len: number, w: OscillatorType = 'square', v = .22) =>
      this.tone(this.freq(semi), t + off, len, w, v, d);
    switch (kind) {
      case 'select': S(12, 0, .06); break;
      case 'back': S(-2, 0, .07, 'triangle'); break;
      case 'bump': S(-14, 0, .07, 'sawtooth', .12); break;
      case 'hit': S(-5, 0, .07, 'sawtooth', .2); S(-12, .05, .1, 'sawtooth', .18); break;
      case 'supereff': S(4, 0, .06, 'sawtooth', .24); S(9, .05, .06, 'sawtooth', .24); S(16, .1, .14, 'sawtooth', .22); break;
      case 'weak': S(-9, 0, .16, 'sine', .16); break;
      case 'faint': for (let i = 0; i < 6; i++) S(4 - i * 3, i * .05, .1, 'triangle', .18); break;
      case 'heal': [0, 4, 7, 12].forEach((n, i) => S(n, i * .07, .16, 'sine', .18)); break;
      case 'levelup': [0, 4, 7, 12, 16].forEach((n, i) => S(n, i * .07, .2, 'triangle', .2)); break;
      case 'ball': S(2, 0, .07); S(7, .09, .07); break;
      case 'catch': [0, 5, 9, 12, 17].forEach((n, i) => S(n, i * .09, .22, 'square', .18)); break;
      case 'item': S(9, 0, .07); S(14, .08, .13); break;
      case 'badge': [0, 7, 12, 19, 24].forEach((n, i) => S(n, i * .1, .3, 'triangle', .2)); break;
      case 'encounter': for (let i = 0; i < 8; i++) S(i % 2 ? -8 : 4, i * .055, .06, 'square', .18); break;
      case 'evolve': [0, 3, 7, 10, 14, 19].forEach((n, i) => S(n, i * .1, .3, 'sine', .18)); break;
      case 'grass': S(-17, 0, .05, 'sawtooth', .07); break;
      default: S(0, 0, .05);
    }
  }
}

export const audio = new Audio();
