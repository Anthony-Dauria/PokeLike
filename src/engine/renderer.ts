import * as THREE from 'three';

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gl.setPixelRatio(this.dpr);
    this.gl.shadowMap.enabled = false;
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // Sur petits écrans on réduit un peu la résolution interne pour garder 60 fps.
    const perf = w * h > 1_400_000 ? 0.8 : 1;
    this.gl.setPixelRatio(Math.min(this.dpr, 2) * perf);
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(scene: THREE.Scene) {
    this.gl.render(scene, this.camera);
  }
}

/** Éclairage commun : ambiance + soleil directionnel + rebond. */
export function addLights(scene: THREE.Scene, sky: number, ground: number, sun = 0xffffff) {
  const hemi = new THREE.HemisphereLight(sky, ground, 1.05);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(sun, 1.0);
  dir.position.set(6, 12, 4);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(sky, 0.35);
  fill.position.set(-5, 4, -6);
  scene.add(fill);
  return { hemi, dir, fill };
}

/** Libère les ressources GPU d'un objet retiré de la scène. */
export function disposeObject(root: THREE.Object3D | null) {
  if (!root) return;
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh && !(obj as THREE.InstancedMesh).isInstancedMesh) return;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/** Libère les ressources GPU d'une scène qu'on remplace (important sur mobile). */
export function disposeScene(scene: THREE.Scene | null) {
  if (!scene) return;
  scene.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh && !(obj as THREE.InstancedMesh).isInstancedMesh) return;
    // Les géométries partagées entre modèles sont marquées et ne doivent pas être détruites.
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
  scene.clear();
}
