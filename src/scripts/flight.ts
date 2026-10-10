// Flight background for the home page: GE-01, a biplane, flies a daytime sky above a sea of clouds,
// along a route through five themed floating islands (one per section). Scroll drives the route: setProgress(u) with u in [0, islands]
// (0 = launch pad, k = parked at island k). "Free flight" hands the plane to the visitor
// (WASD / arrows / hold-and-drag) and blends back to the route on exit.
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DirectionalLight,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { buildIsland, buildPlane, loadBiplane, type Plane } from './flight-models';
import { SUN_DIR, buildSky } from './flight-sky';

export interface FlightOptions {
  labels: string[];
  reduceMotion: boolean;
  minimap?: HTMLCanvasElement | null;
  labelHost?: HTMLElement | null;
  /** Arrived at island `index` (0-based) */
  onVisit?: (index: number, firstTime: boolean) => void;
  /** Left route stop `stop` heading forward (0 = launch pad, k = island k) */
  onDepart?: (stop: number) => void;
  onNear?: (index: number | null) => void;
  onFreeChange?: (free: boolean) => void;
  /** 0..1 every frame, for the engine sound */
  onSpeed?: (speed: number) => void;
}

export interface FlightHandle {
  setProgress: (u: number) => void;
  /** Where on screen the plane should sit (0..1 of the viewport), e.g. the largest gap between page panels */
  setFocus: (x: number, y: number) => void;
  setFree: (on: boolean) => void;
  destroy: () => void;
}

interface Pose { x: number; z: number; yaw: number }

const ALT = 2.2;

// Islands on a gentle S-curve; the plane parks PARK units in front (south) of each one
const POSITIONS: [number, number][] = [[0, -16], [-26, -44], [20, -68], [-16, -96], [24, -120]];
const LAUNCH: [number, number] = [6, 22];
const PARK = 15;

const lerpAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createFlight(host: HTMLElement, opts: FlightOptions): FlightHandle | null {
  const small = window.innerWidth < 768;
  const still = opts.reduceMotion;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: !small, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  let dpr = Math.min(window.devicePixelRatio, small ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0xcfe0f1, 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  host.appendChild(renderer.domElement);
  const el = renderer.domElement;

  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 600);
  scene.add(camera); // speed lines ride along as a child of the camera

  scene.add(new HemisphereLight(0xcfe3ff, 0x7d8a99, 1.3));
  const sun = new DirectionalLight(0xfff1dc, 3.2);
  sun.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(sun);

  // Route: launch pad → parking spot in front of each island
  const route = new CatmullRomCurve3(
    [LAUNCH, ...POSITIONS.map(([x, z]) => [x, z + PARK] as [number, number])].map(([x, z]) => new Vector3(x, ALT, z)),
    false,
    'centripetal',
  );
  const STOPS = POSITIONS.length;
  const routeGeo = new BufferGeometry().setFromPoints(route.getPoints(160).map((p) => p.setY(ALT - 1.4)));
  scene.add(new Points(routeGeo, new PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.55, toneMapped: false })));

  // Daytime sky, cloud deck and cumulus (kept out of the corridor the plane flies through)
  const skyWorld = buildSky(scene, small, route.getPoints(80), POSITIONS, still);

  // GE-01: the biplane model; until it loads (or if it fails) nothing flies, then the fallback plane
  let plane: Plane = buildPlane();
  let ship = plane.group;
  ship.visible = false;
  let planeReady = false; // the model (or the fallback) is in; visibility is then decided per frame
  scene.add(ship);
  const swapPlane = (next: Plane) => {
    next.group.position.copy(ship.position);
    next.group.rotation.copy(ship.rotation);
    scene.remove(ship);
    plane = next;
    ship = next.group;
    scene.add(ship);
    trails.forEach((tr, i) => { tr.tip = next.wingtips[i]; tr.primed = false; });
    planeReady = true;
  };
  loadBiplane('/models/avion.glb')
    .then(swapPlane)
    .catch((err) => {
      console.warn('[flight] biplane model failed, using the built-in plane:', err);
      planeReady = true;
    });

  // Wingtip contrails: white, fading out along the trail
  const TRAIL = 70;
  const trails = plane.wingtips.map((tip) => {
    const pos = new Float32Array(TRAIL * 3);
    const col = new Float32Array(TRAIL * 4);
    for (let i = 0; i < TRAIL; i++) col.set([1, 1, 1, 0.7 * (1 - i / TRAIL)], i * 4);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('color', new BufferAttribute(col, 4));
    const line = new Line(geo, new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
    line.frustumCulled = false;
    scene.add(line);
    return { tip, pos, geo, line, primed: false };
  });

  // Speed lines in camera space, shown on long trips
  const STREAKS = small ? 50 : 110;
  const streakPos = new Float32Array(STREAKS * 6);
  const streakSeed = Array.from({ length: STREAKS }, () => ({ x: 0, y: 0, z: 0 }));
  const seedStreak = (s: { x: number; y: number; z: number }, anywhere: boolean) => {
    do {
      s.x = (Math.random() * 2 - 1) * 14;
      s.y = (Math.random() * 2 - 1) * 8;
    } while (Math.abs(s.x) < 3.5 && Math.abs(s.y) < 3); // keep the plane clear
    s.z = anywhere ? -4 - Math.random() * 56 : -60;
  };
  streakSeed.forEach((s) => seedStreak(s, true));
  const streakGeo = new BufferGeometry();
  streakGeo.setAttribute('position', new BufferAttribute(streakPos, 3));
  const streakMat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const streaks = new LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false;
  streaks.visible = false;
  camera.add(streaks);

  // Islands, each with a floating DOM label
  const islands = POSITIONS.map(([x, z], i) => {
    const island = buildIsland(i, x, z, small);
    scene.add(island.group);
    const label = document.createElement('span');
    label.className = 'beacon-label';
    label.textContent = `${String(i + 1).padStart(2, '0')} · ${opts.labels[i] ?? ''}`;
    opts.labelHost?.appendChild(label);
    return { ...island, label, visited: false };
  });

  // ---- Route pose ----
  const tmpP = new Vector3();
  const tmpT = new Vector3();
  const routePose = (u: number, out: Pose) => {
    const t = clamp01(u / STOPS);
    route.getPoint(t, tmpP);
    route.getTangent(t, tmpT);
    out.x = tmpP.x;
    out.z = tmpP.z;
    out.yaw = Math.atan2(-tmpT.x, -tmpT.z);
    // Near an island, turn to face it (it sits straight ahead, so yaw 0)
    const k = Math.round(u);
    if (k >= 1) out.yaw = lerpAngle(out.yaw, 0, clamp01(1 - Math.abs(u - k) * 3));
    return out;
  };

  // ---- State ----
  let target = 0; // from scroll
  let uVel = 0; // route speed, islands per second
  let u = 0; // smoothed route position
  let free = false;
  let blend = 0; // 1 = free pose, 0 = route pose
  const freeState = { x: 0, z: 0, yaw: 0, v: 0 };
  const from: Pose = { x: 0, z: 0, yaw: 0 };
  const rp: Pose = { x: 0, z: 0, yaw: 0 };
  const pose: Pose = { x: 0, z: 0, yaw: 0 };
  let focusX = 0.5, focusY = 0.7; // target screen spot for the plane, from the page layout
  let offX = 0, offY = 0; // current view offset in pixels
  let bank = 0;
  routePose(0, pose);
  let lastYaw = pose.yaw;
  let parkedAt = 0; // route stop the plane last rested at (-1 = in transit)
  let rollT = -1, rollDir = 1; // barrel roll on take-off
  let parkT = 0, orbitAmt = 0; // slow camera orbit while parked
  let baseFov = 55, fovNow = 55;

  // ---- Input (free flight only) ----
  const keys = new Set<string>();
  let dragging = false, dragX = 0, steer = 0;
  const FLIGHT_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const setFree = (on: boolean) => {
    if (free === on) return;
    free = on;
    keys.clear();
    dragging = false;
    steer = 0;
    if (on) {
      Object.assign(freeState, { x: pose.x, z: pose.z, yaw: pose.yaw, v: 0 });
      blend = 1;
    } else {
      Object.assign(from, { x: freeState.x, z: freeState.z, yaw: freeState.yaw });
      if (still) blend = 0;
      opts.onNear?.(null);
    }
    el.style.pointerEvents = on ? 'auto' : 'none';
    opts.onFreeChange?.(on);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!free) return;
    if (e.code === 'Escape') return setFree(false);
    if (!FLIGHT_KEYS.includes(e.code)) return;
    e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onPointerDown = (e: PointerEvent) => { dragging = true; dragX = e.clientX; };
  const onPointerMove = (e: PointerEvent) => { if (dragging) steer = Math.max(-1, Math.min(1, (e.clientX - dragX) / 120)); };
  const onPointerUp = () => { dragging = false; steer = 0; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  el.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  el.style.pointerEvents = 'none';
  el.style.touchAction = 'none';

  // ---- Layout ----
  let vw = 1, vh = 1;
  const resize = () => {
    // The host is display:none until the page confirms WebGL works; a 0×0 size would make the
    // aspect ratio NaN and poison the projection, so wait for a real size
    if (!host.clientWidth || !host.clientHeight) return;
    vw = host.clientWidth;
    vh = host.clientHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    baseFov = vw < vh ? 68 : 55;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  fovNow = baseFov;

  // ---- Minimap (plane always points up) ----
  const mm = opts.minimap?.getContext('2d') ?? null;
  const drawMinimap = (focus: number) => {
    if (!mm || !opts.minimap) return;
    const s = opts.minimap.width, r = s / 2, scale = r / 70;
    mm.clearRect(0, 0, s, s);
    mm.strokeStyle = 'rgba(255,255,255,0.08)';
    [r * 0.33, r * 0.66, r - 1].forEach((rad) => { mm.beginPath(); mm.arc(r, r, rad, 0, Math.PI * 2); mm.stroke(); });
    const cos = Math.cos(-pose.yaw), sin = Math.sin(-pose.yaw);
    islands.forEach((m, i) => {
      const dx = POSITIONS[i][0] - pose.x, dz = POSITIONS[i][1] - pose.z;
      let px = (dx * cos - dz * sin) * scale, py = (dx * sin + dz * cos) * scale;
      const d = Math.hypot(px, py);
      if (d > r - 6) { px *= (r - 6) / d; py *= (r - 6) / d; }
      mm.fillStyle = m.visited ? '#4ade80' : i % 2 === 0 ? '#00f0ff' : '#b07cff';
      mm.beginPath(); mm.arc(r + px, r + py, i === focus ? 5 : 3.5, 0, Math.PI * 2); mm.fill();
    });
    mm.fillStyle = '#f1f5f9';
    mm.beginPath(); mm.moveTo(r, r - 7); mm.lineTo(r + 5, r + 5); mm.lineTo(r, r + 2); mm.lineTo(r - 5, r + 5); mm.closePath(); mm.fill();
  };

  // ---- Visits ----
  let current = -1;
  const visit = (i: number) => {
    if (i === current) return;
    current = i;
    if (i < 0) return;
    const m = islands[i];
    const first = !m.visited;
    if (first) {
      m.visited = true;
      m.markVisited();
    }
    if (!still) m.arrive();
    opts.onVisit?.(i, first);
  };

  // ---- Simulation ----
  const camPos = new Vector3();
  const camLook = new Vector3();
  const tmpV = new Vector3();
  const tmpL = new Vector3();
  let near: number | null = null;
  let firstFrame = true;

  const step = (dt: number, t: number) => {
    // Route position follows the scroll with a critically damped spring (smooth, no overshoot)
    if (still) u = Math.round(target);
    else {
      const smooth = 0.55, omega = 2 / smooth, x = omega * dt;
      const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const maxChange = 1.5 * smooth; // top speed ≈ 1.5 islands/s, so long jumps still show the trip
      const change = Math.max(-maxChange, Math.min(maxChange, u - target));
      const goal = u - change;
      const temp = (uVel + omega * change) * dt;
      uVel = (uVel - omega * temp) * decay;
      let next = goal + (change + temp) * decay;
      if ((target - u > 0) === (next > target)) { next = target; uVel = 0; } // never overshoot
      u = next;
    }
    routePose(u, rp);

    // Take-off: leaving a stop forward triggers a barrel roll (and the whoosh)
    const k = Math.round(u);
    if (!free) {
      if (Math.abs(u - k) < 0.12 && Math.abs(uVel) < 0.2) parkedAt = k;
      else if (parkedAt >= 0 && u > parkedAt + 0.3 && uVel > 0.25) {
        opts.onDepart?.(parkedAt);
        if (!still) { rollT = 0; rollDir = parkedAt % 2 === 0 ? 1 : -1; }
        parkedAt = -1;
      }
    }

    let speed: number;
    if (free) {
      const fwd = keys.has('KeyW') || keys.has('ArrowUp') || dragging;
      const back = keys.has('KeyS') || keys.has('ArrowDown');
      const thrust = fwd ? 26 : back ? -18 : -freeState.v * 1.2;
      const turn = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - steer;
      freeState.v = Math.max(-8, Math.min(32, freeState.v + thrust * dt));
      freeState.yaw += turn * 1.7 * dt * Math.min(1, 0.3 + Math.abs(freeState.v) / 10);
      freeState.x -= Math.sin(freeState.yaw) * freeState.v * dt;
      freeState.z -= Math.cos(freeState.yaw) * freeState.v * dt;
      // Soft boundary: drift back toward the course
      const cx = freeState.x, cz = freeState.z + 60, out = Math.hypot(cx, cz) - 130;
      if (out > 0) { freeState.x -= (cx / (out + 130)) * out * dt; freeState.z -= (cz / (out + 130)) * out * dt; }
      Object.assign(pose, { x: freeState.x, z: freeState.z, yaw: freeState.yaw });
      speed = Math.abs(freeState.v) / 32;
    } else {
      blend = Math.max(0, blend - dt * 1.2);
      const b = blend * blend * (3 - 2 * blend);
      pose.x = rp.x + (from.x - rp.x) * b;
      pose.z = rp.z + (from.z - rp.z) * b;
      pose.yaw = lerpAngle(rp.yaw, from.yaw, b);
      speed = Math.min(1, Math.abs(uVel) * 0.8) + blend * 0.4;
    }
    speed = Math.min(speed, 1);
    opts.onSpeed?.(speed);

    const yawRate = Math.atan2(Math.sin(pose.yaw - lastYaw), Math.cos(pose.yaw - lastYaw)) / Math.max(dt, 1e-3);
    lastYaw = pose.yaw;
    bank += (Math.max(-0.5, Math.min(0.5, yawRate * 0.3)) - bank) * Math.min(dt * 3, 1);
    let roll = 0;
    if (rollT >= 0) {
      rollT += dt / 1.1;
      if (rollT >= 1) rollT = -1;
      else roll = easeInOut(rollT) * Math.PI * 2 * rollDir;
    }
    ship.position.set(pose.x, ALT + (still ? 0 : Math.sin(t * 1.6) * 0.15), pose.z);
    ship.rotation.set(0, pose.yaw, bank + roll, 'YXZ');
    plane.update(t, dt, speed);
    ship.visible = planeReady;
    trails.forEach((tr) => { tr.line.visible = planeReady; });

    trails.forEach((tr) => {
      tmpV.copy(tr.tip).applyEuler(ship.rotation).add(ship.position);
      if (!tr.primed) { for (let i = 0; i < TRAIL; i++) tr.pos.set([tmpV.x, tmpV.y, tmpV.z], i * 3); tr.primed = true; }
      tr.pos.copyWithin(3, 0, (TRAIL - 1) * 3);
      tr.pos.set([tmpV.x, tmpV.y, tmpV.z], 0);
      (tr.geo.attributes.position as BufferAttribute).needsUpdate = true;
    });

    // Islands: idle animation + nearest one
    let nearest = -1, nearestD = Infinity;
    islands.forEach((m, i) => {
      m.update(still ? 0 : t, dt);
      const d = Math.hypot(POSITIONS[i][0] - pose.x, POSITIONS[i][1] - pose.z);
      if (d < nearestD) { nearestD = d; nearest = i; }
    });

    // Visits: on the route when parked at an island; in free flight when close to one
    if (free) {
      if (nearestD < 18) visit(nearest);
      else if (nearestD > 26) visit(-1);
      const n = nearestD < 18 ? nearest : null;
      if (n !== near) { near = n; opts.onNear?.(n); }
    } else {
      visit(k >= 1 && Math.abs(u - k) < 0.25 ? k - 1 : -1);
    }

    // Camera: chase from behind, pulled back while moving; drifts around the island while parked
    const parked = !free && !still && k >= 1 && Math.abs(u - k) < 0.2 && Math.abs(uVel) < 0.15;
    parkT = parked ? parkT + dt : 0;
    orbitAmt += ((parked ? 1 : 0) - orbitAmt) * Math.min(1, dt * 0.8);
    const orbit = Math.sin(parkT * 0.22) * 0.4 * orbitAmt;
    const back = 14 + speed * 4, up = 6.5 + speed * 2.5, cyaw = pose.yaw + orbit;
    tmpV.set(Math.sin(cyaw) * back, up, Math.cos(cyaw) * back).add(ship.position);
    tmpL.set(-Math.sin(pose.yaw) * 12, 3, -Math.cos(pose.yaw) * 12).add(ship.position);
    const kCam = still || firstFrame ? 1 : 1 - Math.pow(0.02, dt);
    firstFrame = false;
    camPos.lerp(tmpV, kCam);
    camLook.lerp(tmpL, kCam);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    skyWorld.update(t, camera.position, pose.x, pose.z);

    // Speed: lines streak past and the field of view widens a little
    const rush = still ? 0 : clamp01((speed - 0.5) * 2);
    fovNow += (baseFov + rush * 8 - fovNow) * Math.min(1, dt * 3);
    camera.fov = fovNow;
    streakMat.opacity = rush * 0.4;
    streaks.visible = rush > 0.02;
    if (streaks.visible) {
      const len = 2 + rush * 7;
      streakSeed.forEach((s, i) => {
        s.z += (30 + rush * 90) * dt;
        if (s.z > -3) seedStreak(s, false);
        streakPos.set([s.x, s.y, s.z, s.x, s.y, s.z - len], i * 6);
      });
      (streakGeo.attributes.position as BufferAttribute).needsUpdate = true;
    }

    // Keep the plane in the clear: shift the picture (view offset) so the plane lands on the focus
    // spot the page picked between its panels. The offset only translates the image,
    // so the un-shifted position is the projected one plus last frame's offset.
    camera.updateMatrixWorld();
    tmpV.copy(ship.position).project(camera);
    const natX = ((tmpV.x + 1) / 2) * vw + offX, natY = ((1 - tmpV.y) / 2) * vh + offY;
    // Small clamps: the island ahead of the plane must stay on screen too
    const wantX = free ? 0 : Math.max(-vw * 0.3, Math.min(vw * 0.3, natX - focusX * vw));
    const wantY = free ? 0 : Math.max(-vh * 0.18, Math.min(vh * 0.18, natY - focusY * vh));
    const kOff = still ? 1 : 1 - Math.pow(0.04, dt);
    offX += (wantX - offX) * kOff;
    offY += (wantY - offY) * kOff;
    if (!Number.isFinite(offX) || !Number.isFinite(offY)) offX = offY = 0; // never let a bad frame stick
    camera.setViewOffset(vw, vh, offX, offY, vw, vh); // also refreshes the projection (fov)

    return nearest;
  };

  // Island labels projected onto the page. On the route only the island ahead is labelled
  // (they line up from the plane's point of view and would overlap); free flight labels them all.
  const labelFor = () => {
    const k = Math.round(u);
    const parked = k >= 1 && Math.abs(u - k) < 0.25;
    return parked ? k : Math.max(0, Math.ceil(u) - 1);
  };
  const placeLabels = () => {
    if (!opts.labelHost) return;
    // Phones: the panels already name each island, so labels only show in free flight
    const only = free ? -1 : vw < 768 ? -2 : labelFor();
    islands.forEach((m, i) => {
      const wanted = only === -1 || only === i;
      if (wanted) tmpV.set(m.group.position.x, m.crystalY + 2.8, m.group.position.z).project(camera);
      const show = wanted && tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
      const op = show ? '1' : '0';
      if (m.label.style.opacity !== op) m.label.style.opacity = op;
      if (!show) return;
      m.label.style.transform = `translate(${(((tmpV.x + 1) / 2) * vw).toFixed(1)}px, ${(((1 - tmpV.y) / 2) * vh).toFixed(1)}px) translate(-50%, -100%)`;
      m.label.classList.toggle('is-visited', m.visited);
    });
  };

  // ---- Adaptive quality: if frames stay slow, lower the resolution ----
  let sampleT = 0, sampleN = 0, warmup = 1.5;
  const adapt = (dt: number) => {
    if (warmup > 0) { warmup -= dt; return; } // ignore the first frames (shader compiles, layout)
    sampleT += dt;
    sampleN++;
    if (sampleT < 2) return;
    const slow = sampleT / sampleN > 1 / 45;
    sampleT = sampleN = 0;
    if (!slow) return;
    if (dpr > 0.8) {
      dpr = Math.max(0.75, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      resize();
    }
  };

  // Dev-only handle for inspecting the scene from the console
  if (import.meta.env.DEV) {
    (window as unknown as { __flight: unknown }).__flight = { camera, ship, scene, renderer, state: () => ({ u, target, offX, offY, focusX, focusY, vw, vh, pose: { ...pose }, cam: camera.position.toArray() }) };
  }

  // Compile every shader up front so the first scroll doesn't hitch
  renderer.compile(scene, camera);

  // ---- Loop (paused while the tab is hidden) ----
  let raf = 0, last = performance.now(), t = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    try {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      const focus = step(dt, t);
      placeLabels();
      if (free) drawMinimap(focus); // the radar is only on screen in free flight
      renderer.render(scene, camera);
      adapt(dt);
    } catch (err) {
      cancelAnimationFrame(raf); // stop instead of throwing every frame
      console.error('[flight] stopped:', err);
    }
  };
  const start = () => {
    cancelAnimationFrame(raf);
    if (document.hidden) return;
    last = performance.now();
    sampleT = sampleN = 0; // a background tab's long frame shouldn't count as slow
    raf = requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', start);
  start();

  return {
    setProgress: (value: number) => { target = Math.max(0, Math.min(STOPS, value)); },
    setFocus: (x: number, y: number) => { focusX = x; focusY = y; },
    setFree,
    destroy: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', start);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      islands.forEach((m) => m.label.remove());
      renderer.dispose();
      el.remove();
    },
  };
}
