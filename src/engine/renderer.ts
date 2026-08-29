import * as THREE from 'three';

/** Horloge partagée par tous les shaders animés (vent, eau…). */
export const uTime = { value: 0 };

export type Quality = 'haut' | 'leger';
export type Style = 'ds' | 'lisse';

/** Rampe de dégradé pour le cel-shading (MeshToonMaterial). */
let toonRamp: THREE.DataTexture | null = null;
export function toonGradient(): THREE.DataTexture {
  if (toonRamp) return toonRamp;
  const steps = new Uint8Array([96, 142, 192, 232, 255]);
  toonRamp = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.generateMipmaps = false;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

/* -------- passe « écran DS » : rendu basse définition + palette 15 bits -------- */
const PIXEL_FRAG = /* glsl */`
  uniform sampler2D tScene;
  uniform float uLevels;
  varying vec2 vUv;
  void main() {
    // Three rend toujours en linéaire dans une cible hors écran : on encode ici.
    vec3 lin = texture2D(tScene, vUv).rgb;
    vec3 c = mix(pow(lin, vec3(0.41666)) * 1.055 - 0.055, lin * 12.92, step(lin, vec3(0.0031308)));
    // La DS affiche du 15 bits (32 niveaux par canal) : on quantifie pareil.
    c = floor(c * uLevels + 0.5) / uLevels;
    gl_FragColor = vec4(c, 1.0);
  }
`;
const PIXEL_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Côté court du rendu interne en mode DS (la console affichait 192 px). */
export const DS_SHORT = 232;

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  quality: Quality = 'haut';
  style: Style = 'ds';
  pixelShort = DS_SHORT;
  private target: THREE.WebGLRenderTarget | null = null;
  private quad: THREE.Mesh | null = null;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gl.setPixelRatio(this.dpr);
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    // Rendu stylisé : pas de tone mapping, les couleurs restent franches.
    this.gl.toneMapping = THREE.NoToneMapping;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.gl.shadowMap.enabled = q === 'haut';
    this.gl.shadowMap.needsUpdate = true;
    this.resize();
  }

  setStyle(st: Style) {
    this.style = st;
    this.resize();
  }

  /** (Re)crée la cible basse définition en respectant le rapport de l'écran. */
  private ensureTarget(w: number, h: number) {
    const short = this.pixelShort * (this.quality === 'haut' ? 1 : .85);
    const tw = Math.max(64, Math.round(w < h ? short : (short * w) / h));
    const th = Math.max(64, Math.round(w < h ? (short * h) / w : short));
    if (this.target && this.target.width === tw && this.target.height === th) return;
    this.target?.dispose();
    this.target = new THREE.WebGLRenderTarget(tw, th, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: true, samples: 0,
    });
    this.target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    if (!this.quad) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { tScene: { value: null }, uLevels: { value: 31 } },
        vertexShader: PIXEL_VERT, fragmentShader: PIXEL_FRAG, depthTest: false, depthWrite: false,
      });
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      this.quad.frustumCulled = false;
      this.quadScene.add(this.quad);
    }
    (this.quad.material as THREE.ShaderMaterial).uniforms.tScene.value = this.target.texture;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const cap = this.quality === 'haut' ? 2 : 1.35;
    // Sur les très grands écrans on réduit la résolution interne pour tenir 60 fps.
    const perf = w * h > 1_400_000 ? 0.82 : 1;
    // En mode DS la définition interne est fixée par la cible : inutile de pousser le DPR.
    this.gl.setPixelRatio(this.style === 'ds' ? Math.min(this.dpr, 2) : Math.min(this.dpr, cap) * perf);
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.style === 'ds') this.ensureTarget(w, h);
  }

  render(scene: THREE.Scene) {
    if (this.style !== 'ds' || !this.target || !this.quad) {
      this.gl.setRenderTarget(null);
      this.gl.render(scene, this.camera);
      return;
    }
    this.gl.setRenderTarget(this.target);
    this.gl.clear();
    this.gl.render(scene, this.camera);
    this.gl.setRenderTarget(null);
    this.gl.render(this.quadScene, this.quadCam);
  }
}

export interface SceneLights {
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
}

/** Éclairage commun : ciel/sol, soleil projetant des ombres, et lumière de remplissage froide. */
export function addLights(scene: THREE.Scene, sky: number, ground: number, sun = 0xffffff, shadows = true): SceneLights {
  const hemi = new THREE.HemisphereLight(sky, ground, .62);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(sun, 1.05);
  key.position.set(9, 16, 7);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.06;
    const c = key.shadow.camera;
    c.near = 1; c.far = 60;
    c.left = -18; c.right = 18; c.top = 18; c.bottom = -18;
    c.updateProjectionMatrix();
  }
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(sky, 0.28);
  fill.position.set(-7, 5, -8);
  scene.add(fill);

  return { hemi, sun: key, fill };
}

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const SKY_FRAG = /* glsl */`
  uniform vec3 uTop, uMid, uBottom;
  uniform float uSunY;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = h < 0.5
      ? mix(uBottom, uMid, smoothstep(0.28, 0.5, h))
      : mix(uMid, uTop, smoothstep(0.5, 0.92, h));
    // halo diffus autour du soleil
    float glow = pow(clamp(vDir.y * 0.35 + uSunY, 0.0, 1.0), 6.0);
    col += glow * 0.16;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Dôme de ciel dégradé (remplace la couleur de fond plate). */
export function addSky(scene: THREE.Scene, top: number, mid: number, bottom: number, sunY = 0.55): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uMid: { value: new THREE.Color(mid) },
      uBottom: { value: new THREE.Color(bottom) },
      uSunY: { value: sunY },
    },
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), mat);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);
  return dome;
}

/** Ajoute une oscillation de vent au sommet des géométries instanciées. */
export function windify(mat: THREE.Material, strength: number, speed = 1.5) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uWind = { value: strength };
    shader.uniforms.uWindSpeed = { value: speed };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform float uWind;
        uniform float uWindSpeed;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 wp = instanceMatrix[3].xyz;
          #else
            vec3 wp = vec3(0.0);
          #endif
          float phase = wp.x * 0.65 + wp.z * 0.83;
          float amp = uWind * max(transformed.y, 0.0);
          transformed.x += sin(uTime * uWindSpeed + phase) * amp;
          transformed.z += cos(uTime * uWindSpeed * 0.8 + phase * 1.3) * amp * 0.6;
        }`);
  };
  mat.needsUpdate = true;
}

/** Libère les ressources GPU d'un objet retiré de la scène. */
export function disposeObject(root: THREE.Object3D | null) {
  if (!root) return;
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh && !(obj as THREE.InstancedMesh).isInstancedMesh) return;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((x) => !x.userData.shared && x.dispose());
    else if (mat && !mat.userData.shared) mat.dispose();
  });
}

/** Libère les ressources GPU d'une scène qu'on remplace (important sur mobile). */
export function disposeScene(scene: THREE.Scene | null) {
  if (!scene) return;
  disposeObject(scene);
  scene.clear();
}
