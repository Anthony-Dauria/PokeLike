import { effectiveness, effLabel, type TypeName } from '../data/types';
import { move as getMove, STATUS_LABEL, type Move, type Stat, type Status } from '../data/moves';
import { item as getItem } from '../data/items';
import {
  createMon, evolutionFor, gainXp, isFainted, maxHp, nameOf, spOf, stat, typesOf, xpReward, type Mon,
} from '../game/mon';
import { movesLearnedAt } from '../data/learnsets';

export type BattleKind = 'wild' | 'trainer' | 'gym' | 'league' | 'boss';

export type BattleEvent =
  | { t: 'msg'; text: string; hold?: number }
  | { t: 'anim'; who: 'mine' | 'foe'; kind: 'attack' | 'hurt' | 'faint' | 'send' | 'status' | 'boost' | 'ball' | 'catch' | 'flee' }
  | { t: 'hp'; who: 'mine' | 'foe' }
  | { t: 'bars' }
  | { t: 'send'; who: 'mine' | 'foe' }
  | { t: 'xp'; mon: Mon; amount: number }
  | { t: 'levelup'; mon: Mon; lv: number }
  | { t: 'learn'; mon: Mon; moveId: string }
  | { t: 'evolve'; mon: Mon; to: string }
  | { t: 'caught'; mon: Mon }
  | { t: 'end'; result: 'win' | 'lose' | 'run' | 'caught' };

export type Action =
  | { type: 'move'; index: number }
  | { type: 'switch'; index: number }
  | { type: 'item'; itemId: string; target?: number }
  | { type: 'run' };

interface Side {
  team: Mon[];
  active: number;
  stages: Record<Stat, number>;
  confused: number;
  protect: boolean;
  flinch: boolean;
  itemsUsed: number;
}

function newSide(team: Mon[]): Side {
  return { team, active: 0, stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }, confused: 0, protect: false, flinch: false, itemsUsed: 0 };
}

type CoreStat = Exclude<Stat, 'acc' | 'eva'>;

const stageMul = (n: number) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const accMul = (n: number) => (n >= 0 ? (3 + n) / 3 : 3 / (3 - n));
const rnd = () => Math.random();
const chance = (p: number) => Math.random() * 100 < p;

export interface BattleOptions {
  kind: BattleKind;
  foeTeam: Mon[];
  playerTeam: Mon[];
  trainerName?: string;
  trainerClass?: string;
  money?: number;
  canRun: boolean;
  canCatch: boolean;
  bag: Record<string, number>;
  onConsumeItem?: (id: string) => void;
}

export class Battle {
  mine: Side;
  foe: Side;
  opts: BattleOptions;
  over = false;
  result: 'win' | 'lose' | 'run' | 'caught' | null = null;
  caught: Mon | null = null;
  turn = 0;
  runAttempts = 0;
  private participants = new Set<number>();

  constructor(opts: BattleOptions) {
    this.opts = opts;
    this.mine = newSide(opts.playerTeam);
    this.foe = newSide(opts.foeTeam);
    this.mine.active = opts.playerTeam.findIndex((m) => !isFainted(m));
    if (this.mine.active < 0) this.mine.active = 0;
    this.participants.add(this.activeMine.uid);
  }

  get activeMine(): Mon { return this.mine.team[this.mine.active]; }
  get activeFoe(): Mon { return this.foe.team[this.foe.active]; }

  private sideOf(who: 'mine' | 'foe') { return who === 'mine' ? this.mine : this.foe; }
  private other(who: 'mine' | 'foe'): 'mine' | 'foe' { return who === 'mine' ? 'foe' : 'mine'; }
  private mon(who: 'mine' | 'foe'): Mon { return this.sideOf(who).team[this.sideOf(who).active]; }
  private label(who: 'mine' | 'foe'): string {
    const n = nameOf(this.mon(who));
    return who === 'mine' ? n : (this.opts.kind === 'wild' ? `${n} sauvage` : `${n} ennemi`);
  }

  /* ---------------- statistiques effectives ---------------- */
  private eff(who: 'mine' | 'foe', k: CoreStat): number {
    const s = this.sideOf(who), m = this.mon(who);
    let v = stat(m, k) * stageMul(s.stages[k]);
    if (k === 'atk' && m.status === 'brl') v *= .5;
    if (k === 'spe' && m.status === 'par') v *= .5;
    return Math.max(1, Math.floor(v));
  }

  /* ---------------- tour complet ---------------- */
  takeTurn(action: Action): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    this.turn++;
    this.mine.protect = false; this.foe.protect = false;

    /* --- actions instantanées --- */
    if (action.type === 'run') {
      if (!this.opts.canRun) { ev.push({ t: 'msg', text: 'Impossible de fuir ce combat !' }); }
      else {
        this.runAttempts++;
        const a = this.eff('mine', 'spe'), b = this.eff('foe', 'spe');
        const odds = a >= b ? 1 : ((a * 128) / Math.max(1, b) + 30 * this.runAttempts) / 256;
        if (rnd() < odds) {
          ev.push({ t: 'anim', who: 'mine', kind: 'flee' }, { t: 'msg', text: 'Vous prenez la fuite !' });
          this.finish(ev, 'run');
          return ev;
        }
        ev.push({ t: 'msg', text: 'Impossible de fuir !' });
      }
      this.foeTurn(ev);
      this.endOfTurn(ev);
      return ev;
    }

    if (action.type === 'switch') {
      this.doSwitch(ev, 'mine', action.index);
      if (!this.over) { this.foeTurn(ev); this.endOfTurn(ev); }
      return ev;
    }

    if (action.type === 'item') {
      this.useItem(ev, action.itemId, action.target);
      if (this.over) return ev;
      this.foeTurn(ev);
      this.endOfTurn(ev);
      return ev;
    }

    /* --- combat de capacités --- */
    const myMove = getMove(this.activeMine.moves[action.index].id);
    const foeIdx = this.pickFoeMove();
    const foeMove = getMove(this.activeFoe.moves[foeIdx]?.id ?? 'charge');

    const foeItem = this.foeWantsItem();
    if (foeItem) {
      this.foeUseItem(ev, foeItem);
      this.doMove(ev, 'mine', myMove, action.index);
      this.endOfTurn(ev);
      return ev;
    }

    const myPri = myMove.pri ?? 0, foePri = foeMove.pri ?? 0;
    const mySpd = this.eff('mine', 'spe'), foeSpd = this.eff('foe', 'spe');
    const meFirst = myPri !== foePri ? myPri > foePri : mySpd !== foeSpd ? mySpd > foeSpd : rnd() < .5;

    const order: ['mine' | 'foe', Move, number][] = meFirst
      ? [['mine', myMove, action.index], ['foe', foeMove, foeIdx]]
      : [['foe', foeMove, foeIdx], ['mine', myMove, action.index]];

    for (const [who, mv, idx] of order) {
      if (this.over) break;
      if (isFainted(this.mon(who))) continue;
      this.doMove(ev, who, mv, idx);
      if (this.over) break;
      this.handleFaints(ev);
    }
    if (!this.over) this.endOfTurn(ev);
    return ev;
  }

  /* ---------------- exécution d'une capacité ---------------- */
  private doMove(ev: BattleEvent[], who: 'mine' | 'foe', mv: Move, idx: number) {
    const side = this.sideOf(who);
    const atkMon = this.mon(who);
    const defWho = this.other(who);
    if (isFainted(atkMon)) return;

    const slot = atkMon.moves[idx];
    if (slot && slot.id === mv.id) {
      if (slot.pp <= 0) { ev.push({ t: 'msg', text: `${this.label(who)} n'a plus de PP !` }); return; }
      slot.pp--;
    }

    /* -- entraves -- */
    if (atkMon.status === 'slp') {
      if (atkMon.sleepTurns > 0) { atkMon.sleepTurns--; ev.push({ t: 'msg', text: `${this.label(who)} dort profondément…` }); return; }
      atkMon.status = null;
      ev.push({ t: 'msg', text: `${this.label(who)} se réveille !` });
    }
    if (atkMon.status === 'gel') {
      if (chance(80)) { ev.push({ t: 'msg', text: `${this.label(who)} est gelé et ne peut pas bouger !` }); return; }
      atkMon.status = null;
      ev.push({ t: 'msg', text: `${this.label(who)} dégèle !` });
    }
    if (side.flinch) { side.flinch = false; ev.push({ t: 'msg', text: `${this.label(who)} a trop peur pour attaquer !` }); return; }
    if (atkMon.status === 'par' && chance(25)) { ev.push({ t: 'msg', text: `${this.label(who)} est paralysé et ne peut pas attaquer !` }); return; }
    if (side.confused > 0) {
      side.confused--;
      if (side.confused === 0) ev.push({ t: 'msg', text: `${this.label(who)} n'est plus confus.` });
      else if (chance(33)) {
        const dmg = Math.max(1, Math.floor(((((2 * atkMon.lv) / 5 + 2) * 40 * stat(atkMon, 'atk')) / stat(atkMon, 'def') / 50) + 2));
        atkMon.hp = Math.max(0, atkMon.hp - dmg);
        ev.push({ t: 'msg', text: `${this.label(who)} est confus… il se blesse !` }, { t: 'anim', who, kind: 'hurt' }, { t: 'hp', who });
        return;
      }
    }

    ev.push({ t: 'msg', text: `${this.label(who)} utilise ${mv.name} !` }, { t: 'anim', who, kind: 'attack' });

    /* -- capacités de statut -- */
    if (mv.cat === 'stat') { this.applyStatus(ev, who, mv); return; }

    /* -- précision -- */
    if (mv.acc > 0) {
      const acc = mv.acc * accMul(side.stages.acc) / accMul(this.sideOf(defWho).stages.eva);
      if (rnd() * 100 > acc) {
        ev.push({ t: 'msg', text: `${this.label(who)} rate son attaque…` });
        if (mv.eff?.crash) {
          const d = Math.floor(maxHp(atkMon) * (mv.eff.crash / 100));
          atkMon.hp = Math.max(0, atkMon.hp - d);
          ev.push({ t: 'msg', text: `${this.label(who)} s'écrase au sol !` }, { t: 'hp', who });
        }
        return;
      }
    }

    if (this.sideOf(defWho).protect) {
      ev.push({ t: 'msg', text: `${this.label(defWho)} se protège !` });
      return;
    }

    const defTypes = typesOf(this.mon(defWho));
    const mult = effectiveness(mv.type, defTypes);
    if (mult === 0) { ev.push({ t: 'msg', text: `Ça n'affecte pas ${this.label(defWho)}…` }); return; }

    const hits = mv.eff?.hits ? 2 + Math.floor(rnd() * (mv.eff.hits[1] - mv.eff.hits[0] + 1)) : 1;
    let total = 0;
    let crit = false;
    for (let h = 0; h < hits; h++) {
      if (isFainted(this.mon(defWho))) break;
      const res = this.damage(who, defWho, mv, mult);
      crit = crit || res.crit;
      total += res.dmg;
      const target = this.mon(defWho);
      target.hp = Math.max(0, target.hp - res.dmg);
      ev.push({ t: 'anim', who: defWho, kind: 'hurt' }, { t: 'hp', who: defWho });
    }
    if (hits > 1) ev.push({ t: 'msg', text: `Touché ${hits} fois !` });
    if (crit) ev.push({ t: 'msg', text: 'Coup critique !' });
    const lbl = effLabel(mult);
    if (lbl) ev.push({ t: 'msg', text: lbl });

    /* -- effets secondaires -- */
    const E = mv.eff;
    if (E) {
      if (E.drain && total > 0) {
        const heal = Math.max(1, Math.floor((total * E.drain) / 100));
        atkMon.hp = Math.min(maxHp(atkMon), atkMon.hp + heal);
        ev.push({ t: 'msg', text: `${this.label(who)} absorbe de l'énergie !` }, { t: 'hp', who });
      }
      if (E.recoil && total > 0) {
        const r = Math.max(1, Math.floor((total * E.recoil) / 100));
        atkMon.hp = Math.max(0, atkMon.hp - r);
        ev.push({ t: 'msg', text: `${this.label(who)} subit le contrecoup !` }, { t: 'anim', who, kind: 'hurt' }, { t: 'hp', who });
      }
      const roll = E.chance ?? 100;
      if (E.status && chance(roll)) this.inflict(ev, defWho, E.status);
      if (E.foe && chance(roll)) this.boost(ev, defWho, E.foe);
      if (E.self && chance(roll)) this.boost(ev, who, E.self);
      if (E.flinch && chance(E.flinch)) this.sideOf(defWho).flinch = true;
    }
  }

  private damage(atk: 'mine' | 'foe', def: 'mine' | 'foe', mv: Move, mult: number) {
    const a = this.mon(atk);
    const phys = mv.cat === 'phys';
    const A = this.eff(atk, phys ? 'atk' : 'spa');
    const D = this.eff(def, phys ? 'def' : 'spd');
    const critRate = mv.crit ? 1 / 8 : 1 / 16;
    const crit = rnd() < critRate;
    const stab = typesOf(a).includes(mv.type) ? 1.5 : 1;
    const base = Math.floor(Math.floor((Math.floor((2 * a.lv) / 5 + 2) * mv.power * A) / D) / 50) + 2;
    let dmg = base * stab * mult * (crit ? 1.5 : 1) * (0.85 + rnd() * 0.15);
    if (this.opts.kind === 'boss' && def === 'foe') dmg *= 0.92;
    return { dmg: Math.max(1, Math.floor(dmg)), crit };
  }

  private applyStatus(ev: BattleEvent[], who: 'mine' | 'foe', mv: Move) {
    const E = mv.eff;
    const me = this.mon(who);
    const foeWho = this.other(who);
    if (!E) return;
    if (E.protect) { this.sideOf(who).protect = true; ev.push({ t: 'msg', text: `${this.label(who)} se met en garde !` }); return; }
    if (E.heal) {
      if (me.hp >= maxHp(me)) { ev.push({ t: 'msg', text: 'Mais rien ne se passe…' }); return; }
      me.hp = Math.min(maxHp(me), me.hp + Math.floor((maxHp(me) * E.heal) / 100));
      if (E.cure) { me.status = null; me.sleepTurns = 0; }
      ev.push({ t: 'anim', who, kind: 'boost' }, { t: 'msg', text: `${this.label(who)} récupère des PV !` }, { t: 'hp', who });
      return;
    }
    if (E.self) { this.boost(ev, who, E.self); return; }
    if (E.status) {
      if (mv.acc > 0 && rnd() * 100 > mv.acc) { ev.push({ t: 'msg', text: 'Mais ça échoue !' }); return; }
      this.inflict(ev, foeWho, E.status);
      return;
    }
    if (E.foe) {
      if (mv.acc > 0 && rnd() * 100 > mv.acc) { ev.push({ t: 'msg', text: 'Mais ça échoue !' }); return; }
      this.boost(ev, foeWho, E.foe);
    }
  }

  private inflict(ev: BattleEvent[], who: 'mine' | 'foe', st: Status) {
    const m = this.mon(who);
    if (st === 'cnf') {
      if (this.sideOf(who).confused > 0) return;
      this.sideOf(who).confused = 2 + Math.floor(rnd() * 4);
      ev.push({ t: 'anim', who, kind: 'status' }, { t: 'msg', text: `${this.label(who)} est confus !` });
      return;
    }
    if (m.status) return;
    const t = typesOf(m);
    if (st === 'brl' && t.includes('Feu')) return;
    if ((st === 'psn' || st === 'tox') && (t.includes('Poison') || t.includes('Acier'))) return;
    if (st === 'gel' && t.includes('Glace')) return;
    if (st === 'par' && t.includes('Électrik')) return;
    m.status = st;
    if (st === 'slp') m.sleepTurns = 1 + Math.floor(rnd() * 3);
    if (st === 'tox') m.toxCounter = 1;
    const txt: Record<Status, string> = {
      brl: 'est brûlé !', psn: 'est empoisonné !', tox: 'est gravement empoisonné !',
      par: 'est paralysé !', slp: 's’endort !', gel: 'est gelé !', cnf: 'est confus !',
    };
    ev.push({ t: 'anim', who, kind: 'status' }, { t: 'msg', text: `${this.label(who)} ${txt[st]}` }, { t: 'bars' });
  }

  private boost(ev: BattleEvent[], who: 'mine' | 'foe', changes: Partial<Record<Stat, number>>) {
    const s = this.sideOf(who);
    const names: Record<Stat, string> = { atk: 'Attaque', def: 'Défense', spa: 'Attaque Spé.', spd: 'Défense Spé.', spe: 'Vitesse', acc: 'Précision', eva: 'Esquive' };
    for (const k of Object.keys(changes) as Stat[]) {
      const d = changes[k]!;
      const before = s.stages[k];
      s.stages[k] = Math.max(-6, Math.min(6, before + d));
      if (s.stages[k] === before) {
        ev.push({ t: 'msg', text: `${names[k]} de ${this.label(who)} ne peut pas ${d > 0 ? 'monter' : 'baisser'} plus !` });
        continue;
      }
      const word = d >= 2 ? 'augmente beaucoup' : d === 1 ? 'augmente' : d === -1 ? 'baisse' : 'baisse beaucoup';
      ev.push({ t: 'anim', who, kind: 'boost' }, { t: 'msg', text: `${names[k]} de ${this.label(who)} ${word} !` });
    }
  }

  /* ---------------- IA ---------------- */
  private smart(): boolean { return this.opts.kind === 'gym' || this.opts.kind === 'league' || this.opts.kind === 'boss'; }

  private pickFoeMove(): number {
    const foe = this.activeFoe;
    const slots = foe.moves.filter((s) => s.pp > 0);
    if (!slots.length) return 0;
    const myTypes = typesOf(this.activeMine);
    let bestIdx = 0, best = -1;
    foe.moves.forEach((slot, i) => {
      if (slot.pp <= 0) return;
      const mv = getMove(slot.id);
      const mult = effectiveness(mv.type, myTypes);
      let score: number;
      if (mv.cat === 'stat') {
        score = this.turn <= 2 ? 42 : 8;
        if (mv.eff?.heal && foe.hp < maxHp(foe) * .45) score = 95;
      } else {
        const stab = typesOf(foe).includes(mv.type) ? 1.5 : 1;
        score = mv.power * stab * mult * (mv.acc === 0 ? 1 : mv.acc / 100);
      }
      if (!this.smart()) score += rnd() * 45;
      else score += rnd() * 8;
      if (score > best) { best = score; bestIdx = i; }
    });
    return bestIdx;
  }

  private foeWantsItem(): string | null {
    if (this.opts.kind !== 'league' && this.opts.kind !== 'boss' && this.opts.kind !== 'gym') return null;
    const max = this.opts.kind === 'boss' ? 3 : this.opts.kind === 'league' ? 2 : 1;
    if (this.foe.itemsUsed >= max) return null;
    const f = this.activeFoe;
    if (f.hp > maxHp(f) * .28 || f.hp <= 0) return null;
    return this.opts.kind === 'gym' ? 'hyperpotion' : 'potionmax';
  }

  private foeUseItem(ev: BattleEvent[], id: string) {
    const it = getItem(id);
    const f = this.activeFoe;
    const before = f.hp;
    f.hp = it.healAmount === -1 ? maxHp(f) : Math.min(maxHp(f), f.hp + (it.healAmount ?? 0));
    this.foe.itemsUsed++;
    ev.push(
      { t: 'msg', text: `${this.opts.trainerName ?? 'L’adversaire'} utilise ${it.name} sur ${nameOf(f)} !` },
      { t: 'anim', who: 'foe', kind: 'boost' }, { t: 'hp', who: 'foe' },
      { t: 'msg', text: `${nameOf(f)} récupère ${f.hp - before} PV.` },
    );
  }

  private foeTurn(ev: BattleEvent[]) {
    if (this.over || isFainted(this.activeFoe)) return;
    const idx = this.pickFoeMove();
    const mv = getMove(this.activeFoe.moves[idx]?.id ?? 'charge');
    this.doMove(ev, 'foe', mv, idx);
    this.handleFaints(ev);
  }

  /* ---------------- objets du joueur ---------------- */
  private useItem(ev: BattleEvent[], itemId: string, target?: number) {
    const it = getItem(itemId);
    this.opts.onConsumeItem?.(itemId);
    if (it.kind === 'ball') { this.throwBall(ev, it.ballRate ?? 1); return; }
    const idx = target ?? this.mine.active;
    const m = this.mine.team[idx];
    ev.push({ t: 'msg', text: `Vous utilisez ${it.name}.` });
    if (it.kind === 'heal') {
      if (isFainted(m)) { ev.push({ t: 'msg', text: 'Mais ça n’a aucun effet…' }); return; }
      const before = m.hp;
      m.hp = it.healAmount === -1 ? maxHp(m) : Math.min(maxHp(m), m.hp + (it.healAmount ?? 0));
      ev.push({ t: 'msg', text: `${nameOf(m)} récupère ${m.hp - before} PV.` }, { t: 'hp', who: 'mine' }, { t: 'bars' });
    } else if (it.kind === 'cure') {
      if (m.status && (it.cures?.includes('all') || it.cures?.includes(m.status))) {
        ev.push({ t: 'msg', text: `${nameOf(m)} n'a plus de ${STATUS_LABEL[m.status]}.` });
        m.status = null; m.sleepTurns = 0; m.toxCounter = 0;
      } else ev.push({ t: 'msg', text: 'Mais ça n’a aucun effet…' });
      if (idx === this.mine.active) this.mine.confused = 0;
      ev.push({ t: 'bars' });
    } else if (it.kind === 'revive') {
      if (!isFainted(m)) { ev.push({ t: 'msg', text: 'Mais ça n’a aucun effet…' }); return; }
      m.hp = Math.max(1, Math.floor(maxHp(m) * (it.reviveRatio ?? .5)));
      m.status = null;
      ev.push({ t: 'msg', text: `${nameOf(m)} reprend connaissance !` }, { t: 'bars' });
    } else if (it.kind === 'battle' && it.boost) {
      this.boost(ev, 'mine', { [it.boost.stat]: it.boost.stages });
    }
  }

  private throwBall(ev: BattleEvent[], rate: number) {
    if (!this.opts.canCatch) {
      ev.push({ t: 'msg', text: 'On ne capture pas la créature d’un autre dresseur !' });
      return;
    }
    const f = this.activeFoe;
    ev.push({ t: 'anim', who: 'foe', kind: 'ball' }, { t: 'msg', text: 'Vous lancez une Sphère !' });
    if (rate >= 255) {
      ev.push({ t: 'anim', who: 'foe', kind: 'catch' }, { t: 'msg', text: `Et hop ! ${nameOf(f)} est capturé !` }, { t: 'caught', mon: f });
      this.caught = f; this.finish(ev, 'caught'); return;
    }
    const bonus = f.status === 'slp' || f.status === 'gel' ? 2 : f.status ? 1.5 : 1;
    const cr = spOf(f).catchRate;
    const hpMax = maxHp(f);
    const a = ((3 * hpMax - 2 * f.hp) * cr * rate * bonus) / (3 * hpMax);
    let shakes = 0;
    if (a >= 255) shakes = 4;
    else {
      const b = 65536 / Math.pow(255 / a, 0.25);
      for (let i = 0; i < 4; i++) { if (Math.random() * 65536 < b) shakes++; else break; }
    }
    const msg = ['Oh non ! La créature s’est libérée !', 'Ah ! Presque !', 'C’était moins une !', 'Rhaa ! Encore un peu !'];
    ev.push({ t: 'msg', text: '…', hold: 500 });
    if (shakes >= 4) {
      ev.push({ t: 'anim', who: 'foe', kind: 'catch' }, { t: 'msg', text: `Génial ! ${nameOf(f)} est capturé !` }, { t: 'caught', mon: f });
      this.caught = f;
      this.finish(ev, 'caught');
    } else {
      ev.push({ t: 'msg', text: msg[Math.min(3, shakes)] });
    }
  }

  /* ---------------- changements & KO ---------------- */
  doSwitch(ev: BattleEvent[], who: 'mine' | 'foe', index: number) {
    const s = this.sideOf(who);
    if (index === s.active || isFainted(s.team[index])) return;
    if (!isFainted(this.mon(who))) ev.push({ t: 'msg', text: `${nameOf(this.mon(who))}, reviens !` });
    s.active = index;
    s.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
    s.confused = 0; s.flinch = false;
    if (who === 'mine') this.participants.add(this.activeMine.uid);
    ev.push(
      { t: 'send', who },
      { t: 'anim', who, kind: 'send' },
      { t: 'msg', text: who === 'mine' ? `En avant, ${nameOf(s.team[index])} !` : `${this.opts.trainerName ?? 'L’adversaire'} envoie ${nameOf(s.team[index])} !` },
      { t: 'bars' },
    );
  }

  private handleFaints(ev: BattleEvent[]) {
    if (isFainted(this.activeFoe)) {
      ev.push({ t: 'anim', who: 'foe', kind: 'faint' }, { t: 'msg', text: `${this.label('foe')} est K.O. !` });
      this.awardXp(ev);
      const next = this.foe.team.findIndex((m) => !isFainted(m));
      if (next < 0) { this.finish(ev, 'win'); return; }
      this.doSwitch(ev, 'foe', next);
    }
    if (isFainted(this.activeMine)) {
      ev.push({ t: 'anim', who: 'mine', kind: 'faint' }, { t: 'msg', text: `${nameOf(this.activeMine)} est K.O. !` });
      if (!this.mine.team.some((m) => !isFainted(m))) this.finish(ev, 'lose');
    }
  }

  private awardXp(ev: BattleEvent[]) {
    const base = xpReward(this.activeFoe, this.opts.kind !== 'wild');
    for (const m of this.mine.team) {
      if (isFainted(m)) continue;
      const share = this.participants.has(m.uid) ? base : Math.floor(base * .4);
      if (share <= 0) continue;
      const levels = gainXp(m, share);
      ev.push({ t: 'xp', mon: m, amount: share });
      if (m.uid === this.activeMine.uid) ev.push({ t: 'msg', text: `${nameOf(m)} gagne ${share} points d'expérience !` });
      for (const lv of levels) {
        ev.push({ t: 'levelup', mon: m, lv }, { t: 'msg', text: `${nameOf(m)} monte au niveau ${lv} !` });
        for (const mid of movesLearnedAt(m.sp, lv)) ev.push({ t: 'learn', mon: m, moveId: mid });
        const evo = evolutionFor(m);
        if (evo) ev.push({ t: 'evolve', mon: m, to: evo });
      }
    }
    ev.push({ t: 'bars' });
  }

  /** Fin de tour : statuts persistants. */
  private endOfTurn(ev: BattleEvent[]) {
    if (this.over) return;
    for (const who of ['mine', 'foe'] as const) {
      const m = this.mon(who);
      if (isFainted(m) || !m.status) continue;
      let d = 0;
      if (m.status === 'brl' || m.status === 'psn') d = Math.max(1, Math.floor(maxHp(m) / 8));
      if (m.status === 'tox') { d = Math.max(1, Math.floor((maxHp(m) * m.toxCounter) / 16)); m.toxCounter++; }
      if (d > 0) {
        m.hp = Math.max(0, m.hp - d);
        const w = m.status === 'brl' ? 'souffre de sa brûlure' : 'souffre du poison';
        ev.push({ t: 'msg', text: `${this.label(who)} ${w} !` }, { t: 'anim', who, kind: 'hurt' }, { t: 'hp', who });
      }
    }
    this.handleFaints(ev);
  }

  private finish(ev: BattleEvent[], r: 'win' | 'lose' | 'run' | 'caught') {
    if (this.over) return;
    this.over = true;
    this.result = r;
    ev.push({ t: 'end', result: r });
  }

  /** Changement imposé après un K.O. (ne consomme pas le tour). */
  forcedSwitch(index: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    this.doSwitch(ev, 'mine', index);
    return ev;
  }

  /** Le joueur doit choisir un remplaçant. */
  get needsSwitch(): boolean {
    return !this.over && isFainted(this.activeMine) && this.mine.team.some((m) => !isFainted(m));
  }

  /** Aperçu d'efficacité pour l'UI. */
  previewEff(moveId: string): number {
    const mv = getMove(moveId);
    if (mv.cat === 'stat') return 1;
    return effectiveness(mv.type, typesOf(this.activeFoe) as TypeName[]);
  }
}

export function makeTeam(list: [string, number][]): Mon[] {
  return list.map(([sp, lv]) => createMon(sp, lv));
}
