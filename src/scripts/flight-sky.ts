// Daytime sky for the home flight: physical atmosphere (three's Sky) with a sun, a sunlit sea of
// clouds with gaps down to the ocean, and fluffy cumulus around the route.
import {
  CanvasTexture,
  Color,
  FogExp2,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/** Sun from the right and a little behind the camera, so the plane and islands are lit */
export const SUN_DIR = new Vector3(0.78, 0.36, 0.5).normalize();
/** Horizon haze: fog and far clouds fade to this */
export const HAZE = new Color('#e3ecf6');

/** Fluffy cumulus: overlapping soft blobs, flat base, bluish shade underneath */
function cumulusTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const base = 196;
  for (let i = 0; i < 26; i++) {
    const x = 44 + Math.random() * 168;
    const lift = Math.random() * Math.random() * 120; // most blobs near the base, a few towering
    const y = base - 18 - lift;
    const r = (24 + Math.random() * 34) * (1 - lift / 300);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  // Flat-ish base
  g.globalCompositeOperation = 'destination-out';
  const cut = g.createLinearGradient(0, base - 14, 0, base + 18);
  cut.addColorStop(0, 'rgba(0,0,0,0)');
  cut.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = cut;
  g.fillRect(0, 0, 256, 256);
  // Shade the underside
  g.globalCompositeOperation = 'source-atop';
  const shade = g.createLinearGradient(0, 60, 0, base);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(118,138,170,0.55)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

export interface SkyWorld {
  update: (t: number, camera: Vector3, focusX: number, focusZ: number) => void;
}

/**
 * @param corridor points the plane flies through; cumulus keep clear of them
 * @param islands island centres; cumulus keep clear of them too
 */
export function buildSky(scene: Scene, small: boolean, corridor: Vector3[], islands: [number, number][], still: boolean): SkyWorld {
  scene.fog = new FogExp2(HAZE, 0.0036);

  const sky = new Sky();
  sky.scale.setScalar(450);
  const su = sky.material.uniforms;
  su.turbidity.value = 2.4;
  su.rayleigh.value = 1.3;
  su.mieCoefficient.value = 0.004;
  su.mieDirectionalG.value = 0.86;
  su.sunPosition.value.copy(SUN_DIR);
  scene.add(sky);

  // Ocean far below, seen through gaps in the cloud deck (fog turns it to haze in the distance)
  const ocean = new Mesh(new PlaneGeometry(2400, 2400), new MeshBasicMaterial({ color: 0x2a5f8a }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -90;
  scene.add(ocean);

  // Sunlit sea of clouds: fbm coverage with a normal from the noise gradient for sun shading
  const deckMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    defines: { OCTAVES: small ? 3 : 4 },
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: SUN_DIR.clone() },
      uHaze: { value: HAZE.clone() },
      uCam: { value: new Vector3() },
    },
    vertexShader: 'varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform float uTime; uniform vec3 uSun; uniform vec3 uHaze; uniform vec3 uCam; varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec2 p = vWorld.xz * 0.022 + vec2(uTime * 0.008, uTime * 0.003);
        float n = fbm(p);
        float e = 0.035;
        vec3 nrm = normalize(vec3((n - fbm(p + vec2(e, 0.0))) * 22.0, 1.0, (n - fbm(p + vec2(0.0, e))) * 22.0));
        float cover = smoothstep(0.24, 0.44, n); // mostly cloud, with small clearings down to the ocean
        float lit = clamp(dot(nrm, uSun) * 0.55 + 0.5, 0.0, 1.0);
        vec3 c = mix(vec3(0.66, 0.72, 0.83), vec3(1.0, 0.99, 0.97), lit);
        c *= mix(0.9, 1.0, smoothstep(0.5, 0.78, n)); // thin edges a touch greyer
        float fog = 1.0 - exp(-distance(vWorld.xz, uCam.xz) * 0.0038);
        c = mix(c, uHaze, fog);
        gl_FragColor = vec4(c, mix(cover, 1.0, fog)); // far away the deck reads as solid haze
      }`,
  });
  const deck = new Mesh(new PlaneGeometry(1600, 1600, 1, 1), deckMat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -10;
  scene.add(deck);

  // Cumulus: clusters of billboards, kept out of the flight corridor and the islands
  const textures = [cumulusTexture(), cumulusTexture(), cumulusTexture()];
  const CLUSTERS = small ? 10 : 24;
  for (let n = 0, tries = 0; n < CLUSTERS && tries < 600; tries++) {
    const x = -150 + Math.random() * 300, z = -230 + Math.random() * 300;
    const high = Math.random() < 0.3;
    const y = high ? 18 + Math.random() * 16 : -9 + Math.random() * 7;
    const near = (px: number, pz: number, r: number) => Math.hypot(px - x, pz - z) < r;
    if (corridor.some((p) => near(p.x, p.z, 26))) continue; // clouds the plane would fly into
    if (islands.some(([ix, iz]) => near(ix, iz, 18))) continue;
    const size = 1 + Math.random() * 0.8;
    const puffs = small ? 4 : 7;
    for (let i = 0; i < puffs; i++) {
      const s = new Sprite(new SpriteMaterial({ map: textures[(n + i) % 3], color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false }));
      const w = (16 + Math.random() * 14) * size;
      s.scale.set(w, w, 1);
      s.position.set(x + (Math.random() - 0.5) * 22 * size, y + Math.random() * 5 * size, z + (Math.random() - 0.5) * 14 * size);
      scene.add(s);
    }
    n++;
  }

  return {
    update: (t, camera, focusX, focusZ) => {
      sky.position.copy(camera);
      deck.position.x = ocean.position.x = focusX;
      deck.position.z = ocean.position.z = focusZ;
      deckMat.uniforms.uTime.value = still ? 0 : t;
      deckMat.uniforms.uCam.value.copy(camera);
    },
  };
}
