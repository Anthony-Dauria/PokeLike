import { TYPE_COLOR, type TypeName } from '../data/types';
import { audio } from '../engine/audio';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const dlg = $('#dialogue');
const dlgText = $('#dlg-text') as HTMLParagraphElement;
const dlgChoices = $('#dlg-choices');
const dlgNext = $('#dlg-next');
const overlay = $('#overlay');
const toastEl = $('#toast');
const fadeEl = $('#fade');

let waiting: (() => void) | null = null;
let typing: number | null = null;
let fullText = '';

export const ui = {
  get dialogueOpen() { return !dlg.hidden; },
  get overlayOpen() { return !overlay.hidden; },
};

/* ------------------------------------------------------------------ */
function typewriter(text: string) {
  fullText = text;
  dlgText.textContent = '';
  let i = 0;
  if (typing) clearInterval(typing);
  typing = window.setInterval(() => {
    dlgText.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(typing!); typing = null; }
  }, 14);
}

function completeTyping(): boolean {
  if (typing) { clearInterval(typing); typing = null; dlgText.textContent = fullText; return true; }
  return false;
}

/** Affiche une ou plusieurs répliques ; se résout quand tout est lu. */
export function say(text: string | string[]): Promise<void> {
  const lines = Array.isArray(text) ? text : [text];
  return lines.reduce((p, line) => p.then(() => sayOne(line)), Promise.resolve());
}

function sayOne(line: string): Promise<void> {
  return new Promise((resolve) => {
    dlg.hidden = false;
    dlgChoices.innerHTML = '';
    dlgNext.style.display = '';
    typewriter(line);
    waiting = () => { waiting = null; dlg.hidden = true; resolve(); };
  });
}

/** Question à choix multiples. Renvoie l'index choisi. */
export function ask(text: string, choices: string[]): Promise<number> {
  return new Promise((resolve) => {
    dlg.hidden = false;
    dlgNext.style.display = 'none';
    typewriter(text);
    dlgChoices.innerHTML = '';
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'btn' + (i === 0 ? ' primary' : '');
      b.textContent = c;
      b.onclick = () => {
        audio.sfx('select');
        dlg.hidden = true; dlgChoices.innerHTML = ''; waiting = null;
        resolve(i);
      };
      dlgChoices.appendChild(b);
    });
    waiting = () => { completeTyping(); };
  });
}

/** À appeler quand le joueur appuie sur A / tape l'écran. */
export function advanceDialogue() {
  if (dlg.hidden || !waiting) return;
  if (completeTyping()) return;
  waiting();
}

dlg.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('#dlg-choices')) return;
  advanceDialogue();
});

/* ------------------------------------------------------------------ */
let toastTimer = 0;
export function toast(text: string, ms = 1800) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms);
}

export function fade(on: boolean, ms = 300): Promise<void> {
  fadeEl.classList.toggle('on', on);
  return new Promise((r) => setTimeout(r, ms));
}

export function setHudVisible(v: boolean) { $('#hud').hidden = !v; }

/* ------------------------------------------------------------------ */
export interface OverlayApi { root: HTMLElement; close(): void }
let overlayClose: (() => void) | null = null;

export function openOverlay(title: string, build: (body: HTMLElement, api: OverlayApi) => void, onClose?: () => void): OverlayApi {
  overlay.hidden = false;
  overlay.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'ov-head';
  const back = document.createElement('button');
  back.className = 'round-btn';
  back.textContent = '←';
  back.style.width = '46px'; back.style.height = '46px';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  head.append(back, h2);
  const body = document.createElement('div');
  body.className = 'ov-body';
  overlay.append(head, body);

  const api: OverlayApi = {
    root: overlay,
    close() {
      overlay.hidden = true; overlay.innerHTML = '';
      overlayClose = null;
      onClose?.();
    },
  };
  back.onclick = () => { audio.sfx('back'); api.close(); };
  overlayClose = () => api.close();
  build(body, api);
  return api;
}

export function closeOverlay() { overlayClose?.(); }

/* ------------------------------------------------------------------ */
export function typeChip(t: TypeName): HTMLElement {
  const s = document.createElement('span');
  s.className = 'chip';
  s.textContent = t;
  s.style.background = TYPE_COLOR[t];
  return s;
}

export function card(build: (c: HTMLElement) => void, onClick?: () => void, dim = false): HTMLElement {
  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = 'card' + (dim ? ' dim' : '');
  build(el);
  if (onClick) el.addEventListener('click', () => { audio.sfx('select'); onClick(); });
  return el;
}

export function section(text: string): HTMLElement {
  const d = document.createElement('div');
  d.className = 'sect-title';
  d.textContent = text;
  return d;
}

export function hpColor(ratio: number): string {
  return ratio > .5 ? 'var(--ok)' : ratio > .2 ? 'var(--warn)' : 'var(--bad)';
}

/* ------------------------------------------------------------------ */
/** Petite saisie de texte plein écran (nom du joueur, surnom…). */
export function promptText(title: string, placeholder: string, def = '', maxLen = 12): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    openOverlay(title, (body, api) => {
      const inp = document.createElement('input');
      inp.value = def;
      inp.placeholder = placeholder;
      inp.maxLength = maxLen;
      inp.autocapitalize = 'words';
      Object.assign(inp.style, {
        width: '100%', padding: '14px 16px', fontSize: '1.1rem', borderRadius: '14px',
        border: '2px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)',
        font: 'inherit', fontWeight: '700',
      } as CSSStyleDeclaration);
      const grid = document.createElement('div');
      grid.className = 'grid2';
      const ok = document.createElement('button');
      ok.className = 'btn primary';
      ok.textContent = 'Valider';
      const skip = document.createElement('button');
      skip.className = 'btn';
      skip.textContent = 'Nom par défaut';
      grid.append(ok, skip);
      body.append(inp, grid);
      const done = (v: string | null) => { if (settled) return; settled = true; api.close(); resolve(v); };
      ok.onclick = () => done(inp.value.trim() || def);
      skip.onclick = () => done(def);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok.click(); });
      setTimeout(() => inp.focus(), 60);
    }, () => { if (!settled) { settled = true; resolve(null); } });
  });
}
