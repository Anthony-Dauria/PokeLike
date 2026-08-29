import * as THREE from 'three';
import { addOutline, animateRig, buildCreature, buildHuman, type CreatureRig } from '../creature/model';
import { CreatureSprites, type Facing } from '../creature/sprites';
import type { Species } from '../data/species';
import { addLights, addSky, disposeObject, disposeScene, DS_SHORT, toonGradient, uTime, windify } from '../engine/renderer';
import { spOf, type Mon } from '../game/mon';
import { TYPE_COLOR } from '../data/types';
import { RNG } from '../engine/rng';

interface Arena {
  skyTop: number; skyMid: number; skyLow: number;
  ground: number; platform: number; platformTop: number;
  scatter: number; scatter2: number;
  décor: 'arbre' | 'roche' | 'cactus' | 'cristal' | 'sapin';
  grass?: number;
  fog: number;
  /** Couleur d'ambiance quand le ciel ne peut pas servir de source (intérieurs, grottes). */
  light?: number;
}

const ARENA: Record<string, Arena> = {
  plaine: { skyTop: 0x3f8fd8, skyMid: 0x9ed6ff, skyLow: 0xdaf1ff, ground: 0x5ea951, platform: 0x4f9a48, platformTop: 0x6bb85c, scatter: 0x2f8140, scatter2: 0x3f9a4c, décor: 'arbre', grass: 0x49a043, fog: 0xd6eefb },
  foret: { skyTop: 0x3f86c4, skyMid: 0x94c8e6, skyLow: 0xd8ecdc, ground: 0x3f8f47, platform: 0x347b3d, platformTop: 0x4a9c52, scatter: 0x1f6234, scatter2: 0x2b7a3e, décor: 'arbre', grass: 0x39883c, fog: 0xb6d8c4 },
  montagne: { skyTop: 0x5b9bd0, skyMid: 0xaacce4, skyLow: 0xe2ecf4, ground: 0x8d947c, platform: 0x7c8570, platformTop: 0x9aa189, scatter: 0x7b7c72, scatter2: 0x8b8c82, décor: 'roche', grass: 0x7f9663, fog: 0xd2dde6 },
  plage: { skyTop: 0x3fa5e8, skyMid: 0x9fe0ff, skyLow: 0xe8faff, ground: 0xe6d7a6, platform: 0xd9c894, platformTop: 0xefe0b0, scatter: 0x3f9a55, scatter2: 0x4fae62, décor: 'arbre', grass: 0x9fc86f, fog: 0xdff3fb },
  desert: { skyTop: 0x7fb6e0, skyMid: 0xffdda8, skyLow: 0xffeed2, ground: 0xe4c67e, platform: 0xd7b76e, platformTop: 0xeed291, scatter: 0x4f8f4a, scatter2: 0x5c9d55, décor: 'cactus', fog: 0xf3ddb0 },
  neige: { skyTop: 0x7fa8cc, skyMid: 0xd2e6f8, skyLow: 0xf6fbff, ground: 0xeaf1f9, platform: 0xdde7f2, platformTop: 0xf4f9ff, scatter: 0x27563f, scatter2: 0x2f6449, décor: 'sapin', fog: 0xeef5fd },
  sommet: { skyTop: 0x2f5f96, skyMid: 0x9dc4e8, skyLow: 0xecf5fc, ground: 0xe9f0f8, platform: 0xd8e3ef, platformTop: 0xf2f8ff, scatter: 0x8b96a6, scatter2: 0x99a3b2, décor: 'roche', fog: 0xe2eef8 },
  volcan: { skyTop: 0x6a2f42, skyMid: 0xdd6f4c, skyLow: 0xffc79a, ground: 0x6f4c44, platform: 0x5d4039, platformTop: 0x7d564c, scatter: 0x4a3532, scatter2: 0x59403c, décor: 'roche', fog: 0xd88a5f },
  marais: { skyTop: 0x53706c, skyMid: 0x8fa79f, skyLow: 0xc8d6cb, ground: 0x536f4d, platform: 0x466040, platformTop: 0x5f7a57, scatter: 0x3a5a3a, scatter2: 0x466846, décor: 'arbre', grass: 0x527a49, fog: 0x9db3a6 },
  ville: { skyTop: 0x3f8fd8, skyMid: 0x9ed6ff, skyLow: 0xdef3ff, ground: 0x79ab60, platform: 0x679a53, platformTop: 0x86b96c, scatter: 0x2f8140, scatter2: 0x3f9a4c, décor: 'arbre', grass: 0x59a04d, fog: 0xd8effc },
  grotte: { skyTop: 0x0c0e15, skyMid: 0x151926, skyLow: 0x2a3145, ground: 0x5d5c6b, platform: 0x514f5e, platformTop: 0x6a6879, scatter: 0x7d78a0, scatter2: 0x9089bb, décor: 'cristal', fog: 0x262c3c, light: 0xbccbe0 },
  interieur: { skyTop: 0x232a3c, skyMid: 0x323a52, skyLow: 0x4d566f, ground: 0xa1815f, platform: 0x8d7050, platformTop: 0xbe9a70, scatter: 0x6b5240, scatter2: 0x7d6250, décor: 'roche', fog: 0x3a4157, light: 0xffe9c8 },
};

const TMP = new THREE.Vector3();

/**
 * Agrandissement des sprites de pack. À l'échelle exacte (un texel = un pixel du
 * rendu interne) les créatures sont justes entre elles mais perdues sur les
 * plateformes : le cadrage du jeu montre bien plus de décor que l'écran 256×192
 * de la console. Ce facteur rend à une planche de 96 px la place qu'elle occupait
 * sur la DS. Choisi entier et demi pour garder des pixels réguliers.
 */
const SPRITE_ZOOM = 1.5;

/** Sprite de pack dont la taille suit la définition du rendu, pas le modèle 3D. */
interface PackFit {
  mesh: THREE.Mesh;
  /** Hauteur du sujet en pixels, ramenée à une planche de 96 px. */
  px: number;
  aspect: number;
  who: 'mine' | 'foe';
  /** Hauteur du modèle 3D, utilisée tant que la caméra n'a pas servi. */
  fallback: number;
}

export class BattleScene {
  scene = new THREE.Scene();
  private mineRig: CreatureRig | null = null;
  private foeRig: CreatureRig | null = null;
  private mineShadow: THREE.Mesh | null = null;
  private foeShadow: THREE.Mesh | null = null;
  /** Sprites de pack en attente de mise à l'échelle « un texel = un pixel DS ». */
  private fits: PackFit[] = [];
  /** Unités monde par pixel DS, à la profondeur de chaque plateforme. */
  private wpp = { mine: 0, foe: 0 };
  private minePos = new THREE.Vector3(-0.35, 0, 0.3);
  private foePos = new THREE.Vector3(1.5, 0, -3.4);
  private t = 0;
  private fx: { obj: THREE.Object3D; life: number; max: number; vy: number; spin: number; grow?: number }[] = [];
  private shake = 0;
  private trainer: CreatureRig | null = null;
  private sprites: CreatureSprites | null = null;
  shadows = true;
  /** « sprites » = billboards cuits façon DS ; « 3d » = modèles affichés tels quels. */
  mode: 'sprites' | '3d' = 'sprites';

  constructor(gl?: THREE.WebGLRenderer) {
    if (gl) this.sprites = new CreatureSprites(gl);
  }

  /**
   * Construit le combattant : sprite plat (cuit depuis le modèle, ou image du pack
   * déposé par le joueur) ou modèle 3D selon le réglage.
   */
  private makeCreature(sp: Species, shiny: boolean, facing: Facing, who: 'mine' | 'foe'): CreatureRig {
    if (this.mode === '3d' || !this.sprites) {
      const rig = buildCreature(sp, shiny);
      addOutline(rig, .05);
      return rig;
    }
    const { tex, side, height } = this.sprites.sprite(sp, facing, shiny);
    const geo = new THREE.PlaneGeometry(side, side);
    geo.translate(0, side / 2, 0);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: .5, side: THREE.DoubleSide, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    group.add(mesh);
    // Si le joueur a fourni une image pour cette espèce, elle remplace la cuisson.
    void this.sprites.pack(sp, facing).then((p) => {
      if (!p || mat.map === p.tex) return;
      mat.map = p.tex;
      // Les packs ont souvent un liseré semi-transparent : un seuil plus bas le garde.
      mat.alphaTest = .2;
      mat.needsUpdate = true;
      // Panneau unitaire posé au sol : `fit()` lui donne ensuite sa taille réelle,
      // calculée pour qu'un pixel du sprite couvre un pixel du rendu interne.
      const plan = new THREE.PlaneGeometry(p.aspect, 1);
      plan.translate(0, .5, 0);
      mesh.geometry.dispose();
      mesh.geometry = plan;
      const fit: PackFit = { mesh, px: p.px, aspect: p.aspect, who, fallback: height };
      this.fits = this.fits.filter((f) => f.who !== who);
      this.fits.push(fit);
      this.fit(fit);
    });
    return { group, bob: [mesh], limbs: [], height: side };
  }

  private toon(c: number | string, o: THREE.MeshToonMaterialParameters = {}) {
    return new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient(), ...o });
  }

  build(biome: string, foe: Mon, mine: Mon | null, foeIsTrainer: boolean) {
    const a = ARENA[biome] ?? ARENA.plaine;
    disposeScene(this.scene);
    this.scene = new THREE.Scene();
    this.mineRig = null; this.foeRig = null; this.trainer = null;
    this.fits = [];
    this.mineShadow = null; this.foeShadow = null;
    this.fx = [];

    this.scene.fog = new THREE.Fog(a.fog, 18, 52);
    addSky(this.scene, a.skyTop, a.skyMid, a.skyLow, biome === 'grotte' || biome === 'interieur' ? .1 : .55);
    addLights(this.scene, a.light ?? a.skyMid, a.ground, biome === 'volcan' ? 0xffd9b0 : 0xfff6e0, this.shadows);

    const rng = new RNG(0x51e3 + biome.length * 977);

    /* --- sol --- */
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 40), this.toon(a.ground));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // relief léger autour de l'arène
    const bumps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), this.toon(a.platform), 26);
    const d = new THREE.Object3D();
    for (let i = 0; i < 26; i++) {
      const ang = rng.next() * Math.PI * 2;
      const r = 8 + rng.next() * 16;
      d.position.set(Math.cos(ang) * r, -.6 - rng.next() * .5, Math.sin(ang) * r - 2);
      const s = 2 + rng.next() * 4;
      d.scale.set(s, s * (.35 + rng.next() * .3), s);
      d.rotation.set(0, rng.next() * 6, 0);
      d.updateMatrix(); bumps.setMatrixAt(i, d.matrix);
    }
    bumps.instanceMatrix.needsUpdate = true;
    bumps.receiveShadow = true;
    this.scene.add(bumps);

    /* --- plateformes --- */
    for (const [p, r] of [[this.foePos, 1.45], [this.minePos, 1.65]] as [THREE.Vector3, number][]) {
      const side = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, .38, 26), this.toon(a.platform));
      side.position.set(p.x, .17, p.z);
      side.receiveShadow = true; side.castShadow = true;
      this.scene.add(side);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r * .99, r * .99, .06, 26), this.toon(a.platformTop));
      top.position.set(p.x, .37, p.z);
      top.receiveShadow = true;
      this.scene.add(top);
      // touffes d'herbe sur le rebord
      if (a.grass) {
        const blade = new THREE.ConeGeometry(.09, .4, 4);
        blade.translate(0, .2, 0);
        const gm = this.toon(a.grass);
        windify(gm, .08, 2.1);
        const tufts = new THREE.InstancedMesh(blade, gm, 16);
        for (let i = 0; i < 16; i++) {
          const ang = rng.next() * Math.PI * 2;
          const rr = r * (.55 + rng.next() * .34);
          d.position.set(p.x + Math.cos(ang) * rr, .38, p.z + Math.sin(ang) * rr);
          d.rotation.set(0, rng.next() * 6, 0);
          const s = .5 + rng.next() * .5;
          d.scale.set(s, s, s);
          d.updateMatrix(); tufts.setMatrixAt(i, d.matrix);
        }
        tufts.instanceMatrix.needsUpdate = true;
        this.scene.add(tufts);
      }
    }

    /* --- décor de fond, deux profondeurs --- */
    this.buildScatter(a, rng);

    this.setFoe(foe, foeIsTrainer);
    if (mine) this.setMine(mine);
  }

  private buildScatter(a: Arena, rng: RNG) {
    const d = new THREE.Object3D();
    const place = (im: THREE.InstancedMesh, count: number, rMin: number, rMax: number, sMin: number, sMax: number, yOff = 0) => {
      for (let i = 0; i < count; i++) {
        const ang = rng.next() * Math.PI * 2;
        const r = rMin + rng.next() * (rMax - rMin);
        const s = sMin + rng.next() * (sMax - sMin);
        d.position.set(Math.cos(ang) * r, yOff * s, Math.sin(ang) * r - 4);
        d.rotation.set(0, rng.next() * 6, 0);
        d.scale.set(s, s * (.85 + rng.next() * .45), s);
        d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = true; im.receiveShadow = true;
      this.scene.add(im);
    };

    if (a.décor === 'arbre' || a.décor === 'sapin') {
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .28, 1.8, 7), this.toon(0x5b4028), 22);
      const crownMat = this.toon(a.scatter);
      windify(crownMat, .03, 1.0);
      const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.35, 2.6, 8), crownMat, 44);
      const dd = new THREE.Object3D();
      for (let i = 0; i < 22; i++) {
        const ang = rng.next() * Math.PI * 2;
        const r = 11 + rng.next() * 15;
        const s = .9 + rng.next() * .8;
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r - 4;
        dd.position.set(x, .9 * s, z); dd.scale.set(s, s, s); dd.rotation.set(0, rng.next() * 6, 0);
        dd.updateMatrix(); trunk.setMatrixAt(i, dd.matrix);
        for (let k = 0; k < 2; k++) {
          const ks = s * (1 - k * .25);
          dd.position.set(x, (2.1 + k * 1.15) * s, z); dd.scale.set(ks, ks, ks);
          dd.updateMatrix(); crown.setMatrixAt(i * 2 + k, dd.matrix);
        }
      }
      trunk.instanceMatrix.needsUpdate = true; crown.instanceMatrix.needsUpdate = true;
      trunk.castShadow = true; crown.castShadow = true;
      this.scene.add(trunk, crown);
      if (a.décor === 'sapin') {
        const snow = new THREE.InstancedMesh(new THREE.ConeGeometry(1.05, 1.2, 8), this.toon(0xf2f8ff), 22);
        place(snow, 22, 11, 26, .9, 1.7, 2.6);
      }
    } else if (a.décor === 'cactus') {
      const im = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.34, 1.8, 4, 10), this.toon(a.scatter), 16);
      place(im, 16, 10, 24, .9, 1.6, 1.3);
    } else if (a.décor === 'cristal') {
      const im = new THREE.InstancedMesh(new THREE.ConeGeometry(.8, 3.2, 5), this.toon(a.scatter2), 22);
      place(im, 22, 8, 24, .7, 1.8, 1.6);
      const glow = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.4, 0),
        new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: .7 }), 22);
      place(glow, 22, 8, 24, .7, 1.4, 3.4);
    } else {
      const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.15, 0), this.toon(a.scatter), 24);
      place(im, 24, 9, 25, .8, 2.2, .5);
      const im2 = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.6, 0), this.toon(a.scatter2), 18);
      place(im2, 18, 6, 22, .6, 1.4, .3);
    }
  }

  private contactShadow(): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({ color: 0x0a1020, transparent: true, opacity: .3, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    return m;
  }

  setFoe(foe: Mon, isTrainer: boolean) {
    if (this.foeRig) { this.scene.remove(this.foeRig.group); disposeObject(this.foeRig.group); }
    this.fits = this.fits.filter((f) => f.who !== 'foe');
    const sp = spOf(foe);
    this.foeRig = this.makeCreature(sp, foe.shiny, 'front', 'foe');
    this.foeRig.group.scale.multiplyScalar(battleZoom(sp.scale));
    this.foeRig.group.position.copy(this.foePos);
    this.foeRig.group.position.y = .4;
    this.foeRig.group.rotation.y = -.35;
    this.scene.add(this.foeRig.group);
    if (!this.foeShadow) this.foeShadow = this.contactShadow();
    this.foeShadow.scale.setScalar(.75 * sp.scale * battleZoom(sp.scale));
    this.foeShadow.position.set(this.foePos.x, .41, this.foePos.z);
    this.foeShadow.visible = true;
    if (isTrainer && !this.trainer) {
      this.trainer = buildHuman(0x8a4a9a, 0xe8c9a0, 0x2a1a12);
      this.trainer.group.scale.multiplyScalar(1.5);
      this.trainer.group.position.set(this.foePos.x + .8, 0, this.foePos.z - 3.1);
      this.trainer.group.rotation.y = Math.PI - .25;
      this.scene.add(this.trainer.group);
    }
    this.pop(this.foeRig);
  }

  setMine(mine: Mon) {
    if (this.mineRig) { this.scene.remove(this.mineRig.group); disposeObject(this.mineRig.group); }
    this.fits = this.fits.filter((f) => f.who !== 'mine');
    const sp = spOf(mine);
    this.mineRig = this.makeCreature(sp, mine.shiny, 'back', 'mine');
    this.mineRig.group.scale.multiplyScalar(battleZoom(sp.scale));
    this.mineRig.group.position.copy(this.minePos);
    this.mineRig.group.position.y = .4;
    this.mineRig.group.rotation.y = this.mode === 'sprites' ? 0 : Math.PI + .62;
    this.scene.add(this.mineRig.group);
    if (!this.mineShadow) this.mineShadow = this.contactShadow();
    this.mineShadow.scale.setScalar(.8 * sp.scale * battleZoom(sp.scale));
    this.mineShadow.position.set(this.minePos.x, .41, this.minePos.z);
    this.mineShadow.visible = true;
    this.pop(this.mineRig);
  }

  private rig(who: 'mine' | 'foe') { return who === 'mine' ? this.mineRig : this.foeRig; }

  private pop(rig: CreatureRig) {
    rig.group.userData.baseScale = rig.group.scale.x || 1;
    rig.group.userData.pop = 0;
    rig.group.scale.setScalar(0.01);
  }

  /** Joue un effet visuel court. Retourne la durée en ms. */
  play(who: 'mine' | 'foe', kind: string, type?: string): number {
    const rig = this.rig(who);
    if (!rig) return 0;
    const g = rig.group;
    const col = type ? new THREE.Color(TYPE_COLOR[type as keyof typeof TYPE_COLOR] ?? '#ffffff').getHex() : 0xffdd66;
    switch (kind) {
      case 'attack':
        g.userData.lunge = 1;
        return 320;
      case 'hurt':
        g.userData.hurt = 1;
        this.shake = .4;
        this.burst(g.position, col, 16);
        this.ring(g.position, col);
        return 280;
      case 'faint':
        g.userData.faint = 1;
        if (who === 'mine' && this.mineShadow) this.mineShadow.visible = false;
        if (who === 'foe' && this.foeShadow) this.foeShadow.visible = false;
        return 520;
      case 'send':
        this.pop(rig);
        this.ring(g.position, 0xffffff);
        return 340;
      case 'status':
        this.spiral(g.position, 0xb07fff);
        return 320;
      case 'boost':
        this.spiral(g.position, 0x7fe0a0, true);
        return 320;
      case 'ball': {
        const ball = new THREE.Group();
        ball.add(new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.toon(0xe8434e)));
        ball.add(new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.toon(0xf2f5fa)));
        ball.add(new THREE.Mesh(new THREE.CylinderGeometry(.305, .305, .07, 12), this.toon(0x1b2130)));
        ball.position.copy(this.minePos).setY(1.4);
        this.scene.add(ball);
        ball.userData.arc = { from: ball.position.clone(), to: this.foePos.clone().setY(1), t: 0 };
        this.fx.push({ obj: ball, life: .72, max: .72, vy: 0, spin: 9 });
        return 700;
      }
      case 'catch':
        if (this.foeRig) this.foeRig.group.userData.faint = 1;
        if (this.foeShadow) this.foeShadow.visible = false;
        this.burst(this.foePos.clone().setY(1.1), 0xffe08a, 26, 1.3);
        this.ring(this.foePos.clone().setY(.5), 0xffe08a);
        return 700;
      case 'flee':
        g.userData.flee = 1;
        if (who === 'mine' && this.mineShadow) this.mineShadow.visible = false;
        return 400;
    }
    return 0;
  }

  private burst(at: THREE.Vector3, color: number, n: number, up = 1) {
    const geo = new THREE.TetrahedronGeometry(.15, 0);
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      p.position.copy(at).add(new THREE.Vector3((Math.random() - .5) * 1.7, .9 + Math.random() * .9, (Math.random() - .5) * 1.7));
      p.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.scene.add(p);
      this.fx.push({ obj: p, life: .5, max: .5, vy: (1.1 + Math.random() * 2.2) * up, spin: 6 });
    }
  }

  /** Onde de choc plaquée au sol. */
  private ring(at: THREE.Vector3, color: number) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(.5, .72, 26),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(at.x, .44, at.z);
    this.scene.add(m);
    this.fx.push({ obj: m, life: .45, max: .45, vy: 0, spin: 0, grow: 5 });
  }

  /** Colonne de particules montantes (statut / bonus). */
  private spiral(at: THREE.Vector3, color: number, up = false) {
    const geo = new THREE.OctahedronGeometry(.13, 0);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 4;
      const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9 }));
      p.position.set(at.x + Math.cos(a) * .7, .4 + (up ? 0 : 1.6) + i * .07, at.z + Math.sin(a) * .7);
      this.scene.add(p);
      this.fx.push({ obj: p, life: .6, max: .6, vy: up ? 2.4 : -1.4, spin: 5 });
    }
  }

  /**
   * Unités monde couvertes par un pixel du rendu interne, à la profondeur de la
   * plateforme visée. C'est ce qui permet d'afficher un sprite à sa taille
   * native : un texel pour un pixel, comme sur la console.
   */
  private density(cam: THREE.PerspectiveCamera, at: THREE.Vector3) {
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const depth = Math.max(.5, TMP.subVectors(at, cam.position).dot(dir));
    const visH = 2 * depth * Math.tan((cam.fov * Math.PI) / 360);
    // Le côté court du rendu interne fait DS_SHORT pixels, comme dans Renderer.
    return (cam.aspect < 1 ? visH * cam.aspect : visH) / DS_SHORT;
  }

  /**
   * Donne au panneau sa taille définitive. Le groupe porte déjà le zoom de combat :
   * on le divise, sinon une grosse espèce compterait sa taille deux fois — une fois
   * par les pixels de son sprite, une fois par le zoom.
   */
  private fit(f: PackFit) {
    const wpp = this.wpp[f.who];
    const h = wpp > 0 ? f.px * wpp * SPRITE_ZOOM : f.fallback;
    const rig = this.rig(f.who);
    const base = (rig?.group.userData.baseScale as number) || rig?.group.scale.x || 1;
    f.mesh.scale.setScalar(h / base);
    // L'ombre n'est pas fille du groupe : elle se règle en unités monde.
    const shadow = f.who === 'mine' ? this.mineShadow : this.foeShadow;
    if (shadow) shadow.scale.setScalar(Math.max(.35, h * f.aspect * .46));
  }

  update(dt: number, cam: THREE.PerspectiveCamera) {
    this.t += dt;
    uTime.value = this.t;

    for (const rig of [this.mineRig, this.foeRig]) {
      if (!rig) continue;
      const g = rig.group;
      const sp = (g.userData.baseScale ??= g.scale.x || 1);
      if (g.userData.pop !== undefined) {
        g.userData.pop = Math.min(1, (g.userData.pop as number) + dt * 4);
        const k = g.userData.pop as number;
        g.scale.setScalar(sp * k * (1 + Math.sin(k * Math.PI) * .25));
        if (k >= 1) { g.scale.setScalar(sp); delete g.userData.pop; }
      }
      animateRig(rig, this.t);
      const home = rig === this.mineRig ? this.minePos : this.foePos;
      const shadow = rig === this.mineRig ? this.mineShadow : this.foeShadow;
      let ox = 0, oy = .4, oz = 0;
      if (g.userData.lunge !== undefined) {
        const k = (g.userData.lunge as number) - dt * 3.2;
        g.userData.lunge = k;
        const s = Math.sin(Math.max(0, 1 - k) * Math.PI);
        const dirx = rig === this.mineRig ? 1 : -1;
        ox = dirx * s * 1.5; oz = -dirx * s * .9;
        oy += s * .18;
        if (k <= 0) delete g.userData.lunge;
      }
      if (g.userData.hurt !== undefined) {
        const k = (g.userData.hurt as number) - dt * 4;
        g.userData.hurt = k;
        ox += Math.sin(k * 42) * .2;
        g.visible = Math.sin(k * 30) > -.5;
        if (k <= 0) { delete g.userData.hurt; g.visible = true; }
      }
      if (g.userData.faint !== undefined) {
        const k = (g.userData.faint as number) - dt * 2;
        g.userData.faint = k;
        oy = .4 - (1 - Math.max(0, k)) * 2.4;
        g.rotation.z = (1 - Math.max(0, k)) * 1.3;
        if (k <= 0) { g.visible = false; delete g.userData.faint; }
      }
      if (g.userData.flee !== undefined) {
        const k = (g.userData.flee as number) - dt * 2.5;
        g.userData.flee = k;
        oz += (1 - Math.max(0, k)) * 8;
        if (k <= 0) { g.visible = false; delete g.userData.flee; }
      }
      g.position.set(home.x + ox, oy, home.z + oz);
      if (shadow?.visible) {
        shadow.position.set(home.x + ox * .6, .41, home.z + oz * .6);
        const lift = Math.max(0, oy - .4);
        (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(.08, .3 - lift * .3);
      }
    }
    if (this.trainer) animateRig(this.trainer, this.t);

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const p = this.fx[i];
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      const arc = p.obj.userData.arc as { from: THREE.Vector3; to: THREE.Vector3; t: number } | undefined;
      if (arc) {
        arc.t = Math.min(1, arc.t + dt / .65);
        p.obj.position.lerpVectors(arc.from, arc.to, arc.t);
        p.obj.position.y += Math.sin(arc.t * Math.PI) * 2.6;
        p.obj.rotation.x += p.spin * dt;
      } else if (p.grow) {
        p.obj.scale.setScalar(1 + (1 - k) * p.grow);
        (p.obj as THREE.Mesh & { material: THREE.MeshBasicMaterial }).material.opacity = k * .85;
      } else {
        p.obj.position.y += p.vy * dt;
        p.obj.rotation.x += p.spin * dt;
        p.obj.rotation.y += p.spin * .7 * dt;
        p.obj.scale.setScalar(Math.max(.01, k));
      }
      if (p.life <= 0) { this.scene.remove(p.obj); disposeObject(p.obj); this.fx.splice(i, 1); }
    }

    this.shake = Math.max(0, this.shake - dt * 1.7);
    const sx = (Math.random() - .5) * this.shake, sy = (Math.random() - .5) * this.shake;
    // Cadrage adapté à l'orientation de l'écran.
    if (cam.aspect > 1) {
      cam.position.set(sx, 5.2 + sy, 8.2);
      cam.lookAt(0.2, 0.6, -1.8);
    } else {
      cam.position.set(sx, 5.6 + sy, 9.0);
      cam.lookAt(0.2, 1.6, -1.8);
    }

    // Après le cadrage, la caméra est à jour : on peut mesurer la densité. Elle ne
    // bouge qu'au redimensionnement de la fenêtre, donc le recalcul est rare.
    for (const who of ['mine', 'foe'] as const) {
      const d = this.density(cam, who === 'mine' ? this.minePos : this.foePos);
      if (Math.abs(d - this.wpp[who]) < 1e-5) continue;
      this.wpp[who] = d;
      for (const f of this.fits) if (f.who === who) this.fit(f);
    }
  }

  /** Texture affichée pour un combattant, quelle qu'en soit l'origine. */
  spriteTexture(who: 'mine' | 'foe'): THREE.Texture | null {
    const rig = who === 'mine' ? this.mineRig : this.foeRig;
    const mesh = rig?.group.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
    return (mesh?.material as THREE.MeshBasicMaterial | undefined)?.map ?? null;
  }

  /** D'où vient la texture affichée : pack du joueur ou cuisson du modèle. */
  spriteSource(who: 'mine' | 'foe'): string {
    return (this.spriteTexture(who)?.userData.src as string) ?? '3d';
  }

  hideFoe() { if (this.foeRig) this.foeRig.group.visible = false; }
  showAll() {
    if (this.foeRig) this.foeRig.group.visible = true;
    if (this.mineRig) this.mineRig.group.visible = true;
  }
}

/** Agrandissement en combat : compressé pour que les colosses ne débordent pas. */
function battleZoom(scale: number): number {
  return 1.95 / Math.sqrt(Math.max(.5, scale) / 0.8);
}
