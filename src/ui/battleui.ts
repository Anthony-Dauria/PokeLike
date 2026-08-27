import { Battle, type Action, type BattleEvent, type BattleKind } from '../battle/engine';
import type { BattleScene } from '../battle/scene';
import { move as getMove, STATUS_LABEL } from '../data/moves';
import { TYPE_COLOR } from '../data/types';
import type { Item } from '../data/items';
import { species } from '../data/species';
import { isFainted, maxHp, nameOf, xpProgress, type Mon } from '../game/mon';
import { state } from '../game/state';
import { audio } from '../engine/audio';
import { ask, hpColor, say, toast } from './ui';
import { openBag, openParty } from './menus';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const root = $('#battle-ui');
const logBox = $('#bt-log');
const logP = $('#bt-log p');
const menu = $('#bt-menu');
const foeBar = $('.bt-bar.foe');
const myBar = $('.bt-bar.mine');

const field = (bar: HTMLElement, f: string) => bar.querySelector<HTMLElement>(`[data-f="${f}"]`)!;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function tapOrWait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      logBox.removeEventListener('pointerdown', finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    logBox.addEventListener('pointerdown', finish);
  });
}

export interface BattleConfig {
  kind: BattleKind;
  foeTeam: Mon[];
  biome: string;
  trainerName?: string;
  trainerClass?: string;
  money?: number;
  canRun?: boolean;
  canCatch?: boolean;
  introLines?: string[];
  music?: string;
}

export type BattleOutcome = { result: 'win' | 'lose' | 'run' | 'caught'; caught: Mon | null };

export class BattleUI {
  constructor(private scene: BattleScene) {}

  private battle!: Battle;

  private setBars() {
    const b = this.battle;
    const foe = b.activeFoe, mine = b.activeMine;
    field(foeBar, 'name').textContent = nameOf(foe);
    field(foeBar, 'lvl').textContent = `N.${foe.lv}`;
    const fr = foe.hp / maxHp(foe);
    const fh = field(foeBar, 'hp');
    fh.style.width = `${Math.max(0, fr) * 100}%`;
    fh.style.background = hpColor(fr);
    field(foeBar, 'st').textContent = foe.status ? STATUS_LABEL[foe.status] : '';
    field(foeBar, 'st').style.color = foe.status ? '#ffb44d' : '';

    field(myBar, 'name').textContent = nameOf(mine);
    field(myBar, 'lvl').textContent = `N.${mine.lv}`;
    const mr = mine.hp / maxHp(mine);
    const mh = field(myBar, 'hp');
    mh.style.width = `${Math.max(0, mr) * 100}%`;
    mh.style.background = hpColor(mr);
    field(myBar, 'hpnum').textContent = `${mine.hp}/${maxHp(mine)}`;
    field(myBar, 'xp').style.width = `${xpProgress(mine) * 100}%`;
    field(myBar, 'st').textContent = mine.status ? STATUS_LABEL[mine.status] : '';
    field(myBar, 'st').style.color = mine.status ? '#ffb44d' : '';
  }

  private async log(text: string, ms = 900) {
    logBox.style.display = '';
    menu.classList.remove('show');
    logP.textContent = text;
    await tapOrWait(ms);
  }

  private showMenu(build: (m: HTMLElement) => void) {
    logBox.style.display = 'none';
    menu.classList.add('show');
    menu.innerHTML = '';
    build(menu);
  }

  private btn(label: string, sub: string, onClick: () => void, color?: string): HTMLElement {
    const b = document.createElement('button');
    b.className = 'move-btn';
    const mv = document.createElement('div');
    mv.className = 'mv';
    mv.textContent = label;
    if (color) {
      const dot = document.createElement('span');
      dot.className = 'chip';
      dot.style.background = color;
      dot.textContent = ' ';
      dot.style.minWidth = '18px';
      mv.append(dot);
    }
    const pp = document.createElement('div');
    pp.className = 'pp';
    pp.innerHTML = sub;
    b.append(mv, pp);
    b.onclick = () => { audio.sfx('select'); onClick(); };
    return b;
  }

  /* ---------------- lecture des évènements ---------------- */
  private async playEvents(events: BattleEvent[]) {
    for (const ev of events) {
      switch (ev.t) {
        case 'msg':
          await this.log(ev.text, ev.hold ?? Math.max(750, ev.text.length * 26));
          break;
        case 'anim': {
          const mv = this.lastMoveType;
          const d = this.scene.play(ev.who, ev.kind, ev.kind === 'hurt' ? mv : undefined);
          if (ev.kind === 'hurt') audio.sfx('hit');
          if (ev.kind === 'faint') audio.sfx('faint');
          if (ev.kind === 'ball') audio.sfx('ball');
          if (ev.kind === 'catch') audio.sfx('catch');
          if (ev.kind === 'boost') audio.sfx('heal');
          await wait(Math.min(d, 620));
          break;
        }
        case 'hp':
        case 'bars':
          this.setBars();
          await wait(180);
          break;
        case 'send':
          if (ev.who === 'mine') this.scene.setMine(this.battle.activeMine);
          else this.scene.setFoe(this.battle.activeFoe, this.battle.opts.kind !== 'wild');
          this.setBars();
          break;
        case 'xp':
          this.setBars();
          break;
        case 'levelup':
          audio.sfx('levelup');
          this.setBars();
          break;
        case 'learn':
          await this.learnMove(ev.mon, ev.moveId);
          break;
        case 'evolve':
          await this.evolve(ev.mon, ev.to);
          break;
        case 'caught':
          state.addMon(ev.mon);
          break;
        case 'end':
          break;
      }
    }
  }

  private lastMoveType: string | undefined;

  private async learnMove(m: Mon, moveId: string) {
    const mv = getMove(moveId);
    if (m.moves.some((s) => s.id === moveId)) return;
    if (m.moves.length < 4) {
      m.moves.push({ id: moveId, pp: mv.pp, maxPp: mv.pp });
      await this.log(`${nameOf(m)} apprend ${mv.name} !`, 1100);
      return;
    }
    const choice = await ask(
      `${nameOf(m)} veut apprendre ${mv.name} (${mv.type}, puissance ${mv.power || '—'}), mais connaît déjà 4 capacités. Laquelle oublier ?`,
      [...m.moves.map((s) => getMove(s.id).name), `Ne pas apprendre ${mv.name}`],
    );
    if (choice >= m.moves.length) {
      await this.log(`${nameOf(m)} n'apprend pas ${mv.name}.`, 900);
      return;
    }
    const old = getMove(m.moves[choice].id).name;
    m.moves[choice] = { id: moveId, pp: mv.pp, maxPp: mv.pp };
    await this.log(`${nameOf(m)} oublie ${old} et apprend ${mv.name} !`, 1200);
  }

  private async evolve(m: Mon, to: string) {
    const before = nameOf(m);
    const yes = await ask(`Hein ?! ${before} évolue !`, ['Laisser évoluer', 'Arrêter l’évolution']);
    if (yes === 1) { await this.log(`${before} n'a pas évolué…`, 900); return; }
    audio.sfx('evolve');
    const hpDiff = maxHp(m) - m.hp;
    m.sp = to;
    m.hp = Math.max(1, maxHp(m) - hpDiff);
    if (m.nick && m.nick === before) m.nick = undefined;
    state.caught.add(to);
    state.seen.add(to);
    if (this.battle.activeMine.uid === m.uid) this.scene.setMine(m);
    await this.log(`Félicitations ! ${before} a évolué en ${species(to).name} !`, 1600);
    this.setBars();
  }

  /* ---------------- boucle principale ---------------- */
  async run(cfg: BattleConfig): Promise<BattleOutcome> {
    const foe0 = cfg.foeTeam[0];
    state.see(foe0.sp);
    const mine0 = state.healthyParty[0];
    this.scene.build(cfg.biome, foe0, mine0 ?? null, cfg.kind !== 'wild');

    this.battle = new Battle({
      kind: cfg.kind,
      foeTeam: cfg.foeTeam,
      playerTeam: state.party,
      trainerName: cfg.trainerName,
      trainerClass: cfg.trainerClass,
      money: cfg.money,
      canRun: cfg.canRun ?? cfg.kind === 'wild',
      canCatch: cfg.canCatch ?? cfg.kind === 'wild',
      bag: state.bag,
      onConsumeItem: (id) => state.removeItem(id),
    });

    root.hidden = false;
    this.setBars();
    audio.play(cfg.music ?? (cfg.kind === 'boss' ? 'boss' : cfg.kind === 'gym' || cfg.kind === 'league' ? 'arene' : 'combat'));

    if (cfg.introLines?.length) for (const l of cfg.introLines) await this.log(l, 1400);
    await this.log(cfg.kind === 'wild'
      ? `Un ${nameOf(foe0)} sauvage apparaît !`
      : `${cfg.trainerName ?? 'Un dresseur'} envoie ${nameOf(foe0)} !`, 1100);
    await this.log(`En avant, ${nameOf(this.battle.activeMine)} !`, 900);

    while (!this.battle.over) {
      if (this.battle.needsSwitch) {
        await this.forceSwitch();
        if (this.battle.over) break;
        continue;
      }
      const action = await this.chooseAction(cfg);
      if (!action) continue;
      const events = this.battle.takeTurn(action);
      await this.playEvents(events);
    }

    const result = this.battle.result ?? 'lose';
    const caught = this.battle.caught;
    if (result === 'win' && cfg.kind !== 'wild' && cfg.money) {
      state.money += cfg.money;
      await this.log(`Vous empochez ${cfg.money} ¤ !`, 1100);
    }
    root.hidden = true;
    menu.classList.remove('show');
    return { result, caught };
  }

  private async forceSwitch() {
    await this.log('Choisissez la créature suivante.', 700);
    await new Promise<void>((resolve) => {
      let chosen = false;
      const open = () => openParty({
        title: 'Envoyer qui ?',
        selectable: true,
        disabled: (m) => isFainted(m),
        onSelect: (i) => {
          chosen = true;
          const ev = this.battle.forcedSwitch(i);
          void this.playEvents(ev).then(resolve);
          return true;
        },
        // Ce choix est obligatoire : refermer le menu le rouvre aussitôt.
        onClose: () => { if (!chosen) setTimeout(open, 0); },
      });
      open();
    });
  }

  private chooseAction(cfg: BattleConfig): Promise<Action | null> {
    return new Promise((resolve) => {
      const main = () => this.showMenu((m) => {
        m.append(this.btn('⚔️ Attaque', 'Choisir une capacité', moves));
        m.append(this.btn('🎒 Sac', 'Soins, Sphères, boosts', bag));
        m.append(this.btn('🐾 Créature', 'Changer de combattant', party));
        m.append(this.btn(cfg.kind === 'wild' ? '🏃 Fuite' : '🚫 Fuite', cfg.kind === 'wild' ? 'Tenter de s’échapper' : 'Impossible ici', run));
      });

      const moves = () => this.showMenu((m) => {
        const mon = this.battle.activeMine;
        mon.moves.forEach((slot, i) => {
          const mv = getMove(slot.id);
          const eff = this.battle.previewEff(slot.id);
          const tag = mv.cat === 'stat' ? '' : eff === 0 ? ' · aucun effet' : eff > 1 ? ' · super efficace' : eff < 1 ? ' · peu efficace' : '';
          const b = this.btn(mv.name, `<span>${mv.type}${tag}</span><span>PP ${slot.pp}/${slot.maxPp}</span>`, () => {
            if (slot.pp <= 0) { toast('Plus de PP pour cette capacité !'); return; }
            this.lastMoveType = mv.type;
            resolve({ type: 'move', index: i });
          }, TYPE_COLOR[mv.type]);
          if (slot.pp <= 0) b.style.opacity = '.45';
          m.append(b);
        });
        m.append(this.btn('← Retour', '', main));
      });

      const bag = () => {
        openBag({
          title: 'Sac — combat',
          filter: (it: Item) => it.usableInBattle,
          onUse: (it) => {
            if (it.kind === 'ball' && !this.battle.opts.canCatch) { void say('On ne capture pas la créature d’un autre dresseur !'); main(); return; }
            if (it.usableOnMon) {
              openParty({
                title: `${it.name} — sur qui ?`,
                selectable: true,
                onSelect: (idx) => { resolve({ type: 'item', itemId: it.id, target: idx }); return true; },
                onClose: main,
              });
            } else resolve({ type: 'item', itemId: it.id });
          },
          onClose: main,
        });
      };

      const party = () => {
        openParty({
          title: 'Changer de créature',
          selectable: true,
          disabled: (m) => isFainted(m) || m.uid === this.battle.activeMine.uid,
          onSelect: (i) => { resolve({ type: 'switch', index: i }); return true; },
          onClose: main,
        });
      };

      const run = () => {
        if (cfg.kind !== 'wild') { toast('Impossible de fuir un combat de dresseur !'); return; }
        resolve({ type: 'run' });
      };

      main();
    });
  }
}
