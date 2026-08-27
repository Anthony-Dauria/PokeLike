import * as THREE from 'three';
import { buildCreature, animateRig, buildHuman, type CreatureRig } from '../creature/model';
import { addLights, disposeObject, disposeScene } from '../engine/renderer';
import { spOf, type Mon } from '../game/mon';
import { TYPE_COLOR } from '../data/types';

/** Agrandissement en combat : compressé pour que les colosses ne débordent pas. */
function battleZoom(scale: number): number {
  return 1.95 / Math.sqrt(Math.max(.5, scale) / 0.8);
}

const BG: Record<string, [number, number, number]> = {
  plaine: [0x9ed2ff, 0x5fa851, 0x4f8f45],
  foret: [0x8fc7e8, 0x3f8f47, 0x2f7a3c],
  montagne: [0xa9c8e0, 0x8a9078, 0x77786e],
  plage: [0x8ed8ff, 0xe3d3a0, 0xd8c48a],
  desert: [0xffd9a0, 0xe0c07a, 0xcaa860],
  neige: [0xdfeeff, 0xe6eef7, 0xc9d6e4],
  sommet: [0xcfe4ff, 0xe6eef7, 0xc9d6e4],
  volcan: [0xffa070, 0x6b4b45, 0x3f2e2c],
  marais: [0x8fa8a0, 0x4f6b4a, 0x3f5a4a],
  ville: [0x9ed2ff, 0x77a75f, 0xcfc3aa],
  grotte: [0x1a1c26, 0x53525f, 0x3a3945],
  interieur: [0x2a2f3a, 0x9a7f68, 0x8b6b52],
};

export class BattleScene {
  scene = new THREE.Scene();
  private mineRig: CreatureRig | null = null;
  private foeRig: CreatureRig | null = null;
  private minePos = new THREE.Vector3(-0.7, 0, 1.2);
  private foePos = new THREE.Vector3(1.5, 0, -3.4);
  private t = 0;
  private fx: { obj: THREE.Object3D; life: number; max: number; vy: number; spin: number }[] = [];
  private shake = 0;
  private trainer: CreatureRig | null = null;

  build(biome: string, foe: Mon, mine: Mon | null, foeIsTrainer: boolean) {
    const [sky, g1, g2] = BG[biome] ?? BG.plaine;
    disposeScene(this.scene);
    this.scene = new THREE.Scene();
    this.mineRig = null;
    this.foeRig = null;
    this.trainer = null;
    this.fx = [];
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, 16, 40);
    addLights(this.scene, sky, g1);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 32), new THREE.MeshLambertMaterial({ color: g1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.02;
    this.scene.add(ground);

    for (const [p, r] of [[this.foePos, 1.45], [this.minePos, 1.65]] as [THREE.Vector3, number][]) {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, .32, 22), new THREE.MeshLambertMaterial({ color: g2 }));
      plat.position.set(p.x, .14, p.z);
      this.scene.add(plat);
    }
    // Décor de fond
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const d = 14 + (i % 3) * 2;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + (i % 4) * .4, 0), new THREE.MeshLambertMaterial({ color: g2, flatShading: true }));
      rock.position.set(Math.cos(a) * d, .2, Math.sin(a) * d - 4);
      this.scene.add(rock);
    }

    this.setFoe(foe, foeIsTrainer);
    if (mine) this.setMine(mine);
  }

  setFoe(foe: Mon, isTrainer: boolean) {
    if (this.foeRig) { this.scene.remove(this.foeRig.group); disposeObject(this.foeRig.group); }
    this.foeRig = buildCreature(spOf(foe), foe.shiny);
    this.foeRig.group.scale.multiplyScalar(battleZoom(spOf(foe).scale));
    this.foeRig.group.position.copy(this.foePos);
    this.foeRig.group.position.y = .3;
    this.foeRig.group.rotation.y = -.35;   // face au joueur
    this.scene.add(this.foeRig.group);
    if (isTrainer && !this.trainer) {
      this.trainer = buildHuman(0x8a4a9a, 0xe8c9a0, 0x2a1a12);
      this.trainer.group.scale.multiplyScalar(1.5);
      this.trainer.group.position.set(this.foePos.x + 1.9, 0, this.foePos.z - 1.7);
      this.trainer.group.rotation.y = Math.PI - .6;
      this.scene.add(this.trainer.group);
    }
    this.pop(this.foeRig);
  }

  setMine(mine: Mon) {
    if (this.mineRig) { this.scene.remove(this.mineRig.group); disposeObject(this.mineRig.group); }
    this.mineRig = buildCreature(spOf(mine), mine.shiny);
    this.mineRig.group.scale.multiplyScalar(battleZoom(spOf(mine).scale));
    this.mineRig.group.position.copy(this.minePos);
    this.mineRig.group.position.y = .3;
    this.mineRig.group.rotation.y = Math.PI + .3;   // vue de dos
    this.scene.add(this.mineRig.group);
    this.pop(this.mineRig);
  }

  private rig(who: 'mine' | 'foe') { return who === 'mine' ? this.mineRig : this.foeRig; }

  private pop(rig: CreatureRig) {
    // Mémorise l'échelle réelle AVANT de rétrécir, sinon l'apparition reste minuscule.
    rig.group.userData.baseScale = rig.group.scale.x || 1;
    rig.group.userData.pop = 0;
    rig.group.scale.setScalar(0.01);
  }

  /** Joue un effet visuel court. Retourne la durée en ms. */
  play(who: 'mine' | 'foe', kind: string, type?: string): number {
    const rig = this.rig(who);
    if (!rig) return 0;
    const g = rig.group;
    switch (kind) {
      case 'attack':
        g.userData.lunge = 1;
        return 320;
      case 'hurt':
        g.userData.hurt = 1;
        this.shake = .35;
        this.burst(g.position, type ? new THREE.Color(TYPE_COLOR[type as keyof typeof TYPE_COLOR] ?? '#ffffff').getHex() : 0xffdd66, 14);
        return 260;
      case 'faint':
        g.userData.faint = 1;
        return 520;
      case 'send':
        this.pop(rig);
        return 320;
      case 'status':
        this.burst(g.position, 0xb07fff, 18);
        return 300;
      case 'boost':
        this.burst(g.position, 0x7fe0a0, 16, .8);
        return 300;
      case 'ball': {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8434e }));
        ball.position.copy(this.minePos).setY(1.2);
        this.scene.add(ball);
        ball.userData.arc = { from: ball.position.clone(), to: this.foePos.clone().setY(.9), t: 0 };
        this.fx.push({ obj: ball, life: .7, max: .7, vy: 0, spin: 8 });
        return 700;
      }
      case 'catch':
        if (this.foeRig) { this.foeRig.group.userData.faint = 1; }
        this.burst(this.foePos.clone().setY(1), 0xffe08a, 24, 1.2);
        return 700;
      case 'flee':
        g.userData.flee = 1;
        return 400;
    }
    return 0;
  }

  private burst(at: THREE.Vector3, color: number, n: number, up = 1) {
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(.11, 5, 4), new THREE.MeshBasicMaterial({ color }));
      p.position.copy(at).add(new THREE.Vector3((Math.random() - .5) * 1.6, .8 + Math.random() * .8, (Math.random() - .5) * 1.6));
      this.scene.add(p);
      this.fx.push({ obj: p, life: .5, max: .5, vy: (1 + Math.random() * 2) * up, spin: 0 });
    }
  }

  update(dt: number, cam: THREE.PerspectiveCamera) {
    this.t += dt;
    for (const rig of [this.mineRig, this.foeRig]) {
      if (!rig) continue;
      const g = rig.group;
      const sp = (g.userData.baseScale ??= g.scale.x || 1);
      if (g.userData.pop !== undefined) {
        g.userData.pop = Math.min(1, (g.userData.pop as number) + dt * 4);
        const k = g.userData.pop as number;
        const e = 1 + Math.sin(k * Math.PI) * .25;
        g.scale.setScalar(sp * k * e);
        if (k >= 1) { g.scale.setScalar(sp); delete g.userData.pop; }
      }
      animateRig(rig, this.t);
      const home = rig === this.mineRig ? this.minePos : this.foePos;
      let ox = 0, oy = .3, oz = 0;
      if (g.userData.lunge !== undefined) {
        const k = (g.userData.lunge as number) - dt * 3.2;
        g.userData.lunge = k;
        const s = Math.sin(Math.max(0, 1 - k) * Math.PI);
        const dirx = rig === this.mineRig ? 1 : -1;
        ox = dirx * s * 1.5; oz = -dirx * s * .9;
        if (k <= 0) delete g.userData.lunge;
      }
      if (g.userData.hurt !== undefined) {
        const k = (g.userData.hurt as number) - dt * 4;
        g.userData.hurt = k;
        ox += Math.sin(k * 40) * .18;
        g.visible = Math.sin(k * 30) > -.5;
        if (k <= 0) { delete g.userData.hurt; g.visible = true; }
      }
      if (g.userData.faint !== undefined) {
        const k = (g.userData.faint as number) - dt * 2;
        g.userData.faint = k;
        oy = .3 - (1 - Math.max(0, k)) * 2.2;
        g.rotation.z = (1 - Math.max(0, k)) * 1.2;
        if (k <= 0) { g.visible = false; delete g.userData.faint; }
      }
      if (g.userData.flee !== undefined) {
        const k = (g.userData.flee as number) - dt * 2.5;
        g.userData.flee = k;
        oz += (1 - Math.max(0, k)) * 8;
        if (k <= 0) { g.visible = false; delete g.userData.flee; }
      }
      g.position.set(home.x + ox, oy, home.z + oz);
    }
    if (this.trainer) animateRig(this.trainer, this.t);

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const p = this.fx[i];
      p.life -= dt;
      const arc = p.obj.userData.arc as { from: THREE.Vector3; to: THREE.Vector3; t: number } | undefined;
      if (arc) {
        arc.t = Math.min(1, arc.t + dt / .65);
        p.obj.position.lerpVectors(arc.from, arc.to, arc.t);
        p.obj.position.y += Math.sin(arc.t * Math.PI) * 2.4;
        p.obj.rotation.x += p.spin * dt;
      } else {
        p.obj.position.y += p.vy * dt;
        p.obj.scale.setScalar(Math.max(.01, p.life / p.max));
      }
      if (p.life <= 0) { this.scene.remove(p.obj); this.fx.splice(i, 1); }
    }

    this.shake = Math.max(0, this.shake - dt * 1.6);
    const sx = (Math.random() - .5) * this.shake, sy = (Math.random() - .5) * this.shake;
    // Cadrage adapté à l'orientation de l'écran.
    if (cam.aspect > 1) {
      cam.position.set(sx, 5.2 + sy, 8.2);
      cam.lookAt(0.2, 0.6, -1.8);
    } else {
      cam.position.set(sx, 5.6 + sy, 9.0);
      cam.lookAt(0.2, 1.6, -1.8);
    }
  }

  hideFoe() { if (this.foeRig) this.foeRig.group.visible = false; }
  showAll() {
    if (this.foeRig) this.foeRig.group.visible = true;
    if (this.mineRig) this.mineRig.group.visible = true;
  }
}
