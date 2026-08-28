import { TYPE_COLOR } from '../data/types';
import { ITEMS, item as getItem, type Item } from '../data/items';
import { DEX, species } from '../data/species';
import { move as getMove } from '../data/moves';
import { STATUS_LABEL } from '../data/moves';
import { GYMS } from '../data/world';
import { maxHp, nameOf, spOf, stat, xpProgress, isFainted, NATURES, type Mon } from '../game/mon';
import { state, saveGame, fmtTime } from '../game/state';
import { audio } from '../engine/audio';
import { ask, card, closeOverlay, hpColor, openOverlay, say, section, toast, typeChip } from './ui';

/* -------------------- vignette d'espèce -------------------- */
export function portrait(spId: string, shiny = false): HTMLElement {
  const sp = species(spId);
  // Mêmes couleurs que le modèle 3D pour que la vignette « ressemble » à la créature.
  const a = sp.body ?? TYPE_COLOR[sp.types[0]];
  const b = sp.accent ?? TYPE_COLOR[sp.types[1] ?? sp.types[0]];
  const d = document.createElement('div');
  d.className = 'sprite';
  d.style.background = `linear-gradient(135deg, ${a}, ${b})`;
  d.style.display = 'flex';
  d.style.alignItems = 'center';
  d.style.justifyContent = 'center';
  d.style.fontWeight = '900';
  d.style.fontSize = '1.4rem';
  d.style.color = '#0b1420';
  d.style.textShadow = '0 1px 0 rgba(255,255,255,.35)';
  d.textContent = sp.name.slice(0, 2);
  if (shiny) d.style.boxShadow = '0 0 10px #ffd166 inset, 0 0 8px #ffd166';
  return d;
}

function monRow(m: Mon, el: HTMLElement) {
  el.append(portrait(m.sp, m.shiny));
  const g = document.createElement('div');
  g.className = 'grow';
  const r1 = document.createElement('div');
  r1.className = 'row1';
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = nameOf(m);
  r1.append(nm);
  for (const t of spOf(m).types) r1.append(typeChip(t));
  const lv = document.createElement('span');
  lv.className = 'sub';
  lv.textContent = `N.${m.lv}`;
  r1.append(lv);
  if (m.status) {
    const st = document.createElement('span');
    st.className = 'chip';
    st.style.background = '#ffb44d';
    st.textContent = STATUS_LABEL[m.status];
    r1.append(st);
  }
  g.append(r1);
  const bar = document.createElement('div');
  bar.className = 'mini-hp';
  const i = document.createElement('i');
  const ratio = m.hp / maxHp(m);
  i.style.width = `${ratio * 100}%`;
  i.style.background = hpColor(ratio);
  bar.append(i);
  g.append(bar);
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = `${m.hp}/${maxHp(m)} PV`;
  g.append(sub);
  el.append(g);
}

/* -------------------- équipe -------------------- */
export function openParty(opts: {
  title?: string;
  selectable?: boolean;
  onSelect?: (index: number) => boolean | void;   // true = fermer
  disabled?: (m: Mon) => boolean;
  onClose?: () => void;
} = {}) {
  const title = opts.title ?? 'Équipe';
  openOverlay(title, (body, api) => {
    const render = () => {
      body.innerHTML = '';
      if (!state.party.length) body.append(section('Aucune créature.'));
      state.party.forEach((m, i) => {
        const dim = opts.disabled?.(m) ?? false;
        body.append(card(
          (c) => monRow(m, c),
          () => {
            if (dim) { toast('Impossible avec cette créature.'); return; }
            if (opts.onSelect) { if (opts.onSelect(i) === true) api.close(); else render(); }
            else openMonDetail(m, render);
          },
          dim,
        ));
      });
      if (!opts.selectable) {
        body.append(section('Astuce'));
        const t = document.createElement('p');
        t.className = 'sub';
        t.style.margin = '0 4px';
        t.textContent = 'Touchez une créature pour voir ses stats et ses capacités.';
        body.append(t);
      }
    };
    render();
  }, opts.onClose);
}

export function openMonDetail(m: Mon, back?: () => void) {
  const sp = spOf(m);
  openOverlay(nameOf(m), (body) => {
    const head = document.createElement('div');
    head.className = 'card';
    monRow(m, head);
    body.append(head);

    body.append(section('Statistiques'));
    const box = document.createElement('div');
    box.className = 'card';
    box.style.display = 'block';
    const nat = NATURES[m.nature];
    const rows: [string, string][] = [
      ['PV', `${m.hp} / ${maxHp(m)}`],
      ['Attaque', String(stat(m, 'atk'))],
      ['Défense', String(stat(m, 'def'))],
      ['Atq. Spé.', String(stat(m, 'spa'))],
      ['Déf. Spé.', String(stat(m, 'spd'))],
      ['Vitesse', String(stat(m, 'spe'))],
      ['Nature', nat.name + (nat.up ? ` (+${nat.up} / −${nat.down})` : ' (neutre)')],
      ['Expérience', `${Math.round(xpProgress(m) * 100)} % vers N.${Math.min(100, m.lv + 1)}`],
      ['Rencontré à', m.metAt],
    ];
    for (const [k, v] of rows) {
      const line = document.createElement('div');
      line.className = 'stat-line';
      line.innerHTML = `<span>${k}</span><b>${v}</b>`;
      box.append(line);
    }
    body.append(box);

    body.append(section('Capacités'));
    for (const slot of m.moves) {
      const mv = getMove(slot.id);
      body.append(card((c) => {
        c.style.display = 'block';
        c.innerHTML = `<div class="row1"><span class="nm">${mv.name}</span></div>
          <div class="sub">${mv.cat === 'stat' ? 'Statut' : mv.cat === 'phys' ? 'Physique' : 'Spéciale'} · Puissance ${mv.power || '—'} · Précision ${mv.acc || '—'} · PP ${slot.pp}/${slot.maxPp}</div>`;
        c.querySelector('.row1')!.append(typeChip(mv.type));
      }));
    }

    body.append(section('Description'));
    const p = document.createElement('p');
    p.className = 'sub';
    p.style.margin = '0 6px';
    p.textContent = sp.flavor;
    body.append(p);

    if (state.party.length > 1 && state.party.includes(m)) {
      body.append(section('Actions'));
      const grid = document.createElement('div');
      grid.className = 'grid2';
      const up = document.createElement('button');
      up.className = 'btn';
      up.textContent = '↑ Placer en tête';
      up.onclick = () => {
        const i = state.party.indexOf(m);
        state.party.splice(i, 1); state.party.unshift(m);
        audio.sfx('select'); toast(`${nameOf(m)} passe en tête.`);
        closeOverlay(); back?.();
      };
      const dep = document.createElement('button');
      dep.className = 'btn';
      dep.textContent = 'Déposer au PC';
      dep.onclick = async () => {
        if (state.party.length <= 1) { toast('Impossible : dernière créature.'); return; }
        state.party.splice(state.party.indexOf(m), 1);
        state.box.push(m);
        toast(`${nameOf(m)} rejoint le PC.`);
        closeOverlay(); back?.();
      };
      grid.append(up, dep);
      body.append(grid);
    }
  }, back);
}

/* -------------------- sac -------------------- */
const KIND_LABEL: Record<string, string> = {
  ball: 'Sphères', heal: 'Soins', cure: 'Statuts', revive: 'Rappels', battle: 'Combat', key: 'Objets clés',
};

export function openBag(opts: {
  filter?: (it: Item) => boolean;
  onUse?: (it: Item) => void;
  title?: string;
  onClose?: () => void;
} = {}) {
  openOverlay(opts.title ?? 'Sac', (body, api) => {
    const entries = Object.entries(state.bag).filter(([id, n]) => n > 0 && ITEMS[id] && (!opts.filter || opts.filter(ITEMS[id])));
    if (!entries.length) { body.append(section('Le sac est vide.')); return; }
    const groups: Record<string, [string, number][]> = {};
    for (const [id, n] of entries) (groups[ITEMS[id].kind] ??= []).push([id, n]);
    for (const kind of ['ball', 'heal', 'cure', 'revive', 'battle', 'key']) {
      const g = groups[kind];
      if (!g) continue;
      body.append(section(KIND_LABEL[kind]));
      for (const [id, n] of g) {
        const it = getItem(id);
        body.append(card((c) => {
          c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">${it.name}</span><span class="sub">×${n}</span></div><div class="sub">${it.desc}</div></div>`;
        }, () => {
          if (opts.onUse) { opts.onUse(it); api.close(); }
          else useOutOfBattle(it, () => api.close());
        }));
      }
    }
  }, opts.onClose);
}

function useOutOfBattle(it: Item, close: () => void) {
  if (it.kind === 'key') {
    if (it.id === 'repousse') {
      state.removeItem('repousse');
      state.repel = 200;
      toast('Repousse activé (200 pas).');
      audio.sfx('item');
      close();
      return;
    }
    void say(it.desc);
    return;
  }
  if (!it.usableOnMon) { void say('Cet objet ne s’utilise qu’en combat.'); return; }
  openParty({
    title: `${it.name} — sur qui ?`,
    selectable: true,
    onSelect: (i) => {
      const m = state.party[i];
      if (it.kind === 'heal') {
        if (isFainted(m) || m.hp >= maxHp(m)) { toast('Aucun effet.'); return false; }
        const before = m.hp;
        m.hp = it.healAmount === -1 ? maxHp(m) : Math.min(maxHp(m), m.hp + (it.healAmount ?? 0));
        state.removeItem(it.id);
        audio.sfx('heal');
        toast(`${nameOf(m)} récupère ${m.hp - before} PV.`);
      } else if (it.kind === 'cure') {
        if (!m.status || !(it.cures?.includes('all') || it.cures?.includes(m.status))) { toast('Aucun effet.'); return false; }
        m.status = null; m.sleepTurns = 0; m.toxCounter = 0;
        state.removeItem(it.id);
        audio.sfx('heal');
        toast(`${nameOf(m)} est soigné.`);
      } else if (it.kind === 'revive') {
        if (!isFainted(m)) { toast('Aucun effet.'); return false; }
        m.hp = Math.max(1, Math.floor(maxHp(m) * (it.reviveRatio ?? .5)));
        m.status = null;
        state.removeItem(it.id);
        audio.sfx('heal');
        toast(`${nameOf(m)} reprend connaissance !`);
      } else { toast('Aucun effet ici.'); return false; }
      return true;
    },
    onClose: close,
  });
}

/* -------------------- boutique -------------------- */
export function openShop(stock: string[], onClose?: () => void) {
  openOverlay('Boutique', (body, api) => {
    const money = document.createElement('div');
    money.className = 'card';
    const refresh = () => { money.innerHTML = `<div class="grow"><div class="row1"><span class="nm">Porte-monnaie</span></div><div class="sub">${state.money} ¤</div></div>`; };
    refresh();
    body.append(money);
    body.append(section('Acheter'));
    for (const id of stock) {
      const it = getItem(id);
      body.append(card((c) => {
        c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">${it.name}</span><span class="sub">${it.price} ¤</span></div><div class="sub">${it.desc}</div></div>`;
      }, async () => {
        const qty = [1, 5, 10].filter((q) => it.price * q <= state.money);
        if (!qty.length) { await say('Vous n’avez pas assez d’argent.'); return; }
        const choice = await ask(`${it.name} — combien ?`, [...qty.map((q) => `×${q} (${q * it.price} ¤)`), 'Annuler']);
        if (choice >= qty.length) return;
        const q = qty[choice];
        state.money -= it.price * q;
        state.addItem(id, q);
        audio.sfx('item');
        refresh();
        toast(`${it.name} ×${q} acheté.`);
      }));
    }
    body.append(section('Revendre'));
    const sellables = Object.keys(state.bag).filter((id) => ITEMS[id]?.price > 0 && state.bag[id] > 0);
    if (!sellables.length) body.append(section('Rien à revendre.'));
    for (const id of sellables) {
      const it = getItem(id);
      body.append(card((c) => {
        c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">${it.name}</span><span class="sub">×${state.bag[id]}</span></div><div class="sub">Revente : ${Math.floor(it.price / 2)} ¤</div></div>`;
      }, () => {
        state.removeItem(id);
        state.money += Math.floor(it.price / 2);
        audio.sfx('select');
        refresh();
        toast(`Vendu ${it.name}.`);
        api.close();
        openShop(stock, onClose);
      }));
    }
  }, onClose);
}

/* -------------------- PC -------------------- */
export function openPC(onClose?: () => void) {
  openOverlay('PC — Stockage', (body, api) => {
    const render = () => {
      body.innerHTML = '';
      body.append(section(`Équipe (${state.party.length}/6)`));
      state.party.forEach((m) => {
        body.append(card((c) => monRow(m, c), () => {
          if (state.party.length <= 1) { toast('Impossible : dernière créature.'); return; }
          state.party.splice(state.party.indexOf(m), 1);
          state.box.push(m);
          render();
        }));
      });
      body.append(section(`Boîte (${state.box.length})`));
      if (!state.box.length) {
        const p = document.createElement('p');
        p.className = 'sub'; p.style.margin = '0 6px';
        p.textContent = 'La boîte est vide.';
        body.append(p);
      }
      state.box.forEach((m) => {
        body.append(card((c) => monRow(m, c), () => {
          if (state.party.length >= 6) { toast('Équipe pleine (6).'); return; }
          state.box.splice(state.box.indexOf(m), 1);
          state.party.push(m);
          render();
        }));
      });
    };
    render();
    void api;
  }, onClose);
}

/* -------------------- Dex -------------------- */
export function openDex(onClose?: () => void) {
  openOverlay(`Dex — ${state.caught.size}/${DEX.length}`, (body) => {
    for (const sp of DEX) {
      const caught = state.caught.has(sp.id);
      const seen = state.seen.has(sp.id) || caught;
      body.append(card((c) => {
        if (!seen) {
          c.innerHTML = `<div class="sprite"></div><div class="grow"><div class="row1"><span class="nm">N°${String(sp.dex).padStart(3, '0')} — ???</span></div><div class="sub">Jamais rencontré</div></div>`;
          return;
        }
        c.append(portrait(sp.id));
        const g = document.createElement('div');
        g.className = 'grow';
        const r = document.createElement('div');
        r.className = 'row1';
        r.innerHTML = `<span class="nm">N°${String(sp.dex).padStart(3, '0')} ${sp.name}</span>`;
        for (const t of sp.types) r.append(typeChip(t));
        if (caught) { const k = document.createElement('span'); k.className = 'sub'; k.textContent = '✔ capturé'; r.append(k); }
        g.append(r);
        const d = document.createElement('div');
        d.className = 'sub';
        d.textContent = caught ? sp.flavor : 'Aperçu seulement.';
        g.append(d);
        c.append(g);
      }, seen ? () => void say(`${sp.name}\n${sp.flavor}`) : undefined, !seen));
    }
  }, onClose);
}

/* -------------------- badges -------------------- */
export function openBadges(onClose?: () => void) {
  openOverlay('Badges', (body) => {
    for (const region of [1, 2] as const) {
      const list = GYMS.filter((g) => (region === 1 ? g.order <= 8 : g.order > 8));
      body.append(section(region === 1 ? 'Valmore' : 'Orsyn (post-Ligue)'));
      const grid = document.createElement('div');
      grid.className = 'badges';
      for (const g of list) {
        const b = document.createElement('div');
        b.className = 'badge' + (state.hasBadge(g.id) ? ' on' : '');
        b.textContent = g.badge.icon;
        b.title = g.badge.name;
        grid.append(b);
      }
      body.append(grid);
      for (const g of list) {
        if (!state.hasBadge(g.id)) continue;
        const p = document.createElement('div');
        p.className = 'sub';
        p.style.margin = '2px 6px';
        p.textContent = `${g.badge.icon} ${g.badge.name} — ${g.leader} (${g.type})`;
        body.append(p);
      }
    }
    if (state.flag('champion')) body.append(section('🏆 Maître de la Ligue de Valmore'));
    if (state.flag('boss_boss-final')) body.append(section('🌑 Vainqueur du Reclus du Mont Cendre'));
  }, onClose);
}

/* -------------------- menu principal -------------------- */
export function openMainMenu(onClose?: () => void) {
  openOverlay('Menu', (body, api) => {
    const entries: [string, string, () => void][] = [
      ['🐾', 'Équipe', () => { api.close(); openParty({ onClose }); }],
      ['🎒', 'Sac', () => { api.close(); openBag({ onClose }); }],
      ['📘', 'Dex', () => { api.close(); openDex(onClose); }],
      ['🏅', 'Badges', () => { api.close(); openBadges(onClose); }],
      ['💾', 'Sauvegarder', async () => {
        const ok = saveGame();
        audio.sfx(ok ? 'item' : 'back');
        await say(ok ? 'Partie sauvegardée !' : 'Échec de la sauvegarde (stockage indisponible).');
      }],
      ['⚙️', 'Options', () => { api.close(); openOptions(onClose); }],
    ];
    const info = document.createElement('div');
    info.className = 'card';
    info.innerHTML = `<div class="grow"><div class="row1"><span class="nm">${state.name}</span></div>
      <div class="sub">${state.money} ¤ · ${state.badgeCount} badge(s) · ${fmtTime(state.playTime)} de jeu</div>
      <div class="sub">Dex : ${state.caught.size} capturée(s) / ${state.seen.size} vue(s)</div></div>`;
    body.append(info);
    for (const [icon, label, fn] of entries) {
      body.append(card((c) => {
        c.innerHTML = `<div class="sprite" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem">${icon}</div>
          <div class="grow"><div class="row1"><span class="nm">${label}</span></div></div>`;
      }, fn));
    }
  }, onClose);
}

let onQualityChange: (() => void) | null = null;
export function setQualityHandler(fn: () => void) { onQualityChange = fn; }

export function openOptions(onClose?: () => void) {
  openOverlay('Options', (body) => {
    const soundBtn = card((c) => {
      c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">Son</span></div><div class="sub">${state.muted ? 'Coupé' : 'Activé'}</div></div>`;
    }, () => {
      state.muted = !state.muted;
      audio.setMuted(state.muted);
      saveGame();
      closeOverlay();
      openOptions(onClose);
    });
    body.append(soundBtn);
    body.append(card((c) => {
      c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">Rendu</span></div>
        <div class="sub">${state.style === 'ds' ? 'Écran DS — basse définition, palette 15 bits' : 'Lisse — pleine définition'}</div></div>`;
    }, () => {
      state.style = state.style === 'ds' ? 'lisse' : 'ds';
      onQualityChange?.();
      saveGame();
      closeOverlay();
      openOptions(onClose);
    }));
    body.append(card((c) => {
      c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">Graphismes</span></div>
        <div class="sub">${state.quality === 'haut' ? 'Élevés — ombres portées, pleine résolution' : 'Légers — sans ombres, meilleure autonomie'}</div></div>`;
    }, () => {
      state.quality = state.quality === 'haut' ? 'leger' : 'haut';
      onQualityChange?.();
      saveGame();
      closeOverlay();
      openOptions(onClose);
    }));
    body.append(card((c) => {
      c.innerHTML = `<div class="grow"><div class="row1"><span class="nm">Sauvegarder maintenant</span></div><div class="sub">Progression stockée sur l’appareil</div></div>`;
    }, async () => { saveGame(); audio.sfx('item'); toast('Partie sauvegardée !'); }));
    body.append(section('Commandes'));
    const p = document.createElement('p');
    p.className = 'sub';
    p.style.margin = '0 6px';
    p.innerHTML = 'Joystick tactile pour se déplacer · <b>A</b> pour parler / valider · <b>B</b> pour annuler · <b>☰</b> pour ce menu.<br>Clavier : flèches / ZQSD, <b>Entrée</b> = A, <b>Échap</b> = B, <b>Maj</b> = courir.';
    body.append(p);
    body.append(section('À propos'));
    const a = document.createElement('p');
    a.className = 'sub';
    a.style.margin = '0 6px';
    a.textContent = 'PokeLike — 16 arènes, une Ligue et un post-game. Jeu hors-ligne : ajoutez-le à votre écran d’accueil pour y jouer comme une vraie appli.';
    body.append(a);
  }, onClose);
}
