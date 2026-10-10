// Models for the home flight: GE-01 (a low-poly biplane loaded from /models/avion.glb, with a
// procedural propeller plane as fallback) and the five themed floating islands (one per section).
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  BoxGeometry,
  BufferGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
} from 'three';

export const CYAN = new Color('#00f0ff');
export const VIOLET = new Color('#7928ca');
export const SKY = new Color('#38bdf8');

// ---------- Textures ----------

export const glow = (rgb: string) => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb},0.9)`);
  grad.addColorStop(0.35, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
};

/** Soft cloud puff: a few overlapping radial blobs */
export const cloudTexture = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  [[128, 76, 58], [84, 82, 40], [172, 84, 44], [110, 58, 38], [150, 56, 34], [56, 92, 26], [202, 94, 26]].forEach(([x, y, r]) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  });
  return new CanvasTexture(c);
};

/** Holographic tag (mono text in a thin cyan frame) as a camera-facing sprite, `height` world units tall */
export function holoText(text: string, height = 0.9, color = '#7df4ff') {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = '600 44px "JetBrains Mono", ui-monospace, monospace';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 48;
  c.width = w;
  c.height = 72;
  g.font = font;
  g.fillStyle = 'rgba(10,11,16,0.55)';
  g.strokeStyle = 'rgba(0,240,255,0.55)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(2, 2, w - 4, 68, 10);
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 24, 38);
  const sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  sprite.scale.set((w / 72) * height, height, 1);
  return sprite;
}

/** Flat sign texture for building facades */
function signTexture(text: string, w = 256, h = 96) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d1020';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#00f0ff';
  g.lineWidth = 4;
  g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#7df4ff';
  g.font = `700 ${Math.round(h * 0.55)}px "Space Grotesk Variable", "Hanken Grotesk Variable", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  return new CanvasTexture(c);
}

/** "GE" roundel for the wings: cyan disc, violet ring */
function roundelTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7928ca';
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0a0b10';
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#00f0ff';
  g.font = '800 46px "Space Grotesk Variable", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('GE', 64, 67);
  return new CanvasTexture(c);
}

// ---------- Shared materials ----------

const mats = {
  hull: () => new MeshStandardMaterial({ color: 0xd5dde8, metalness: 0.55, roughness: 0.32 }),
  dark: () => new MeshStandardMaterial({ color: 0x1a1c28, metalness: 0.4, roughness: 0.5 }),
  rock: () => new MeshStandardMaterial({ color: 0x8a7d6f, roughness: 0.95, flatShading: true }),
  top: () => new MeshStandardMaterial({ color: 0x6e9f4c, roughness: 0.9, flatShading: true }),
  wall: () => new MeshStandardMaterial({ color: 0xd3d9e6, roughness: 0.7, flatShading: true }),
  roof: () => new MeshStandardMaterial({ color: 0x8f97b5, roughness: 0.7, flatShading: true }),
  leaf: () => new MeshStandardMaterial({ color: 0x3f7f45, roughness: 0.9, flatShading: true }),
  wood: () => new MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9, flatShading: true }),
  basic: (color: number | Color) => new MeshBasicMaterial({ color, toneMapped: false }),
};

const box = (w: number, h: number, d: number, m: Material, x = 0, y = 0, z = 0) => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
};

/** Thin cylinder from a to b (tower legs, braces, poles) */
const strut = (a: Vector3, b: Vector3, r: number, m: Material) => {
  const len = a.distanceTo(b);
  const mesh = new Mesh(new CylinderGeometry(r, r, len, 6), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.lookAt(b);
  mesh.rotateX(Math.PI / 2);
  return mesh;
};

const tree = (x: number, z: number, s = 1, m = mats) => {
  const g = new Group();
  g.add(box(0.12 * s, 0.5 * s, 0.12 * s, m.wood(), 0, 0.25 * s, 0));
  const crown = new Mesh(new ConeGeometry(0.45 * s, 1.1 * s, 6), m.leaf());
  crown.position.y = 0.95 * s;
  g.add(crown);
  g.position.set(x, 0.35, z);
  return g;
};

// ---------- GE-01: propeller plane ----------

export interface Plane {
  group: Group;
  /** Wingtip positions in plane space, for contrails */
  wingtips: [Vector3, Vector3];
  update: (t: number, dt: number, speed: number) => void;
}

export function buildPlane(): Plane {
  const plane = new Group();
  const hull = mats.hull();
  const dark = mats.dark();
  const edge = new LineBasicMaterial({ color: CYAN });

  // Fuselage: lathe profile from tail (y=-2.4) to the cowling (y=1.75), turned to point down -Z
  const profile = [
    new Vector2(0, -2.4), new Vector2(0.12, -2.35), new Vector2(0.26, -1.6), new Vector2(0.42, -0.6),
    new Vector2(0.46, 0.6), new Vector2(0.43, 1.3), new Vector2(0.38, 1.7), new Vector2(0.2, 1.76),
  ];
  const body = new Mesh(new LatheGeometry(profile, 14), hull);
  body.rotation.x = -Math.PI / 2;
  plane.add(body);

  // Cowling band and spinner
  const cowl = new Mesh(new CylinderGeometry(0.4, 0.44, 0.35, 14, 1, true), dark);
  cowl.rotation.x = Math.PI / 2;
  cowl.position.z = -1.55;
  plane.add(cowl);
  const spinner = new Mesh(new ConeGeometry(0.2, 0.5, 12), new MeshStandardMaterial({ color: 0x00c8d6, emissive: 0x006a72, metalness: 0.6, roughness: 0.3 }));
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -2.0;
  plane.add(spinner);

  // Three-blade propeller with cyan tips, plus a faint disc that shows at speed
  const prop = new Group();
  prop.position.z = -1.85;
  const bladeMat = new MeshStandardMaterial({ color: 0x12131c, metalness: 0.3, roughness: 0.6 });
  const tipMat = mats.basic(CYAN);
  for (let i = 0; i < 3; i++) {
    const arm = new Group();
    arm.rotation.z = (i * Math.PI * 2) / 3;
    const blade = box(0.16, 1.35, 0.04, bladeMat, 0, 0.75, 0);
    blade.rotation.y = 0.35; // pitch
    arm.add(blade, box(0.17, 0.16, 0.05, tipMat, 0, 1.38, 0));
    prop.add(arm);
  }
  plane.add(prop);
  const disc = new Mesh(
    new CircleGeometry(1.5, 40),
    new MeshBasicMaterial({ color: 0x9fe9ff, transparent: true, opacity: 0.06, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
  );
  disc.position.z = -1.86;
  plane.add(disc);

  // Straight tapered low wing (one side, mirrored), slight dihedral, neon edges
  const wingShape = new Shape();
  wingShape.moveTo(0, 0.55);
  wingShape.lineTo(3.2, 0.25);
  wingShape.quadraticCurveTo(3.45, 0, 3.2, -0.45);
  wingShape.lineTo(0, -0.75);
  const wingGeo = new ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: false });
  wingGeo.rotateX(-Math.PI / 2); // shape Y becomes world -Z (leading edge forward)
  const roundel = new MeshBasicMaterial({ map: roundelTexture(), transparent: true });
  [1, -1].forEach((s) => {
    const w = new Mesh(wingGeo, dark);
    w.add(new LineSegments(new EdgesGeometry(wingGeo), edge));
    const badge = new Mesh(new PlaneGeometry(0.75, 0.75), roundel);
    badge.rotation.x = -Math.PI / 2;
    badge.position.set(2.35, 0.11, -0.05);
    if (s < 0) badge.scale.x = -1; // undo the wing mirror so 'GE' reads correctly on both sides
    w.add(badge);
    w.scale.x = s;
    w.position.set(s * 0.3, -0.2, -0.3);
    w.rotation.z = s * 0.06;
    plane.add(w);
  });

  // Tail: horizontal stabilizers + vertical fin with violet edges
  const stabShape = new Shape();
  stabShape.moveTo(0, 0.3);
  stabShape.lineTo(1.3, 0.12);
  stabShape.lineTo(1.35, -0.18);
  stabShape.lineTo(0, -0.35);
  const stabGeo = new ExtrudeGeometry(stabShape, { depth: 0.06, bevelEnabled: false });
  stabGeo.rotateX(-Math.PI / 2);
  const violetEdge = new LineBasicMaterial({ color: 0xb07cff });
  [1, -1].forEach((s) => {
    const st = new Mesh(stabGeo, dark);
    st.add(new LineSegments(new EdgesGeometry(stabGeo), violetEdge));
    st.scale.x = s;
    st.position.set(s * 0.08, 0.05, 2.1);
    plane.add(st);
  });
  const finShape = new Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.95, 0);
  finShape.lineTo(0.85, 1.05);
  finShape.lineTo(0.5, 1.1);
  const finGeo = new ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
  const fin = new Mesh(finGeo, hull);
  fin.add(new LineSegments(new EdgesGeometry(finGeo), violetEdge));
  fin.rotation.y = -Math.PI / 2; // shape X runs back along +Z
  fin.position.set(0.03, 0.2, 1.45);
  plane.add(fin);

  // Glass canopy
  const canopy = new Mesh(
    new SphereGeometry(0.3, 16, 12),
    new MeshPhysicalMaterial({ color: 0x00f0ff, emissive: 0x00636b, roughness: 0.1, transparent: true, opacity: 0.85 }),
  );
  canopy.scale.set(1, 0.75, 2.1);
  canopy.position.set(0, 0.4, -0.35);
  plane.add(canopy);

  // Navigation lights: port red, starboard green, white strobe on the fin
  const tipL = new Vector3(-3.72, 0.02, -0.32), tipR = new Vector3(3.72, 0.02, -0.32);
  const navR = new Mesh(new SphereGeometry(0.07, 8, 6), mats.basic(0x33ff99));
  navR.position.copy(tipR);
  const navL = new Mesh(new SphereGeometry(0.07, 8, 6), mats.basic(0xff3355));
  navL.position.copy(tipL);
  const strobe = new Mesh(new SphereGeometry(0.08, 8, 6), mats.basic(0xffffff));
  strobe.position.set(0, 1.35, 2.35);
  plane.add(navR, navL, strobe);

  // Engine light (lights the island ahead a little)
  const light = new PointLight(0x7df4ff, 1.2, 10);
  light.position.z = -2.4;
  plane.add(light);

  plane.scale.setScalar(0.85);
  const discMat = disc.material as MeshBasicMaterial;
  return {
    group: plane,
    wingtips: [tipL.clone().multiplyScalar(0.85), tipR.clone().multiplyScalar(0.85)],
    update: (t, dt, speed) => {
      prop.rotation.z += dt * (14 + speed * 38);
      discMat.opacity = 0.05 + speed * 0.1;
      strobe.visible = t % 1.4 < 0.07;
    },
  };
}

// ---------- GE-01: the biplane model ----------

/**
 * Loads the biplane (nose +X, up +Y in the file) and splits the propeller off so it can spin.
 * The propeller is the set of separate parts (spinner + two blades) that sit entirely in the nose;
 * parts are found by welding vertices by position and grouping connected triangles.
 */
export async function loadBiplane(url: string): Promise<Plane> {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(url);
  let src: Mesh | null = null;
  gltf.scene.traverse((o) => { if (!src && (o as Mesh).isMesh) src = o as Mesh; });
  if (!src) throw new Error('avion.glb has no mesh');
  const mesh = src as Mesh;
  const geo = mesh.geometry as BufferGeometry;
  const pos = geo.attributes.position;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);

  // Weld by position, then union-find over triangles → connected parts
  const weld = new Map<string, number>();
  const wid = new Int32Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    const k = `${pos.getX(v).toFixed(4)},${pos.getY(v).toFixed(4)},${pos.getZ(v).toFixed(4)}`;
    if (!weld.has(k)) weld.set(k, weld.size);
    wid[v] = weld.get(k)!;
  }
  const parent = Array.from({ length: weld.size }, (_, i) => i);
  const find = (a: number): number => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
  for (let i = 0; i < idx.length; i += 3) {
    const a = find(wid[idx[i]]);
    parent[find(wid[idx[i + 1]])] = a;
    parent[find(wid[idx[i + 2]])] = a;
  }
  const minX = new Map<number, number>();
  for (let i = 0; i < idx.length; i++) {
    const r = find(wid[idx[i]]);
    minX.set(r, Math.min(minX.get(r) ?? Infinity, pos.getX(idx[i])));
  }
  const PROP_MIN_X = 0.9; // the cowling and the wheels start further back
  const body: number[] = [], prop: number[] = [];
  const box = { y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity, x0: Infinity, x1: -Infinity };
  for (let i = 0; i < idx.length; i += 3) {
    const isProp = (minX.get(find(wid[idx[i]])) ?? 0) > PROP_MIN_X;
    (isProp ? prop : body).push(idx[i], idx[i + 1], idx[i + 2]);
    if (isProp) for (let k = 0; k < 3; k++) {
      const v = idx[i + k];
      box.x0 = Math.min(box.x0, pos.getX(v)); box.x1 = Math.max(box.x1, pos.getX(v));
      box.y0 = Math.min(box.y0, pos.getY(v)); box.y1 = Math.max(box.y1, pos.getY(v));
      box.z0 = Math.min(box.z0, pos.getZ(v)); box.z1 = Math.max(box.z1, pos.getZ(v));
    }
  }
  const material = mesh.material as Material;
  const model = new Group();
  const bodyGeo = geo.clone();
  bodyGeo.setIndex(body);
  model.add(new Mesh(bodyGeo, material));

  // Propeller pivots on the hub (centre of the blades' bounding box in Y/Z)
  const hub = new Vector3((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, (box.z0 + box.z1) / 2);
  const propGeo = geo.clone();
  propGeo.setIndex(prop);
  propGeo.translate(-hub.x, -hub.y, -hub.z);
  const propeller = new Mesh(propGeo, material);
  propeller.position.copy(hub);
  model.add(propeller);
  const radius = Math.max(box.y1 - box.y0, box.z1 - box.z0) / 2;
  const disc = new Mesh(
    new CircleGeometry(radius, 36),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, toneMapped: false }),
  );
  disc.position.copy(hub);
  disc.rotation.y = Math.PI / 2; // face along X
  model.add(disc);

  model.rotation.y = Math.PI / 2; // nose +X → -Z (forward)
  const SCALE = 1.05;
  const plane = new Group();
  plane.add(model);
  plane.scale.setScalar(SCALE);

  // Lights at the upper wingtips (file: z ±1.89 at y ≈ 0.47 → plane space x ±1.89) and on the tail
  const tipL = new Vector3(-1.86, 0.47, -0.28), tipR = new Vector3(1.86, 0.47, -0.28);
  const navR = new Mesh(new SphereGeometry(0.05, 8, 6), mats.basic(0x33ff99));
  navR.position.copy(tipR);
  const navL = new Mesh(new SphereGeometry(0.05, 8, 6), mats.basic(0xff3355));
  navL.position.copy(tipL);
  const strobe = new Mesh(new SphereGeometry(0.05, 8, 6), mats.basic(0xffffff));
  strobe.position.set(0, 0.52, 1.18);
  plane.add(navR, navL, strobe);

  const discMat = disc.material as MeshBasicMaterial;
  return {
    group: plane,
    wingtips: [tipL.clone().multiplyScalar(SCALE), tipR.clone().multiplyScalar(SCALE)],
    update: (t, dt, speed) => {
      propeller.rotation.x += dt * (22 + speed * 40);
      discMat.opacity = 0.06 + speed * 0.12;
      strobe.visible = t % 1.4 < 0.07;
    },
  };
}

// ---------- Islands ----------

export interface Island {
  group: Group;
  /** World-space height of the beacon crystal */
  crystalY: number;
  markVisited: () => void;
  /** Arrival effect: shockwave + crystal flash */
  arrive: () => void;
  update: (t: number, dt: number) => void;
}

/** Floating rock: flat top at y=0.35, jagged underside, cyan rim */
function rockBase(radius: number) {
  const g = new Group();
  const top = new Mesh(new CylinderGeometry(radius, radius * 0.94, 0.7, 10), mats.top());
  g.add(top);
  const under = new ConeGeometry(radius * 0.94, radius * 1.5, 10, 3);
  const pos = under.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < radius * 0.74 && y > -radius * 0.74) { // keep the rim and the tip in place
      pos.setX(i, pos.getX(i) * (0.82 + Math.random() * 0.3));
      pos.setZ(i, pos.getZ(i) * (0.82 + Math.random() * 0.3));
    }
  }
  under.computeVertexNormals();
  const rock = new Mesh(under, mats.rock());
  rock.rotation.x = Math.PI;
  rock.position.y = -0.35 - radius * 0.75;
  g.add(rock);
  const rim = new Mesh(new TorusGeometry(radius, 0.035, 4, 64), mats.basic(CYAN));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.35;
  g.add(rim);
  // Small crystals hanging under the rock
  [[0.3, -radius * 1.6], [-radius * 0.4, -radius * 1.1], [radius * 0.45, -radius * 1.0]].forEach(([x, y]) => {
    const c = new Mesh(new OctahedronGeometry(0.22), mats.basic(0x7df4ff));
    c.position.set(x, y, 0.2);
    c.scale.y = 1.8;
    g.add(c);
  });
  return g;
}

const ISLAND_Y = -2; // island top sits just below the flight altitude
const CRYSTAL_LOCAL = 9; // beacon crystal above the island (world y = 7)

/** Beacon on top of every island: crystal, orbit ring, light pillar, shockwave */
function beaconParts(color: Color) {
  const g = new Group();
  const crystal = new Mesh(
    new OctahedronGeometry(1.1, 0),
    new MeshStandardMaterial({ color: 0x12131c, emissive: color, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.25, flatShading: true }),
  );
  crystal.scale.y = 1.4;
  crystal.add(new LineSegments(new EdgesGeometry(crystal.geometry), new LineBasicMaterial({ color })));
  crystal.position.y = CRYSTAL_LOCAL;
  g.add(crystal);
  const halo = new Sprite(new SpriteMaterial({ map: glow(`${(color.r * 255) | 0},${(color.g * 255) | 0},${(color.b * 255) | 0}`), blending: AdditiveBlending, depthWrite: false }));
  halo.position.y = CRYSTAL_LOCAL;
  halo.scale.setScalar(4);
  g.add(halo);
  const orbit = new Mesh(new TorusGeometry(1.9, 0.03, 4, 64), mats.basic(color));
  orbit.position.y = CRYSTAL_LOCAL;
  orbit.rotation.x = Math.PI / 2 + 0.35;
  g.add(orbit);
  const beamMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: DoubleSide, toneMapped: false });
  const beam = new Mesh(new CylinderGeometry(0.22, 0.5, 38, 16, 1, true), beamMat);
  beam.position.y = CRYSTAL_LOCAL + 19;
  g.add(beam);
  const shockMat = new MeshBasicMaterial({ color: 0x9ff6ff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, blending: AdditiveBlending });
  const shock = new Mesh(new RingGeometry(0.92, 1, 64), shockMat);
  shock.rotation.x = -Math.PI / 2;
  shock.position.y = CRYSTAL_LOCAL;
  g.add(shock);

  const crystalMat = crystal.material as MeshStandardMaterial;
  let visited = false, shockT = -1;
  return {
    g,
    markVisited: () => {
      visited = true;
      beamMat.color.copy(SKY);
      beamMat.opacity = 0.26;
    },
    arrive: () => { shockT = 0; },
    update: (t: number, dt: number, i: number) => {
      crystal.rotation.y += dt * (visited ? 1.4 : 0.5);
      crystal.position.y = CRYSTAL_LOCAL + Math.sin(t * 1.2 + i) * 0.3;
      orbit.rotation.z += dt * 0.6;
      let flash = 0;
      if (shockT >= 0) {
        shockT += dt;
        const k = Math.min(shockT / 1.3, 1);
        shock.scale.setScalar(1 + k * 9);
        shockMat.opacity = 0.9 * (1 - k);
        flash = 1 - k;
        if (k >= 1) shockT = -1;
      }
      crystalMat.emissiveIntensity = (visited ? 1.4 : 0.9) + flash * 2.5;
    },
  };
}

type Theme = (top: Group, small: boolean) => (t: number, dt: number) => void;

// 01 · Sobre mí: an observatory with a turning telescope
const observatory: Theme = (g) => {
  const wall = mats.wall();
  const base = new Mesh(new CylinderGeometry(1.5, 1.7, 1.6, 14), wall);
  base.position.y = 1.15;
  const dome = new Mesh(new SphereGeometry(1.6, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), mats.hull());
  dome.position.y = 1.95;
  const scope = new Group();
  scope.position.y = 2.6;
  const tube = new Mesh(new CylinderGeometry(0.22, 0.3, 2.4, 10), mats.dark());
  tube.rotation.x = -0.95;
  tube.position.set(0, 0.55, -0.55);
  const lens = new Mesh(new CircleGeometry(0.22, 16), mats.basic(CYAN));
  lens.position.set(0, 1.0, -1.0);
  lens.rotation.x = -0.95 - Math.PI / 2;
  scope.add(tube, lens);
  const door = box(0.55, 0.85, 0.05, mats.basic(0xffc46b), 0, 0.78, 1.66);
  g.add(base, dome, scope, door, tree(2.6, 0.8), tree(-2.4, 1.4, 0.8), tree(-1.8, -2.2, 1.1));
  return (t) => { scope.rotation.y = Math.sin(t * 0.25) * 1.2; };
};

// 02 · Experiencia: a university hall (UTN) with columns and a flag
const university: Theme = (g) => {
  const wall = mats.wall();
  g.add(box(4.2, 2.1, 2.4, wall, 0, 1.4, -0.2));
  const roofShape = new Shape();
  roofShape.moveTo(-2.4, 0);
  roofShape.lineTo(2.4, 0);
  roofShape.lineTo(0, 1.05);
  const roofGeo = new ExtrudeGeometry(roofShape, { depth: 3.1, bevelEnabled: false });
  roofGeo.translate(0, 0, -1.55);
  const roof = new Mesh(roofGeo, mats.roof());
  roof.position.set(0, 2.45, 0.15);
  g.add(roof);
  for (let i = 0; i < 4; i++) {
    const col = new Mesh(new CylinderGeometry(0.15, 0.17, 2.1, 8), wall);
    col.position.set(-1.6 + i * 1.07, 1.4, 1.45);
    g.add(col);
  }
  g.add(box(4.6, 0.12, 0.9, mats.roof(), 0, 0.41, 1.45));
  const windowMat = mats.basic(0xffc46b);
  const windows = [-1.1, 0, 1.1].map((x) => box(0.5, 0.65, 0.05, windowMat, x, 1.45, 1.03));
  g.add(...windows);
  const sign = new Mesh(new PlaneGeometry(1.5, 0.5), new MeshBasicMaterial({ map: signTexture('UTN') }));
  sign.position.set(0, 2.85, 1.72);
  g.add(sign);
  // Flag on a pole
  g.add(strut(new Vector3(2.9, 0.35, 0.9), new Vector3(2.9, 4.2, 0.9), 0.04, mats.dark()));
  const flagPivot = new Group();
  flagPivot.position.set(2.9, 3.9, 0.9);
  const flag = new Mesh(new PlaneGeometry(0.9, 0.55), new MeshBasicMaterial({ color: 0x7928ca, side: DoubleSide }));
  flag.position.x = 0.45;
  flagPivot.add(flag);
  g.add(flagPivot, tree(-3, 1.6, 0.9), tree(-3.1, -1.5));
  return (t) => {
    flagPivot.rotation.y = Math.sin(t * 2.2) * 0.35;
    windowMat.color.setHSL(0.11, 1, 0.68 + Math.sin(t * 0.7) * 0.04);
  };
};

// 03 · Proyectos: three small islands, one per project
const projects: Theme = (g) => {
  const wall = mats.wall();
  const parts: ((t: number, dt: number) => void)[] = [];
  const mini = (x: number, y: number, z: number) => {
    const m = rockBase(2.3);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // Don Inodoros POS: counter, register with a glowing screen, stock boxes
  const pos = mini(-4.3, 0.4, 1.2);
  pos.add(box(1.8, 0.8, 0.7, wall, 0, 0.75, 0.2));
  pos.add(box(0.6, 0.3, 0.45, mats.dark(), -0.3, 1.3, 0.2));
  const screen = box(0.55, 0.38, 0.04, mats.basic(CYAN), -0.3, 1.65, 0.05);
  screen.rotation.x = -0.35;
  pos.add(screen);
  const cardboard = new MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.9, flatShading: true });
  pos.add(box(0.6, 0.5, 0.6, cardboard, 1.2, 0.6, -0.5), box(0.55, 0.45, 0.55, cardboard, 1.2, 1.07, -0.5), box(0.6, 0.5, 0.6, cardboard, 0.5, 0.6, -0.9));
  const posTag = holoText('POS', 0.55);
  posTag.position.set(-0.3, 2.4, 0.1);
  pos.add(posTag);

  // BurGame: gaming desk, two monitors, chair, RGB strip
  const game = mini(0, -0.3, -2.2);
  game.add(box(2, 0.1, 0.8, mats.dark(), 0, 1.15, 0));
  game.add(box(0.08, 0.8, 0.7, mats.dark(), -0.9, 0.75, 0), box(0.08, 0.8, 0.7, mats.dark(), 0.9, 0.75, 0));
  const monA = box(0.85, 0.5, 0.04, mats.basic(0xff2bd6), -0.48, 1.6, -0.2);
  const monB = box(0.85, 0.5, 0.04, mats.basic(CYAN), 0.48, 1.6, -0.2);
  monA.rotation.y = 0.2;
  monB.rotation.y = -0.2;
  game.add(monA, monB);
  const chairMat = new MeshStandardMaterial({ color: 0x5b21b6, roughness: 0.6 });
  game.add(box(0.6, 0.12, 0.6, chairMat, 0, 0.85, 0.8), box(0.6, 0.8, 0.1, chairMat, 0, 1.3, 1.1));
  const rgbMat = new MeshBasicMaterial({ color: 0xff2bd6 });
  game.add(box(1.9, 0.04, 0.04, rgbMat, 0, 1.08, 0.41));

  // Pasta Fiorella: small factory with a sawtooth roof and a steaming chimney
  const fab = mini(4.3, 0.6, 1.0);
  const cream = new MeshStandardMaterial({ color: 0xe9d8b8, roughness: 0.8, flatShading: true });
  fab.add(box(2, 1.1, 1.4, cream, 0, 0.9, 0));
  const tooth = new Shape();
  tooth.moveTo(0, 0);
  tooth.lineTo(0.5, 0.5);
  tooth.lineTo(0.5, 0);
  const toothGeo = new ExtrudeGeometry(tooth, { depth: 1.4, bevelEnabled: false });
  toothGeo.translate(0, 0, -0.7);
  [-1, -0.5, 0, 0.5].forEach((x) => {
    const tMesh = new Mesh(toothGeo, mats.roof());
    tMesh.position.set(x, 1.45, 0);
    fab.add(tMesh);
  });
  fab.add(box(0.4, 0.6, 0.05, mats.basic(0xffc46b), 0.4, 0.65, 0.71));
  const chimney = new Mesh(new CylinderGeometry(0.16, 0.2, 1.4, 8), mats.roof());
  chimney.position.set(-0.6, 2.0, -0.3);
  fab.add(chimney);
  const steamTex = cloudTexture();
  const steam = [0, 1, 2].map((i) => {
    const s = new Sprite(new SpriteMaterial({ map: steamTex, color: 0xdfe6ff, transparent: true, opacity: 0.4, depthWrite: false }));
    s.userData.phase = i / 3;
    fab.add(s);
    return s;
  });

  parts.push((t) => {
    rgbMat.color.setHSL((t * 0.15) % 1, 1, 0.55);
    (monA.material as MeshBasicMaterial).color.setHSL(0.85, 1, 0.5 + Math.sin(t * 3) * 0.05);
    steam.forEach((s) => {
      const k = (t * 0.35 + s.userData.phase) % 1;
      s.position.set(-0.6 + k * 0.4, 2.8 + k * 1.8, -0.3);
      s.scale.set(0.8 + k * 1.4, 0.45 + k * 0.8, 1);
      (s.material as SpriteMaterial).opacity = 0.45 * (1 - k);
    });
  });
  return (t, dt) => parts.forEach((p) => p(t, dt));
};

// 04 · Skills: server racks with blinking LEDs and a constellation of the stack
const servers: Theme = (g, small) => {
  const dark = mats.dark();
  g.add(box(1.4, 2.9, 1.0, dark, -0.5, 1.8, 0), box(1.1, 2.2, 0.9, dark, 1.0, 1.45, 0.1));
  const ledMats = [mats.basic(CYAN), mats.basic(0x4ade80), mats.basic(0xb07cff)];
  const leds: Mesh[] = [];
  for (let r = 0; r < 7; r++) {
    g.add(box(1.1, 0.05, 0.02, mats.basic(0x1d3442), -0.5, 0.75 + r * 0.38, 0.51));
    for (let c = 0; c < 3; c++) {
      const led = box(0.08, 0.06, 0.02, ledMats[(r + c) % 3], -0.2 + c * 0.14, 0.82 + r * 0.38, 0.52);
      leds.push(led);
      g.add(led);
    }
  }
  // Constellation: stack names (or plain stars on phones) linked by a thin ring
  const constel = new Group();
  constel.position.y = 4.4;
  const names = ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'JWT', 'Flyway', 'FastAPI', 'Mercado Pago'];
  const pts: Vector3[] = [];
  names.forEach((n, i) => {
    const a = (i / names.length) * Math.PI * 2;
    const p = new Vector3(Math.cos(a) * 4.2, Math.sin(a * 2) * 0.6, Math.sin(a) * 4.2);
    pts.push(p);
    const star = small ? new Mesh(new OctahedronGeometry(0.16), mats.basic(0x7df4ff)) : holoText(n, 0.55);
    star.position.copy(p);
    constel.add(star);
  });
  const ring = new Line(new BufferGeometry().setFromPoints([...pts, pts[0]]), new LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 }));
  constel.add(ring);
  g.add(constel);
  let tick = 0;
  return (t, dt) => {
    constel.rotation.y = t * 0.12;
    tick += dt;
    if (tick > 0.12) {
      tick = 0;
      leds.forEach((l) => { if (Math.random() < 0.18) l.visible = !l.visible; });
    }
  };
};

// 05 · Contacto: a radio tower with a dish, a red beacon light and expanding signal rings
const tower: Theme = (g) => {
  const steel = new MeshStandardMaterial({ color: 0xaab4c8, metalness: 0.6, roughness: 0.4 });
  const top = 6.2;
  const corners = [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]];
  const at = (k: number, i: number) => {
    const s = 1 - k * 0.78;
    return new Vector3(corners[i][0] * s, 0.35 + k * (top - 0.35), corners[i][1] * s);
  };
  for (let i = 0; i < 4; i++) {
    g.add(strut(at(0, i), at(1, i), 0.06, steel));
    for (let k = 0; k < 4; k++) g.add(strut(at(k / 4, i), at((k + 1) / 4, (i + 1) % 4), 0.025, steel)); // cross bracing
  }
  const dish = new Mesh(new SphereGeometry(0.85, 16, 8, 0, Math.PI * 2, 0, 0.9), new MeshStandardMaterial({ color: 0xd5dde8, metalness: 0.5, roughness: 0.35, side: DoubleSide }));
  const dishPivot = new Group();
  dishPivot.position.set(0, 4.2, 0.5);
  dish.rotation.x = -1.2;
  dishPivot.add(dish);
  g.add(dishPivot);
  const redLight = new Mesh(new SphereGeometry(0.14, 10, 8), mats.basic(0xff3355));
  redLight.position.y = top + 0.15;
  g.add(redLight);
  g.add(box(1.4, 0.9, 1.1, mats.wall(), 2.2, 0.8, 1.2), box(0.35, 0.55, 0.05, mats.basic(0xffc46b), 2.2, 0.62, 1.76));
  const rings = [0, 1, 2].map((i) => {
    const m = new Mesh(new TorusGeometry(1, 0.03, 6, 48), new MeshBasicMaterial({ color: CYAN, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    m.rotation.x = Math.PI / 2;
    m.position.y = top;
    m.userData.phase = i / 3;
    g.add(m);
    return m;
  });
  return (t) => {
    redLight.visible = t % 1.6 < 0.8;
    dishPivot.rotation.y = Math.sin(t * 0.3) * 0.6;
    rings.forEach((r) => {
      const k = (t * 0.4 + r.userData.phase) % 1;
      r.scale.setScalar(0.3 + k * 4.5);
      (r.material as MeshBasicMaterial).opacity = 0.8 * (1 - k);
    });
  };
};

const THEMES: { theme: Theme; radius: number }[] = [
  { theme: observatory, radius: 4.2 },
  { theme: university, radius: 4.6 },
  { theme: projects, radius: 2.6 },
  { theme: servers, radius: 3.6 },
  { theme: tower, radius: 3.6 },
];

export function buildIsland(index: number, x: number, z: number, small: boolean): Island {
  const group = new Group();
  group.position.set(x, ISLAND_Y, z);
  const { theme, radius } = THEMES[index];
  const top: Object3D = rockBase(radius);
  group.add(top);
  const animate = theme(top as Group, small);
  const beacon = beaconParts(index % 2 === 0 ? CYAN : VIOLET);
  group.add(beacon.g);
  // Gentle bob so the islands feel afloat
  const baseY = ISLAND_Y, phase = index * 1.3;
  return {
    group,
    crystalY: ISLAND_Y + CRYSTAL_LOCAL,
    markVisited: beacon.markVisited,
    arrive: beacon.arrive,
    update: (t, dt) => {
      group.position.y = baseY + Math.sin(t * 0.5 + phase) * 0.25;
      animate(t, dt);
      beacon.update(t, dt, index);
    },
  };
}
