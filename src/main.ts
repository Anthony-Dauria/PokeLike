import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';

import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { audio } from './engine/audio';
import { RNG } from './engine/rng';

import { getMap, type Ent, type GameMap } from './world/mapgen';
import { entKey, Overworld } from './world/overworld';
import { BattleScene } from './battle/scene';
import { BattleUI, type BattleConfig } from './ui/battleui';

import {
  FINAL_BOSS, GYM, GYMS, LEAGUE, RIVAL_COUNTER, RIVAL_NAME, START_ZONE,
  STATIC_ENCOUNTERS, ZONE, type Enc, type Link,
} from './data/world';
import { DEX, hasSpecies, species, stageForLevel } from './data/species';
import { item as getItem } from './data/items';
import { createMon, maxHp, nameOf } from './game/mon';
import { makeTeam } from './battle/engine';
import { deleteSave, fmtTime, hasSave, loadGame, saveGame, state, type Gender } from './game/state';
import { buildCreature, buildHuman, type CreatureRig } from './creature/model';
import { setPortraitSource, type HumanId } from './ui/portraits';

import { advanceDialogue, ask, fade, openOverlay, promptText, say, setHudVisible, toast, ui } from './ui/ui';
import { bust, openMainMenu, openParty, openShop, openPC, portrait, setQualityHandler } from './ui/menus';

registerSW({ immediate: true });

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

type Mode = 'title' | 'overworld' | 'battle' | 'busy';

/* ------------------------------------------------------------------ */
/* Évènements scénarisés du rival                                      */
/* ------------------------------------------------------------------ */
const RIVAL_EVENTS: { zone: string; flag: string; lv: number; extras: string[] }[] = [
  { zone: 'route2', flag: 'rival1', lv: 12, extras: ['rattata', 'pidgey'] },
  { zone: 'route5', flag: 'rival2', lv: 26, extras: ['pidgeotto', 'shinx', 'gastly'] },
  { zone: 'route8', flag: 'rival3', lv: 40, extras: ['sneasel', 'graveler', 'butterfree', 'machoke'] },
  { zone: 'route10', flag: 'rival4', lv: 52, extras: ['staraptor', 'golem', 'kadabra', 'lapras', 'gabite'] },
];

function rivalTeam(lv: number, extras: string[]): [string, number][] {
  const starterLine = RIVAL_COUNTER[state.starter] ?? 'ondulin';
  const team: [string, number][] = extras.map((sp, i) => [sp, Math.max(2, lv - 2 + (i % 2))]);
  team.push([stageForLevel(starterLine, lv), lv + 2]);
  return team;
}

/* ------------------------------------------------------------------ */
class Game {
  renderer = new Renderer($('#scene') as HTMLCanvasElement);
  input = new Input();
  battleScene = new BattleScene(this.renderer.gl);
  battleUI = new BattleUI(this.battleScene);
  overworld: Overworld;
  map!: GameMap;
  mode: Mode = 'title';
  private last = performance.now();
  private installPrompt: (Event & { prompt(): Promise<void> }) | null = null;

  constructor() {
    this.overworld = new Overworld({
      onStep: () => this.onStep(),
      onEncounterTile: () => this.onEncounterTile(),
      onExit: (to, ent) => void this.onExit(to, ent),
      onDoor: (to) => void this.goto(to),
      onInteract: (e) => void this.interact(e),
      onTrainerSight: (e) => void this.trainerSight(e),
    });
    this.registerPortraits();
    setQualityHandler(() => this.applyQuality());
    this.applyQuality();
    this.bindTitle();
    requestAnimationFrame((t) => this.loop(t));
  }

  /* ---------------- écran titre ---------------- */
  private bindTitle() {
    const titleEl = $('#title');
    const cont = titleEl.querySelector<HTMLButtonElement>('[data-act="continue"]')!;
    const nw = titleEl.querySelector<HTMLButtonElement>('[data-act="new"]')!;
    const inst = titleEl.querySelector<HTMLButtonElement>('[data-act="install"]')!;
    const hint = $('#title-hint');

    if (hasSave()) cont.hidden = false;
    hint.textContent = 'Astuce : « Partager → Sur l’écran d’accueil » (iOS) ou « Installer l’application » (Android) pour jouer hors-ligne.';

    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as Event & { prompt(): Promise<void> };
      inst.hidden = false;
    });
    inst.onclick = async () => { await this.installPrompt?.prompt(); inst.hidden = true; };

    cont.onclick = () => { audio.unlock(); audio.sfx('select'); void this.continueGame(); };
    nw.onclick = async () => {
      audio.unlock(); audio.sfx('select');
      if (hasSave()) {
        const c = await ask('Une sauvegarde existe déjà. Elle sera écrasée.', ['Continuer quand même', 'Annuler']);
        if (c === 1) return;
        deleteSave();
      }
      void this.newGame();
    };
  }

  /** Applique le niveau de détail choisi (ombres + résolution interne). */
  applyQuality() {
    this.renderer.setQuality(state.quality);
    this.renderer.setStyle(state.style);
    this.overworld.shadows = state.quality === 'haut';
    this.battleScene.shadows = state.quality === 'haut';
    this.battleScene.mode = state.creatures;
    if (this.overworld.loaded) {
      this.overworld.load(this.map, [this.overworld.px, this.overworld.py], this.overworld.facing, this.hiddenSet(), this.beatenSet());
    }
  }

  private async continueGame() {
    if (!loadGame()) { await say('Sauvegarde illisible.'); return; }
    audio.setMuted(state.muted);
    this.applyQuality();
    $('#title').hidden = true;
    setHudVisible(true);
    await this.goto(state.zone, { x: state.x, y: state.y, facing: state.facing, silent: true });
  }

  private async newGame() {
    // L'écran-titre reste en fond pendant toute l'intro : sans lui, le professeur
    // parlait devant un écran noir, faute de carte chargée.
    $('#title').classList.add('as-backdrop');
    this.mode = 'busy';
    const genre = await this.chooseGender();
    const parDefaut = genre === 'f' ? 'Flora' : 'Sacha';
    const name = await promptText('Comment t’appelles-tu ?', 'Ton prénom', parDefaut, 12);
    state.reset(name || parDefaut, genre);
    await say([
      `Pr. Ombelle : Bonjour ${state.name} ! Bienvenue dans la région de Valmore.`,
      'Pr. Ombelle : Ici, les dresseurs voyagent avec des créatures et défient les 8 Arènes avant d’affronter la Ligue.',
      'Pr. Ombelle : Choisis ton premier compagnon. Ce choix te suivra très loin…',
    ]);
    await this.chooseStarter();
    await say([
      `Pr. Ombelle : Excellent choix ! Voici 5 Sphères et 3 Potions.`,
      'Pr. Ombelle : Direction le nord ! Sérènis et sa première Arène t’attendent.',
      `Pr. Ombelle : Ah, et ${RIVAL_NAME} est parti avant toi. Vous vous croiserez, c’est certain.`,
    ]);
    setHudVisible(true);
    saveGame();
    await this.goto(START_ZONE, { silent: false });
    $('#title').hidden = true;
    $('#title').classList.remove('as-backdrop');
  }

  /**
   * Branche les vignettes de l'interface sur la cuisson hors écran du moteur :
   * menus, Pokédex et dialogues montrent ainsi les modèles réels du jeu.
   */
  private registerPortraits() {
    const humains: Record<HumanId, () => CreatureRig> = {
      'joueur-g': () => buildHuman(0x2a7fd4, 0xf2c9a0, 0x2b1d16, 0xe8434e),
      'joueur-f': () => buildHuman(0xe0518a, 0xf2c9a0, 0x8a4326, 0xf6f8fc, true),
      // Blouse claire et cheveux gris : le professeur se reconnaît au premier coup d'œil.
      prof: () => buildHuman(0xf1f4f8, 0xeac39c, 0xb9c0c8),
      rival: () => buildHuman(0x6b4bb5, 0xe8bb92, 0x8a3a2a),
      // Silhouette neutre pour tout autre interlocuteur : dresseurs, gardes, marchands.
      pnj: () => buildHuman(0x5f8f6a, 0xe0b48c, 0x3a2f28),
    };
    setPortraitSource({
      creature: (id, shiny) =>
        this.battleScene.sprites?.portrait(`sp:${id}${shiny ? '*' : ''}`, () => buildCreature(species(id), !!shiny)) ?? '',
      human: (id) => this.battleScene.sprites?.portrait(`hu:${id}`, humains[id], true) ?? '',
      packUrl: (id) => this.battleScene.sprites?.packUrl(species(id)) ?? Promise.resolve(null),
    });
  }

  /** Choix du sexe : obligatoire, il détermine l'apparence et les accords. */
  private chooseGender(): Promise<Gender> {
    const opts: [Gender, string, string][] = [
      ['g', 'Garçon', 'Casquette rouge, veste bleue.'],
      ['f', 'Fille', 'Cheveux longs, bonnet blanc.'],
    ];
    return new Promise((resolve) => {
      let done = false;
      const open = () => openOverlay('Qui es-tu ?', (body, api) => {
        for (const [id, label, sub] of opts) {
          const c = document.createElement('button');
          c.className = 'card';
          c.append(bust(id === 'f' ? 'joueur-f' : 'joueur-g'));
          const g = document.createElement('div');
          g.className = 'grow';
          g.innerHTML = `<div class="row1"><span class="nm">${label}</span></div><div class="sub">${sub}</div>`;
          c.append(g);
          c.onclick = () => { done = true; audio.sfx('select'); api.close(); resolve(id); };
          body.append(c);
        }
      }, () => { if (!done) setTimeout(open, 0); });   // choix obligatoire
      open();
    });
  }

  private chooseStarter(): Promise<void> {
    const opts: [string, string][] = [
      ['brasillon', 'Feu — évolue en Feu/Dragon'],
      ['ondulin', 'Eau — évolue en Eau/Spectre'],
      ['germinuit', 'Plante — évolue en Plante/Ténèbres'],
    ];
    return new Promise((resolve) => {
      let chosen = false;
      const open = () => openOverlay('Choisis ton starter', (body, api) => {
        for (const [id, sub] of opts) {
          const sp = species(id);
          const c = document.createElement('button');
          c.className = 'card';
          c.append(portrait(id));
          const g = document.createElement('div');
          g.className = 'grow';
          g.innerHTML = `<div class="row1"><span class="nm">${sp.name}</span></div>
            <div class="sub">${sub}</div><div class="sub">${sp.flavor}</div>`;
          c.append(g);
          c.onclick = async () => {
            const conf = await ask(`Prendre ${sp.name} ?`, ['Oui !', 'Non, voir les autres']);
            if (conf === 1) return;
            chosen = true;
            state.giveStarter(id);
            state.see(id);
            audio.sfx('catch');
            api.close();
            resolve();
          };
          body.append(c);
        }
      }, () => { if (!chosen) setTimeout(open, 0); });   // choix obligatoire
      open();
    });
  }

  /* ---------------- navigation ---------------- */
  private hiddenSet(): Set<string> {
    const s = new Set<string>();
    for (const k of Object.keys(state.flags)) if (k.startsWith('rm:') && state.flags[k]) s.add(k.slice(3));
    return s;
  }
  private beatenSet(): Set<string> {
    const s = new Set<string>();
    for (const k of Object.keys(state.flags)) if (k.startsWith('tr:') && state.flags[k]) s.add(k.slice(3));
    return s;
  }

  private resolveSpawn(target: GameMap, fromId: string | null): { pos: [number, number]; facing: number } {
    if (fromId) {
      const key = 'from:' + fromId;
      if (target.spawns[key]) {
        const ex = target.ents.find((e) => e.kind === 'exit' && e.to === fromId);
        const dirFace: Record<string, number> = { n: 0, s: 2, e: 1, w: 3 };
        return { pos: target.spawns[key], facing: ex && ex.kind === 'exit' ? dirFace[ex.dir] ?? 0 : 0 };
      }
      const door = target.ents.find((e) => e.kind === 'door' && e.to === fromId);
      if (door) return { pos: [door.x, door.y + 1], facing: 0 };
    }
    return { pos: target.spawns.default ?? [Math.floor(target.w / 2), Math.floor(target.h / 2)], facing: 0 };
  }

  async goto(id: string, opts: { x?: number; y?: number; facing?: number; silent?: boolean } = {}) {
    const prev = this.map?.id ?? null;
    this.mode = 'busy';
    await fade(true, 260);
    const target = getMap(id);
    let pos: [number, number], facing: number;
    if (opts.x !== undefined && opts.y !== undefined) { pos = [opts.x, opts.y]; facing = opts.facing ?? 0; }
    else ({ pos, facing } = this.resolveSpawn(target, prev));

    this.map = target;
    this.overworld.load(target, pos, facing, this.hiddenSet(), this.beatenSet());
    state.zone = id; state.x = pos[0]; state.y = pos[1]; state.facing = facing;
    this.playMapMusic();
    this.mode = 'overworld';
    setHudVisible(true);
    await fade(false, 260);
    if (!opts.silent) this.banner(ZONE[target.zoneId]?.intro && target.zoneId === target.id ? ZONE[target.zoneId].intro! : target.name);
    await this.zoneScript(target);
  }

  /** Musique correspondant à la carte courante. */
  private playMapMusic() {
    const m = this.map;
    if (m.music === 'arene' || m.music === 'boss') audio.play(m.music);
    else audio.playBiome(m.biome);
  }

  private banner(text: string) {
    const b = $('#loc-banner');
    b.querySelector('span')!.textContent = text;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2200);
  }

  /** Scènes déclenchées à l'entrée d'une zone. */
  private async zoneScript(map: GameMap) {
    const ev = RIVAL_EVENTS.find((r) => r.zone === map.id);
    if (ev && !state.flag(ev.flag)) {
      state.setFlag(ev.flag);
      this.mode = 'busy';
      await say([
        `${RIVAL_NAME} : Tiens ! Je me disais bien que je te croiserais ici.`,
        `${RIVAL_NAME} : Montre-moi où tu en es. Pas de quartier !`,
      ]);
      const out = await this.battle({
        kind: 'trainer', biome: map.biome, foeTeam: makeTeam(rivalTeam(ev.lv, ev.extras)),
        trainerName: RIVAL_NAME, money: ev.lv * 60, canRun: false, canCatch: false,
      });
      if (out === 'win') await say(`${RIVAL_NAME} : Pas mal… vraiment pas mal. On se revoit plus loin !`);
      this.mode = 'overworld';
    }
    if (map.id === 'sommet-cendre' && !state.flag('summit_seen')) {
      state.setFlag('summit_seen');
      await say('Le vent tombe d’un coup. Une silhouette immobile vous attend au bord du cratère.');
    }
  }

  private async onExit(to: string, ent: Ent) {
    if (ent.kind !== 'exit') return;
    const link: Link = ent.link;
    if (link.needBadge && state.badgeCount < link.needBadge) {
      this.overworld.pushBack();
      await say(link.block ?? 'Le passage est bloqué.');
      return;
    }
    if (link.needFlag && !state.flag(link.needFlag)) {
      this.overworld.pushBack();
      await say(link.block ?? 'Le passage est bloqué.');
      return;
    }
    await this.goto(to);
  }

  /* ---------------- pas & rencontres ---------------- */
  private onStep() {
    state.steps++;
    if (state.repel > 0) state.repel--;
    state.x = this.overworld.px; state.y = this.overworld.py; state.facing = this.overworld.facing;
  }

  private onEncounterTile() {
    const z = ZONE[this.map.zoneId];
    if (!z?.enc?.length) return;
    if (Math.random() > 0.115) return;

    // Légendaire itinérant (post-Ligue)
    const leg = STATIC_ENCOUNTERS.find((s) => s.zone === this.map.id && !state.flag(s.flag));
    if (leg && state.flag('champion') && Math.random() < 0.05) {
      state.setFlag(leg.flag);
      void this.legendary(leg.sp, leg.lv, leg.text);
      return;
    }

    const lead = state.healthyParty[0];
    const total = z.enc.reduce((a, e) => a + e.w, 0);
    let r = Math.random() * total;
    let pick: Enc = z.enc[0];
    for (const e of z.enc) { r -= e.w; if (r <= 0) { pick = e; break; } }
    const lv = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
    if (state.repel > 0 && lead && lv < lead.lv) return;
    audio.sfx('encounter');
    void this.wild(pick.sp, lv);
  }

  private async legendary(sp: string, lv: number, text: string) {
    this.mode = 'busy';
    await say(text);
    await this.battle({
      kind: 'boss', biome: this.map.biome, foeTeam: [createMon(sp, lv, { metAt: this.map.name })],
      trainerName: species(sp).name, canRun: true, canCatch: true, music: 'boss',
    });
    this.mode = 'overworld';
  }

  private async wild(sp: string, lv: number) {
    this.mode = 'busy';
    const mon = createMon(sp, lv, { metAt: this.map.name });
    await this.battle({ kind: 'wild', biome: this.map.biome, foeTeam: [mon], canRun: true, canCatch: true });
    this.mode = 'overworld';
  }

  /* ---------------- combats ---------------- */
  private async battle(cfg: BattleConfig, onLose?: () => Promise<void>): Promise<'win' | 'lose' | 'run' | 'caught'> {
    this.mode = 'battle';
    setHudVisible(false);
    await fade(true, 220);
    await fade(false, 1);
    const out = await this.battleUI.run(cfg);
    if (out.caught) {
      const where = state.party.length <= 6 ? '' : ' (envoyé au PC)';
      toast(`${nameOf(out.caught)} rejoint l’équipe${where} !`, 2200);
    }
    await fade(true, 220);
    this.mode = 'overworld';
    setHudVisible(true);
    this.playMapMusic();
    await fade(false, 240);
    if (out.result === 'lose') {
      if (onLose) await onLose();
      await this.blackout();
    }
    return out.result;
  }

  private async blackout() {
    this.mode = 'busy';
    const lost = Math.floor(state.money / 2);
    state.money -= lost;
    await say([
      'Vous n’avez plus aucune créature en état de combattre…',
      `Vous rentrez précipitamment au Centre de Soins. (−${lost} ¤)`,
    ]);
    state.healParty();
    await this.goto(`in:${state.lastCenter}:center`);
    this.mode = 'overworld';
  }

  private async trainerSight(ent: Ent & { kind: 'trainer' }) {
    const key = entKey(this.map, ent);
    if (state.flag('tr:' + key)) return;
    this.mode = 'busy';
    audio.sfx('select');
    this.overworld.approach(ent);
    await say(`${ent.cls} ${ent.name} : ${ent.taunt}`);
    await this.runTrainer(ent, key);
  }

  private async runTrainer(ent: Ent & { kind: 'trainer' }, key: string) {
    const out = await this.battle({
      kind: 'trainer', biome: this.map.biome, foeTeam: makeTeam(ent.team),
      trainerName: `${ent.cls} ${ent.name}`, money: ent.money, canRun: false, canCatch: false,
    });
    if (out === 'win') {
      state.setFlag('tr:' + key);
      this.overworld.markBeaten(ent);
      await say(`${ent.cls} ${ent.name} : ${ent.beaten}`);
      saveGame();
    }
    this.mode = 'overworld';
  }

  private async gymBattle(gymId: string) {
    const gym = GYM[gymId];
    this.mode = 'busy';
    await say(`${gym.leader} : ${gym.intro}`);
    const out = await this.battle({
      kind: 'gym', biome: 'interieur', foeTeam: makeTeam(gym.team),
      trainerName: gym.leader, money: gym.money, canRun: false, canCatch: false, music: 'arene',
    }, async () => { await say(`${gym.leader} : ${gym.lose}`); });
    if (out === 'win') {
      state.giveBadge(gymId);
      audio.sfx('badge');
      await say([`${gym.leader} : ${gym.win}`, `Vous recevez le ${gym.badge.name} ${gym.badge.icon} !`]);
      if (gym.order === 8) await say('Les 8 badges de Valmore ! La Route Victoire s’ouvre au nord de Nyxhaven.');
      if (gym.order === 16) await say('16 badges. Le Mont Cendre n’a plus de raison de vous refuser l’entrée.');
      saveGame();
    }
    this.mode = 'overworld';
  }

  private async bossBattle(bossId: string) {
    const boss = bossId === FINAL_BOSS.id ? FINAL_BOSS : LEAGUE.find((b) => b.id === bossId)!;
    this.mode = 'busy';
    await say(`${boss.name} : ${boss.intro}`);
    const isFinal = bossId === FINAL_BOSS.id;
    const out = await this.battle({
      kind: isFinal ? 'boss' : 'league', biome: isFinal ? 'neige' : 'interieur',
      foeTeam: makeTeam(boss.team), trainerName: boss.name, money: boss.money,
      canRun: false, canCatch: false, music: isFinal ? 'boss' : 'arene',
    }, async () => { await say(`${boss.name} : ${boss.lose}`); });
    if (out === 'win') {
      state.setFlag('boss_' + boss.id);
      await say(`${boss.name} : ${boss.win}`);
      if (boss.id === 'champ') await this.becomeChampion();
      if (isFinal) {
        audio.play('victoire');
        await say([
          'Le sommet du Mont Cendre est à vous.',
          'Émeric vous tend la main, sans un mot, puis redescend le sentier.',
          '— Fin du post-game. Merci d’avoir joué à PokeLike ! —',
        ]);
      }
      saveGame();
    }
    this.mode = 'overworld';
  }

  private async becomeChampion() {
    state.setFlag('champion');
    state.addItem('passeorsyn');
    audio.play('victoire');
    await say([
      `Vous êtes intronisé Maître de la Ligue de Valmore, ${state.name} !`,
      'Pr. Ombelle : Je savais que tu y arriverais. Mais l’aventure ne s’arrête pas là.',
      'Pr. Ombelle : Tiens, le Passe d’Orsyn. Un ferry part de Port-Marée vers une seconde région.',
      'Pr. Ombelle : Huit nouvelles Arènes t’y attendent… et tout au bout, le Mont Cendre.',
    ]);
    state.healParty();
    saveGame();
    await this.goto('plateau-ligue');
  }

  /* ---------------- interactions ---------------- */
  private async interact(e: Ent) {
    switch (e.kind) {
      case 'sign':
        await say(e.text);
        break;
      case 'npc':
        this.mode = 'busy';
        await say(e.lines);
        this.mode = 'overworld';
        break;
      case 'item': {
        const key = entKey(this.map, e);
        state.addItem(e.itemId);
        state.setFlag('rm:' + key);
        this.overworld.removeEnt(key);
        audio.sfx('item');
        await say(`Vous trouvez ${getItem(e.itemId).name} !`);
        break;
      }
      case 'heal': {
        this.mode = 'busy';
        const c = await ask('Infirmière : Bonjour ! Je soigne votre équipe ?', ['Oui, merci', 'Non merci']);
        if (c === 0) {
          audio.sfx('heal');
          state.healParty();
          state.lastCenter = this.map.zoneId;
          saveGame();
          await say('Infirmière : Voilà, votre équipe est en pleine forme ! Bonne route.');
        }
        this.mode = 'overworld';
        break;
      }
      case 'shop':
        this.mode = 'busy';
        openShop(e.stock, () => { this.mode = 'overworld'; });
        break;
      case 'pc':
        this.mode = 'busy';
        openPC(() => { this.mode = 'overworld'; });
        break;
      case 'trainer': {
        const key = entKey(this.map, e);
        if (state.flag('tr:' + key)) { await say(`${e.cls} ${e.name} : ${e.beaten}`); return; }
        this.mode = 'busy';
        await say(`${e.cls} ${e.name} : ${e.taunt}`);
        await this.runTrainer(e, key);
        break;
      }
      case 'leader': {
        const gym = GYM[e.gymId];
        if (state.hasBadge(e.gymId)) {
          const c = await ask(`${gym.leader} : Tu veux remettre ça ?`, ['Combattre à nouveau', 'Une autre fois']);
          if (c === 0) await this.gymBattle(e.gymId);
          return;
        }
        await this.gymBattle(e.gymId);
        break;
      }
      case 'boss': {
        if (state.flag('boss_' + e.bossId)) {
          const boss = e.bossId === FINAL_BOSS.id ? FINAL_BOSS : LEAGUE.find((b) => b.id === e.bossId)!;
          const c = await ask(`${boss.name} : Encore un combat ?`, ['Oui', 'Non']);
          if (c === 0) await this.bossBattle(e.bossId);
          return;
        }
        await this.bossBattle(e.bossId);
        break;
      }
    }
  }

  /** Aides de débogage exposées sur window.pokelike. */
  debugParty(): string[] {
    return state.party.map((m) => `${nameOf(m)} N.${m.lv} ${m.hp}/${maxHp(m)}`);
  }
  debugWild(sp: string, lv: number) { void this.wild(sp, lv); }
  /** Démarrage express (tests) : saute l'intro. */
  async newGameQuick(name: string, starter: string) {
    $('#title').hidden = true;
    state.reset(name);
    state.giveStarter(starter);
    setHudVisible(true);
    await this.goto(START_ZONE, { silent: true });
  }
  debugGoto(id: string) { void this.goto(id); }
  debugGym(id: string) { void this.gymBattle(id); }
  debugGive(sp: string, lv: number) { state.addMon(createMon(sp, lv, { metAt: 'Test' })); }
  debugGiveLead(sp: string, lv: number) { state.party.unshift(createMon(sp, lv, { metAt: 'Test' })); state.party.length = Math.min(state.party.length, 6); }
  debugBadges(): string[] { return state.badges; }
  debugGiveBadge(id: string) { state.giveBadge(id); }
  debugSave() { saveGame(); }
  debugAllMapIds(): string[] {
    const ids: string[] = [];
    for (const z of Object.values(ZONE)) {
      ids.push(z.id);
      if (z.center) ids.push(`in:${z.id}:center`);
      if (z.shop) ids.push(`in:${z.id}:shop`);
      (z.houses ?? []).forEach((_, i) => ids.push(`in:${z.id}:house${i}`));
    }
    for (const g of GYMS) ids.push(`gym:${g.id}`);
    for (let i = 0; i < LEAGUE.length; i++) ids.push(`league:${i}`);
    return ids;
  }
  /** Déclenche l'interaction avec la première entité du type demandé. */
  debugInteract(kind: string): boolean {
    const e = this.map.ents.find((x) => x.kind === kind);
    if (!e) return false;
    void this.interact(e);
    return true;
  }
  debugMode() { return this.mode; }
  /** Vérifie que toutes les espèces citées par les données du monde existent. */
  debugValidate(): string[] {
    const bad: string[] = [];
    const check = (id: string, where: string) => { if (!hasSpecies(id)) bad.push(`${where}: ${id}`); };
    for (const z of Object.values(ZONE)) for (const en of z.enc ?? []) check(en.sp, z.id);
    for (const g of GYMS) for (const [sp] of g.team) check(sp, g.id);
    for (const b of [...LEAGUE, FINAL_BOSS]) for (const [sp] of b.team) check(sp, b.id);
    for (const st of STATIC_ENCOUNTERS) check(st.sp, st.flag);
    for (const r of RIVAL_EVENTS) for (const sp of r.extras) check(sp, r.flag);
    for (const sp of Object.values(RIVAL_COUNTER)) check(sp, 'rival-starter');
    for (const s of DEX) {
      if (s.evo) check(s.evo.to, `evo:${s.id}`);
      for (const a of s.evoAlt ?? []) check(a, `evoAlt:${s.id}`);
    }
    return bad;
  }
  debugDexCount() { return DEX.length; }
  debugSeeAll() { for (const s of DEX) { state.seen.add(s.id); if (s.dex % 3 === 0) state.caught.add(s.id); } }
  debugQuality(q: 'haut' | 'leger') { state.quality = q; this.applyQuality(); }
  debugStyle(st: 'ds' | 'lisse') { state.style = st; this.applyQuality(); }
  debugCreatures(m: 'sprites' | '3d') { state.creatures = m; this.applyQuality(); }
  debugSpriteSource() { return { foe: this.battleScene.spriteSource('foe'), mine: this.battleScene.spriteSource('mine') }; }
  /**
   * Où se retrouve, à l'écran, le haut de l'image d'un pack. Le repère cherché est
   * le pixel très clair que le pack de test dessine en haut de la planche : s'il
   * ressort en bas, la texture est retournée. Vérifie le résultat final, pas la
   * façon dont on y arrive (retournement fait par nous ou par WebGL).
   */
  debugPackOrientation(who: 'mine' | 'foe' = 'foe'): string {
    const tex = this.battleScene.spriteTexture(who);
    if (!tex || tex.userData.src !== 'pack') return 'aucun pack';
    const img = tex.image as ImageBitmap | undefined;
    if (!img?.width) return 'image absente';
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'canvas indisponible';
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    let somme = 0, n = 0;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (d[i + 3] > 200 && d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230) { somme += y; n++; }
      }
    }
    if (!n) return 'repère absent';
    // Sans retournement par WebGL, la ligne 0 de l'image se retrouve en bas du panneau.
    const hautEcran = tex.flipY ? somme / n < img.height / 2 : somme / n > img.height / 2;
    return hautEcran ? 'haut' : 'bas';
  }
  debugShadows() { return this.renderer.gl.shadowMap.enabled; }
  debugPerf() {
    const i = this.renderer.gl.info;
    return { draws: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures };
  }
  /** Tente la sortie vers une zone donnée (test du verrouillage par badge). */
  debugTryExit(to: string): boolean {
    const e = this.map.ents.find((x) => x.kind === 'exit' && x.to === to);
    if (!e) return false;
    this.overworld.place(e.x, e.y);
    void this.onExit(to, e);
    return true;
  }
  debugBuildMap(id: string) {
    const m = getMap(id);
    return { w: m.w, h: m.h, ents: m.ents.length };
  }

  /* ---------------- boucle ---------------- */
  private loop(now: number) {
    try { this.step(now); }
    catch (err) { console.error('Erreur dans la boucle de jeu', err); }
    requestAnimationFrame((t) => this.loop(t));
  }

  private step(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    if (this.mode !== 'title') state.playTime += dt;

    if ((this.mode === 'overworld' || this.mode === 'busy') && this.overworld.loaded) {
      const blocked = ui.dialogueOpen || ui.overlayOpen || this.mode === 'busy';
      this.overworld.paused = blocked;
      const dir = blocked ? { x: 0, y: 0 } : this.input.dir();
      this.overworld.update(dt, dir, this.input.running(), this.renderer.camera);
      this.renderer.render(this.overworld.scene);

      if (this.input.justPressed('a')) {
        if (ui.dialogueOpen) advanceDialogue();
        else if (!blocked) {
          const front = this.overworld.front();
          if (front) { audio.sfx('select'); void this.interact(front); }
        }
      }
      if (this.input.justPressed('menu') && !blocked) {
        audio.sfx('select');
        this.mode = 'busy';
        openMainMenu(() => { this.mode = 'overworld'; });
      }
      if (this.input.justPressed('b') && ui.dialogueOpen) advanceDialogue();
    } else if (this.mode === 'battle') {
      this.battleScene.update(dt, this.renderer.camera);
      this.renderer.render(this.battleScene.scene);
    } else {
      this.renderer.render(this.overworld.scene);
    }
  }
}

/* ------------------------------------------------------------------ */
const game = new Game();
// Exposé pour le débogage et les tests automatisés.
(window as unknown as { pokelike: Game }).pokelike = game;

// Déverrouillage audio au premier contact (politique navigateurs).
const unlock = () => { audio.unlock(); removeEventListener('pointerdown', unlock); };
addEventListener('pointerdown', unlock);

// Sauvegarde automatique quand l'appli passe en arrière-plan.
addEventListener('visibilitychange', () => { if (document.hidden && state.party.length) saveGame(); });
addEventListener('pagehide', () => { if (state.party.length) saveGame(); });

// Évite le zoom double-tap sur iOS.
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

void fmtTime; void openParty; void RNG; void THREE;
