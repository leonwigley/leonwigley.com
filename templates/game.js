import * as THREE from 'three';
import { PointerLockControls } from 'PointerLockControls';

const rapierModule = await import('https://cdn.skypack.dev/@dimforge/rapier3d-compat?min');
const Rapier = rapierModule.default ?? rapierModule;
await Rapier.init({});

const canvas = document.querySelector('#game-canvas');
if (!canvas) {
  throw new Error('Missing canvas element');
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7fb1d9);
scene.fog = new THREE.FogExp2(0x6b9ac3, 0.012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
const controls = new PointerLockControls(camera, canvas);

const VOXEL_SIZE = 0.5;
const CHUNK_SIZE = 220;
const HEIGHT_LOD = 1;
const COLLIDER_STEP = 3;
const FREQUENCY = 0.09;
const STEP_HEIGHT = VOXEL_SIZE * 1.75;
const SEA_LEVEL = VOXEL_SIZE * 0.9;
const WALK_SPEED = 4.2;
const NOCLIP_SPEED = 14;
const JUMP_FORCE = 11.5;
const WORLD_GRAVITY = 32;
const ALTITUDE_SCALE = VOXEL_SIZE * 110;
const GROUND_ACCEL = 110;
const AIR_ACCEL = 16;
const AIR_SPEED_CAP = 6.2;
const FRICTION = 12;
const CROUCH_SPEED_FACTOR = 0.52;
const CROUCH_CAMERA_OFFSET = VOXEL_SIZE * 0.55;
const HEAD_BOB_INTENSITY = 0.04;
const HEAD_BOB_SPEED = 7.5;
const SNIPER_COOLDOWN = 1.15;
const SNIPER_MAX_DISTANCE = 800;
const SNIPER_RAY_STEP = VOXEL_SIZE * 0.5;
const TRACER_LIFETIME = 0.18;
const IMPACT_LIFETIME = 0.35;
const MUZZLE_KICK = 0.01;

const infoBar = document.createElement('div');
infoBar.textContent = 'Click to enter · WASD move · Space jump · Shift descend · N noclip';
Object.assign(infoBar.style, {
  position: 'fixed',
  top: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 12px',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '13px',
  borderRadius: '6px',
  zIndex: '20',
  pointerEvents: 'none',
});
document.body.appendChild(infoBar);
setTimeout(() => {
  infoBar.style.display = 'none';
}, 10000);

const modeBadge = document.createElement('div');
modeBadge.textContent = 'NOCLIP: ON';
Object.assign(modeBadge.style, {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '4px 10px',
  background: 'rgba(0,0,0,0.4)',
  color: '#b0ffa5',
  fontFamily: 'monospace',
  fontSize: '12px',
  borderRadius: '6px',
  pointerEvents: 'none',
  display: 'none',
});
document.body.appendChild(modeBadge);

const fpsCounter = document.createElement('div');
Object.assign(fpsCounter.style, {
  position: 'fixed',
  top: '16px',
  left: '16px',
  padding: '4px 10px',
  background: 'rgba(0,0,0,0.4)',
  color: '#9fe5ff',
  fontFamily: 'monospace',
  fontSize: '12px',
  borderRadius: '6px',
  pointerEvents: 'none',
  zIndex: '20',
});
fpsCounter.textContent = 'FPS: --';
document.body.appendChild(fpsCounter);

const crosshair = document.createElement('div');
Object.assign(crosshair.style, {
  position: 'fixed',
  top: '50%',
  left: '50%',
  width: '16px',
  height: '16px',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  zIndex: '10',
  display: 'none',
});
crosshair.innerHTML = '<div style="position:absolute;left:50%;top:0;width:2px;height:100%;background:#dff8ff;transform:translateX(-50%);"></div><div style="position:absolute;top:50%;left:0;height:2px;width:100%;background:#dff8ff;transform:translateY(-50%);"></div>';
document.body.appendChild(crosshair);

const loadingOverlay = document.createElement('div');
const loadingPanel = document.createElement('div');
const loadingText = document.createElement('span');
const loadingBar = document.createElement('div');
const loadingFill = document.createElement('div');
const enterButton = document.createElement('button');

Object.assign(loadingOverlay.style, {
  position: 'fixed',
  inset: '0',
  background: 'rgba(8, 12, 20, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '50',
  transition: 'opacity 0.4s ease',
});

Object.assign(loadingPanel.style, {
  minWidth: '260px',
  padding: '24px',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  color: '#d1e7ff',
  fontFamily: 'monospace',
  fontSize: '13px',
  letterSpacing: '0.05em',
});

Object.assign(loadingBar.style, {
  position: 'relative',
  width: '100%',
  height: '6px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.1)',
  overflow: 'hidden',
});

Object.assign(loadingFill.style, {
  position: 'absolute',
  inset: '0',
  width: '0%',
  background: 'linear-gradient(90deg,#7bd5ff,#2fb9ff)',
  borderRadius: '999px',
  transition: 'width 0.2s ease',
});

loadingText.textContent = 'Preparing renderer...';
loadingBar.appendChild(loadingFill);
loadingPanel.appendChild(loadingText);
loadingPanel.appendChild(loadingBar);
Object.assign(enterButton.style, {
  padding: '10px 18px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: '#d1e7ff',
  fontFamily: 'monospace',
  fontSize: '13px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  transition: 'background 0.2s ease, color 0.2s ease',
});
enterButton.textContent = 'Loading...';
enterButton.disabled = true;
enterButton.addEventListener('click', () => {
  if (enterButton.disabled) return;
  controls.lock();
  finishLoading();
});
loadingPanel.appendChild(enterButton);
loadingOverlay.appendChild(loadingPanel);
document.body.appendChild(loadingOverlay);

function setLoading(progress, label) {
  loadingFill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
  if (label) {
    loadingText.textContent = label;
  }
}

function finishLoading() {
  loadingOverlay.style.pointerEvents = 'none';
  loadingOverlay.style.opacity = '0';
  setTimeout(() => loadingOverlay.remove(), 450);
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const tracerLines = [];
const projectileTracers = [];
const impactSprites = [];
const muzzleFlashes = [];
const sniperState = { lastShot: -Infinity };
const fireDirection = new THREE.Vector3();
const hitPoint = new THREE.Vector3();
const muzzleOffset = new THREE.Vector3(0, VOXEL_SIZE * 0.4, 0);
const tracerBaseMaterial = new THREE.LineBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.95 });
const projectileGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
const impactGeometry = new THREE.SphereGeometry(0.12, 8, 8);
const impactMaterial = new THREE.MeshBasicMaterial({ color: 0xffc48a, transparent: true, opacity: 0.9 });
const muzzleGeometry = new THREE.SphereGeometry(0.1, 6, 6);
const muzzleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

canvas.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => {
  infoBar.style.display = 'none';
  crosshair.style.display = 'block';
});
controls.addEventListener('unlock', () => {
  infoBar.style.display = 'block';
  crosshair.style.display = 'none';
});

scene.add(new THREE.AmbientLight(0xfff5de, 0.85));
const sun = new THREE.DirectionalLight(0xfff0c0, 1.35);
sun.position.set(-160, 220, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 500;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x354534, 0.35));

function heightAt(x, z) {
  const worldX = (x - CHUNK_SIZE / 2) / (CHUNK_SIZE / 2);
  const worldZ = (z - CHUNK_SIZE / 2) / (CHUNK_SIZE / 2);
  const radial = Math.sqrt(worldX * worldX + worldZ * worldZ);
  const coastFade = Math.max(0, radial - 0.6) * 60;
  const base =
    6 +
    Math.sin(x * FREQUENCY * 0.12) * 12 +
    Math.cos(z * FREQUENCY * 0.12) * 10 +
    Math.sin((x + z) * FREQUENCY * 0.08) * 7;
  const ridges = Math.pow(Math.sin(worldX * 5.0) + Math.cos(worldZ * 4.6), 3) * 32;
  const dunes = Math.sin(x * FREQUENCY * 0.4) * Math.sin(z * FREQUENCY * 0.35) * 8;
  const cliffs = Math.max(0, Math.sin(x * FREQUENCY * 0.3) * Math.sin(z * FREQUENCY * 0.3)) * 18;
  const river = Math.max(0, 0.05 - Math.abs(Math.sin(worldX * 2.1) * 0.3 + worldZ)) * 40;
  const height = base + ridges + dunes + cliffs - coastFade - river;
  return Math.max(0.5, height);
}

const heightField = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);
const biomeGrid = new Array(CHUNK_SIZE * CHUNK_SIZE);

function biomeAt(x, z) {
  const nx = x / CHUNK_SIZE;
  const nz = z / CHUNK_SIZE;
  const humidity = 0.5 + 0.5 * Math.sin((nx + nz * 0.7) * 6.3 + Math.cos(nz * 4.2));
  const temperature = 0.5 + 0.5 * Math.sin(nx * 5.1 - nz * 3.3);
  let type = 'forest';
  if (temperature < 0.25) {
    type = 'tundra';
  } else if (humidity < 0.35 && temperature > 0.6) {
    type = 'desert';
  } else if (humidity > 0.75) {
    type = 'swamp';
  } else if (temperature > 0.7 && humidity < 0.6) {
    type = 'savanna';
  }
  return { type, humidity, temperature };
}

async function buildLandscape(size, onProgress) {
  let best = { x: Math.floor(size / 2), z: Math.floor(size / 2), height: -Infinity };
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const columnHeight = heightAt(x, z);
      const worldHeight = columnHeight * VOXEL_SIZE;
      heightField[z * size + x] = worldHeight;
      if (worldHeight > SEA_LEVEL + VOXEL_SIZE * 12 && worldHeight > best.height) {
        best = { x, z, height: worldHeight };
      }
      const biome = biomeAt(x, z);
      biomeGrid[z * size + x] = biome;
    }
    if (onProgress && x % 4 === 0) {
      onProgress((x + 1) / size);
      await nextFrame();
    }
  }
  if (best.height === -Infinity) {
    const cx = Math.floor(size / 2);
    const cz = Math.floor(size / 2);
    best = { x: cx, z: cz, height: heightField[cz * size + cx] };
  }
  return { spawnColumn: best };
}

function pickSpawnColumn(fallback) {
  for (let i = 0; i < 500; i++) {
    const x = Math.floor(Math.random() * CHUNK_SIZE);
    const z = Math.floor(Math.random() * CHUNK_SIZE);
    const height = heightField[z * CHUNK_SIZE + x];
    if (height > SEA_LEVEL + VOXEL_SIZE * 1.5) {
      return { x, z, height };
    }
  }
  if (fallback) return fallback;
  const cx = Math.floor(CHUNK_SIZE / 2);
  const cz = Math.floor(CHUNK_SIZE / 2);
  return { x: cx, z: cz, height: heightField[cz * CHUNK_SIZE + cx] };
}

setLoading(0.05, 'Generating terrain...');
const { spawnColumn: fallbackSpawn } = await buildLandscape(
  CHUNK_SIZE,
  (progress) => setLoading(0.05 + progress * 0.35, 'Generating terrain...')
);
const spawnColumn = pickSpawnColumn(fallbackSpawn);

const span = CHUNK_SIZE * VOXEL_SIZE;
const terrainGeometry = new THREE.PlaneGeometry(span, span, CHUNK_SIZE - 1, CHUNK_SIZE - 1);
const positionAttr = terrainGeometry.attributes.position;
const terrainColors = new Float32Array(positionAttr.count * 3);
const terrainColor = new THREE.Color();

for (let z = 0; z < CHUNK_SIZE; z++) {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    const idx = z * CHUNK_SIZE + x;
    const height = heightField[idx];
    positionAttr.setZ(idx, height);
    const { type, humidity, temperature } = biomeGrid[idx];
    const altitude = height / ALTITUDE_SCALE;
    if (type === 'desert') {
      const dune = 0.85 + 0.15 * Math.sin((x + z) * 0.4);
      terrainColor.setRGB(0.78 * dune, 0.65 * dune, 0.42 * dune);
    } else if (type === 'savanna') {
      terrainColor.setRGB(0.56, 0.53, 0.26 + 0.12 * humidity);
    } else if (type === 'swamp') {
      terrainColor.setRGB(0.2, 0.33, 0.18 + 0.1 * humidity);
    } else if (type === 'tundra') {
      const snowMix = Math.min(1, 0.4 + (0.6 - temperature) * 2 + altitude);
      terrainColor.setRGB(0.82 + 0.18 * snowMix, 0.86 + 0.12 * snowMix, 0.9 + 0.08 * snowMix);
    } else if (altitude > 0.65) {
      const rocky = 0.4 + 0.4 * altitude;
      terrainColor.setRGB(0.48 + rocky * 0.2, 0.44 + rocky * 0.1, 0.4 + rocky * 0.12);
    } else {
      const lush = Math.max(0.3, 0.95 * humidity);
      terrainColor.setRGB(0.18 + lush * 0.32, 0.36 + lush * 0.42, 0.15 + lush * 0.2);
    }
    terrainColor.toArray(terrainColors, idx * 3);
  }
}

function sampleHeightBilinear(localX, localZ) {
  const x0 = Math.floor(localX);
  const x1 = Math.min(CHUNK_SIZE - 1, x0 + 1);
  const z0 = Math.floor(localZ);
  const z1 = Math.min(CHUNK_SIZE - 1, z0 + 1);
  const tx = Math.min(Math.max(localX - x0, 0), 1);
  const tz = Math.min(Math.max(localZ - z0, 0), 1);
  const h00 = heightField[z0 * CHUNK_SIZE + x0];
  const h10 = heightField[z0 * CHUNK_SIZE + x1];
  const h01 = heightField[z1 * CHUNK_SIZE + x0];
  const h11 = heightField[z1 * CHUNK_SIZE + x1];
  const hx0 = h00 * (1 - tx) + h10 * tx;
  const hx1 = h01 * (1 - tx) + h11 * tx;
  return hx0 * (1 - tz) + hx1 * tz;
}

function sampleTerrainHeightWorld(wx, wz) {
  const localX = wx / VOXEL_SIZE + CHUNK_SIZE / 2;
  const localZ = wz / VOXEL_SIZE + CHUNK_SIZE / 2;
  const clampedX = Math.min(Math.max(localX, 0), CHUNK_SIZE - 1);
  const clampedZ = Math.min(Math.max(localZ, 0), CHUNK_SIZE - 1);
  return sampleHeightBilinear(clampedX, clampedZ);
}

function raycastTerrain(origin, direction, maxDistance) {
  const step = SNIPER_RAY_STEP;
  const pos = new THREE.Vector3();
  let distance = 0;
  while (distance <= maxDistance) {
    pos.copy(direction).multiplyScalar(distance).add(origin);
    const surface = Math.max(sampleTerrainHeightWorld(pos.x, pos.z), SEA_LEVEL - 0.5);
    if (pos.y <= surface + 0.05) {
      pos.y = surface;
      return { point: pos.clone(), distance };
    }
    distance += step;
  }
  return { point: origin.clone().addScaledVector(direction, maxDistance), distance: maxDistance };
}

function spawnTracerLine(start, end) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
  const material = tracerBaseMaterial.clone();
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  tracerLines.push({ line, material, born: performance.now() * 0.001, lifetime: TRACER_LIFETIME });
}

function spawnProjectileTracer(start, dir, distance) {
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial.clone());
  mesh.position.copy(start);
  scene.add(mesh);
  projectileTracers.push({
    mesh,
    dir: dir.clone(),
    distance,
    traveled: 0,
    speed: 220,
  });
}

function spawnImpactFX(point) {
  const mesh = new THREE.Mesh(impactGeometry, impactMaterial.clone());
  mesh.position.copy(point);
  scene.add(mesh);
  impactSprites.push({ mesh, born: performance.now() * 0.001, lifetime: IMPACT_LIFETIME });
}

function spawnMuzzleFlash(origin) {
  const mesh = new THREE.Mesh(muzzleGeometry, muzzleMaterial.clone());
  mesh.position.copy(origin);
  scene.add(mesh);
  muzzleFlashes.push({ mesh, born: performance.now() * 0.001, lifetime: 0.12 });
}

function updateTracers(now) {
  for (let i = tracerLines.length - 1; i >= 0; i--) {
    const tracer = tracerLines[i];
    const t = (now - tracer.born) / tracer.lifetime;
    if (t >= 1) {
      scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      tracer.line.material.dispose();
      tracerLines.splice(i, 1);
    } else {
      tracer.material.opacity = 1 - t;
    }
  }
}

function updateProjectiles(delta) {
  for (let i = projectileTracers.length - 1; i >= 0; i--) {
    const proj = projectileTracers[i];
    const move = proj.speed * delta;
    proj.traveled += move;
    proj.mesh.position.addScaledVector(proj.dir, move);
    if (proj.traveled >= proj.distance) {
      scene.remove(proj.mesh);
      proj.mesh.geometry.dispose();
      proj.mesh.material.dispose();
      projectileTracers.splice(i, 1);
    }
  }
}

function updateImpacts(now) {
  for (let i = impactSprites.length - 1; i >= 0; i--) {
    const impact = impactSprites[i];
    const t = (now - impact.born) / impact.lifetime;
    if (t >= 1) {
      scene.remove(impact.mesh);
      impact.mesh.geometry.dispose();
      impact.mesh.material.dispose();
      impactSprites.splice(i, 1);
    } else {
      impact.mesh.material.opacity = 1 - t;
      const scale = 1 + t * 1.8;
      impact.mesh.scale.set(scale, scale, scale);
    }
  }
  for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
    const flash = muzzleFlashes[i];
    const t = (now - flash.born) / flash.lifetime;
    if (t >= 1) {
      scene.remove(flash.mesh);
      flash.mesh.geometry.dispose();
      flash.mesh.material.dispose();
      muzzleFlashes.splice(i, 1);
    } else {
      flash.mesh.material.opacity = 1 - t;
      const s = 1 + t * 2.5;
      flash.mesh.scale.set(s, s, s);
    }
  }
}

positionAttr.needsUpdate = true;
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
terrainGeometry.rotateX(-Math.PI / 2);
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.08 });
const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrainMesh.receiveShadow = true;
scene.add(terrainMesh);

const world = new Rapier.World({ x: 0, y: -WORLD_GRAVITY, z: 0 });

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(CHUNK_SIZE * VOXEL_SIZE * 4, CHUNK_SIZE * VOXEL_SIZE * 4),
  new THREE.MeshStandardMaterial({ color: 0x54664c, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -VOXEL_SIZE;
ground.receiveShadow = true;
scene.add(ground);

const waterGeometry = new THREE.PlaneGeometry(CHUNK_SIZE * VOXEL_SIZE * 4, CHUNK_SIZE * VOXEL_SIZE * 4, 220, 220);
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x246d8e,
  transparent: true,
  opacity: 0.7,
  roughness: 0.3,
  metalness: 0.3,
});
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.y = SEA_LEVEL;
scene.add(water);

const waterCollider = Rapier.ColliderDesc.cuboid(
  (CHUNK_SIZE * VOXEL_SIZE * 1.5),
  0.5,
  (CHUNK_SIZE * VOXEL_SIZE * 1.5)
).setTranslation(0, SEA_LEVEL - 0.5, 0);
world.createCollider(waterCollider, world.createRigidBody(Rapier.RigidBodyDesc.fixed()));

const pineGeometry = new THREE.ConeGeometry(VOXEL_SIZE * 1.4, VOXEL_SIZE * 8, 6);
const pineMaterial = new THREE.MeshStandardMaterial({ color: 0x1c3a24, flatShading: true });
const broadGeometry = new THREE.ConeGeometry(VOXEL_SIZE * 1.6, VOXEL_SIZE * 5.5, 6);
const broadMaterial = new THREE.MeshStandardMaterial({ color: 0x3d5e28, flatShading: true });
const swampGeometry = new THREE.ConeGeometry(VOXEL_SIZE * 1.2, VOXEL_SIZE * 4.5, 6);
const swampMaterial = new THREE.MeshStandardMaterial({ color: 0x20371f, flatShading: true });
const treeTrunkGeometry = new THREE.CylinderGeometry(VOXEL_SIZE * 0.35, VOXEL_SIZE * 0.5, VOXEL_SIZE * 3, 6);
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4b2d17, flatShading: true });
const shrubGeometry = new THREE.ConeGeometry(VOXEL_SIZE * 0.7, VOXEL_SIZE * 1.8, 5);
const shrubMaterial = new THREE.MeshStandardMaterial({ color: 0x2e4c27, flatShading: true });
const grassGeometry = new THREE.ConeGeometry(VOXEL_SIZE * 0.4, VOXEL_SIZE * 1.2, 4);
const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x4f7d3a, flatShading: true });

function scatterTrees(count) {
  const trees = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.8;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.8;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const columnHeight = heightAt(hx, hz);
    if (columnHeight < 22 || columnHeight > 120) continue;

    const biome = biomeAt(hx, hz);
    if (biome.type === 'desert') continue;

    let foliageGeo = pineGeometry;
    let foliageMat = pineMaterial;
    if (biome.type === 'savanna') {
      foliageGeo = broadGeometry;
      foliageMat = broadMaterial;
    } else if (biome.type === 'swamp') {
      foliageGeo = swampGeometry;
      foliageMat = swampMaterial;
    }

    const terrainHeight = columnHeight * VOXEL_SIZE;
    const trunk = new THREE.Mesh(treeTrunkGeometry, trunkMaterial);
    trunk.position.set(tx, terrainHeight + VOXEL_SIZE * 1.2, tz);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const crown = new THREE.Mesh(foliageGeo, foliageMat);
    crown.position.set(tx, terrainHeight + VOXEL_SIZE * 4.5, tz);
    crown.castShadow = true;
    crown.receiveShadow = true;

    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(crown);
    trees.add(tree);
  }
  return trees;
}

function scatterShrubs(count) {
  const shrubs = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.9;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.9;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const columnHeight = heightAt(hx, hz);
    if (columnHeight < 8) continue;
    const biome = biomeAt(hx, hz);
    if (biome.type === 'desert' && Math.random() > 0.2) continue;
    const h = columnHeight * VOXEL_SIZE;
    const useGrass = biome.type === 'savanna' || biome.type === 'forest' || biome.type === 'swamp';
    const mesh = new THREE.Mesh(useGrass ? grassGeometry : shrubGeometry, (useGrass ? grassMaterial : shrubMaterial).clone());
    mesh.position.set(tx, h + (useGrass ? VOXEL_SIZE * 0.3 : VOXEL_SIZE * 0.6), tz);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    shrubs.add(mesh);
  }
  return shrubs;
}

setLoading(0.6, 'Building terrain collider...');
async function buildCollider() {
  const colliderBody = world.createRigidBody(Rapier.RigidBodyDesc.fixed());
  const totalPatches = Math.ceil(CHUNK_SIZE / COLLIDER_STEP) ** 2;
  let processed = 0;
  for (let x = 0; x < CHUNK_SIZE; x += COLLIDER_STEP) {
    for (let z = 0; z < CHUNK_SIZE; z += COLLIDER_STEP) {
      let maxHeight = 0;
      const spanX = Math.min(COLLIDER_STEP, CHUNK_SIZE - x);
      const spanZ = Math.min(COLLIDER_STEP, CHUNK_SIZE - z);
      for (let dx = 0; dx < spanX; dx++) {
        for (let dz = 0; dz < spanZ; dz++) {
          const h = heightField[(z + dz) * CHUNK_SIZE + (x + dx)];
          if (h > maxHeight) maxHeight = h;
        }
      }
      if (maxHeight > 0.0) {
        const worldX = (x + spanX * 0.5 - CHUNK_SIZE / 2) * VOXEL_SIZE;
        const worldZ = (z + spanZ * 0.5 - CHUNK_SIZE / 2) * VOXEL_SIZE;
        const colliderDesc = Rapier.ColliderDesc.cuboid(
          (spanX * VOXEL_SIZE) / 2,
          maxHeight / 2,
          (spanZ * VOXEL_SIZE) / 2
        ).setTranslation(worldX, maxHeight / 2, worldZ);
        world.createCollider(colliderDesc, colliderBody);
      }
      processed++;
    }
    if (x % (COLLIDER_STEP * 4) === 0) {
      setLoading(0.6 + (processed / totalPatches) * 0.12, 'Building terrain collider...');
      await nextFrame();
    }
  }
}
await buildCollider();

setLoading(0.72, 'Planting biomes...');
const treeGroup = scatterTrees(480);
scene.add(treeGroup);
const shrubGroup = scatterShrubs(1100);
scene.add(shrubGroup);

setLoading(1, 'World ready');
enterButton.disabled = false;
enterButton.textContent = 'Enter World';
loadingText.textContent = 'Ready to explore';

const spawnHeight = spawnColumn.height + STEP_HEIGHT * 1.5;
const spawnX = (spawnColumn.x - CHUNK_SIZE / 2) * VOXEL_SIZE;
const spawnZ = (spawnColumn.z - CHUNK_SIZE / 2) * VOXEL_SIZE;

const playerBodyDesc = Rapier.RigidBodyDesc.dynamic()
  .setTranslation(spawnX, spawnHeight, spawnZ)
  .setLinearDamping(6)
  .setAngularDamping(6)
  .setCanSleep(false)
  .restrictRotations(true, true, true);
const playerBody = world.createRigidBody(playerBodyDesc);
world.createCollider(
  Rapier.ColliderDesc.capsule(STEP_HEIGHT * 0.5, STEP_HEIGHT)
    .setFriction(1.5)
    .setRestitution(0),
  playerBody
);

controls.getObject().position.set(spawnX, spawnHeight, spawnZ);
scene.add(controls.getObject());

const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  down: false,
  crouch: false,
};
let noclip = false;
let jumpQueued = false;

function setNoclip(value) {
  noclip = value;
  modeBadge.style.display = noclip ? 'block' : 'none';
  if (noclip) {
    jumpQueued = false;
  }
}

function onKeyChange(event, isDown) {
  if (event.code === 'KeyN') {
    if (isDown && !event.repeat) setNoclip(!noclip);
    return;
  }
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      movement.forward = isDown;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      movement.left = isDown;
      break;
    case 'ArrowDown':
    case 'KeyS':
      movement.backward = isDown;
      break;
    case 'ArrowRight':
    case 'KeyD':
      movement.right = isDown;
      break;
    case 'Space':
      if (isDown && !movement.jump) jumpQueued = true;
      movement.jump = isDown;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      if (noclip) {
        movement.down = isDown;
      } else {
        movement.crouch = isDown;
      }
      break;
    case 'ControlLeft':
    case 'ControlRight':
      movement.crouch = isDown;
      break;
    case 'KeyC':
      movement.down = isDown;
      break;
    default:
      break;
  }
}

document.addEventListener('keydown', (event) => onKeyChange(event, true));
document.addEventListener('keyup', (event) => onKeyChange(event, false));
window.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  if (!controls.isLocked || event.target === enterButton) return;
  event.preventDefault();
  fireSniper();
});

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);

const forwardVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const wishVector = new THREE.Vector3();
const moveVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const horizontalVel = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
let wishStrength = 0;
let isGrounded = false;
let isSwimming = false;
let bobTime = 0;

function computeWishDirection() {
  camera.getWorldDirection(forwardVector);
  forwardVector.y = 0;
  if (forwardVector.lengthSq() < 1e-4) {
    forwardVector.set(0, 0, -1);
  }
  forwardVector.normalize();
  sideVector.copy(forwardVector).cross(upVector).normalize();

  wishVector.set(0, 0, 0);
  if (movement.forward) wishVector.add(forwardVector);
  if (movement.backward) wishVector.sub(forwardVector);
  if (movement.right) wishVector.add(sideVector);
  if (movement.left) wishVector.sub(sideVector);
  const len = wishVector.length();
  if (len > 0) {
    wishStrength = Math.min(1, len);
    wishVector.normalize();
  } else {
    wishStrength = 0;
  }
}

function applyFrictionVector(vec, dt) {
  const speed = vec.length();
  if (speed < 1e-3) {
    vec.set(0, 0, 0);
    return;
  }
  const drop = Math.min(speed, speed * FRICTION * dt);
  vec.multiplyScalar((speed - drop) / speed);
}

function accelerateVector(vec, dir, wishSpeed, accel, dt, speedCap = Infinity) {
  if (wishSpeed <= 0 || dir.lengthSq() === 0) return;
  const currentSpeed = vec.dot(dir);
  let addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return;
  const accelSpeed = Math.min(accel * wishSpeed * dt, addSpeed);
  tmpVec.copy(dir).multiplyScalar(accelSpeed);
  vec.add(tmpVec);
  if (speedCap !== Infinity) {
    const speed = vec.length();
    if (speed > speedCap) {
      vec.multiplyScalar(speedCap / speed);
    }
  }
}

function fireSniper() {
  const now = performance.now() * 0.001;
  if (now - sniperState.lastShot < SNIPER_COOLDOWN) return;
  sniperState.lastShot = now;
  const muzzle = controls.getObject().position.clone().add(muzzleOffset);
  camera.getWorldDirection(fireDirection).normalize();
  const hit = raycastTerrain(muzzle, fireDirection, SNIPER_MAX_DISTANCE);
  spawnTracerLine(muzzle, hit.point);
  spawnProjectileTracer(muzzle, fireDirection, hit.distance);
  spawnImpactFX(hit.point);
  spawnMuzzleFlash(muzzle);
  const recoil = fireDirection.clone().multiplyScalar(-MUZZLE_KICK);
  playerBody.applyImpulse({ x: recoil.x, y: MUZZLE_KICK * 5, z: recoil.z }, true);
}

function updateGroundState() {
  const pos = playerBody.translation();
  const terrainHeight = sampleTerrainHeightWorld(pos.x, pos.z);
  const waterHeight = SEA_LEVEL;
  isSwimming = pos.y < waterHeight - 0.2;
  const groundHeight = Math.max(terrainHeight, waterHeight - 0.5);
  isGrounded = !isSwimming && pos.y - STEP_HEIGHT <= groundHeight + 0.08;
}

function applyPlayerInput() {
  if (!controls.isLocked || noclip) {
    playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return;
  }

  computeWishDirection();
  const currentVel = playerBody.linvel();
  horizontalVel.set(currentVel.x, 0, currentVel.z);

  updateGroundState();
  const delta = fixedTimeStep;
  const crouchActive = movement.crouch && isGrounded;
  const maxSpeed = (crouchActive ? WALK_SPEED * CROUCH_SPEED_FACTOR : WALK_SPEED) * wishStrength;

  if (isSwimming) {
    applyFrictionVector(horizontalVel, delta * 0.5);
    accelerateVector(horizontalVel, wishVector, WALK_SPEED * 0.4 * wishStrength, 40, delta, WALK_SPEED * 0.5);
    const buoyancy = (SEA_LEVEL - currentVel.y) * 0.6;
    const swimVelY = Math.min(2.5, Math.max(currentVel.y + buoyancy * delta, -1.5));
    if (movement.jump) {
      playerBody.setLinvel({ x: horizontalVel.x, y: swimVelY + 3 * delta, z: horizontalVel.z }, true);
    } else if (movement.down) {
      playerBody.setLinvel({ x: horizontalVel.x, y: swimVelY - 3 * delta, z: horizontalVel.z }, true);
    } else {
      playerBody.setLinvel({ x: horizontalVel.x, y: swimVelY, z: horizontalVel.z }, true);
    }
    return;
  }

  if (isGrounded) {
    applyFrictionVector(horizontalVel, delta);
    accelerateVector(horizontalVel, wishVector, maxSpeed, GROUND_ACCEL, delta);
  } else {
    const airSpeed = Math.min(maxSpeed, AIR_SPEED_CAP);
    accelerateVector(horizontalVel, wishVector, airSpeed, AIR_ACCEL, delta, AIR_SPEED_CAP);
  }

  playerBody.setLinvel({ x: horizontalVel.x, y: currentVel.y, z: horizontalVel.z }, true);
  if (jumpQueued && isGrounded) {
    playerBody.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
    jumpQueued = false;
  }
  if (!movement.jump && jumpQueued) {
    jumpQueued = false;
  }
}

function updateNoclip(delta) {
  if (!controls.isLocked) return;
  moveVector.set(0, 0, 0);
  camera.getWorldDirection(forwardVector);
  forwardVector.normalize();
  sideVector.copy(forwardVector).cross(upVector).normalize();

  if (movement.forward) moveVector.add(forwardVector);
  if (movement.backward) moveVector.sub(forwardVector);
  if (movement.right) moveVector.add(sideVector);
  if (movement.left) moveVector.sub(sideVector);
    if (movement.jump) moveVector.add(upVector);
    if (movement.down || (movement.crouch && !movement.down)) moveVector.sub(upVector);

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize().multiplyScalar(NOCLIP_SPEED * delta);
    controls.getObject().position.add(moveVector);
  }
}

const clock = new THREE.Clock();
const fixedTimeStep = 1 / 60;
let accumulator = 0;
let fpsTimer = 0;
let fpsFrames = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  accumulator += delta;
  fpsFrames++;
  fpsTimer += delta;
  if (fpsTimer >= 0.5) {
    const fps = Math.round((fpsFrames / fpsTimer) * 10) / 10;
    fpsCounter.textContent = `FPS: ${fps}`;
    fpsFrames = 0;
    fpsTimer = 0;
  }

  const nowSeconds = performance.now() * 0.001;
  updateTracers(nowSeconds);
  updateProjectiles(delta);
  updateImpacts(nowSeconds);

  if (noclip) {
    updateNoclip(delta);
    const pos = controls.getObject().position;
    playerBody.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  } else {
    applyPlayerInput();
  }

  while (accumulator >= fixedTimeStep) {
    world.step();
    accumulator -= fixedTimeStep;
  }

  if (!noclip) {
    const bodyPos = playerBody.translation();
    const crouchOffset = movement.crouch && isGrounded ? CROUCH_CAMERA_OFFSET : 0;
    const speed = horizontalVel.length();
    if (isGrounded && speed > 0.1) {
      bobTime += delta * HEAD_BOB_SPEED;
    } else {
      bobTime = Math.max(0, bobTime - delta * HEAD_BOB_SPEED);
    }
    const bobOffset = isGrounded ? Math.sin(bobTime) * HEAD_BOB_INTENSITY * Math.min(1, speed / WALK_SPEED) : 0;
    controls.getObject().position.set(bodyPos.x, bodyPos.y - crouchOffset + bobOffset, bodyPos.z);
  }

  renderer.render(scene, camera);
}

resizeRenderer();
animate();
