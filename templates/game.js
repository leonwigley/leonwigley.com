import * as THREE from 'three';
import { PointerLockControls } from 'PointerLockControls';

const rapierModule = await import('https://cdn.skypack.dev/@dimforge/rapier3d-compat?min');
const Rapier = rapierModule.default ?? rapierModule;
await Rapier.init({});

const canvas = document.querySelector('#game-canvas');
if (!canvas) {
  throw new Error('Missing canvas element');
}

const DEFAULT_SETTINGS = {
  pixelRatioCap: 1.5,
  treeAttempts: 360,
  shrubAttempts: 600,
  rockAttempts: 180,
  flowerAttempts: 360,
  grassBlades: 700,
  treeViewRadiusScale: 0.75,
  shrubViewRadiusScale: 0.65,
  rockViewRadiusScale: 0.7,
  flowerViewRadiusScale: 0.55,
  grassViewRadiusScale: 0.5,
  foliageUpdateBatch: 600,
  foliageFadeMargin: 20,
  castleCount: 4,
  ruinCount: 6,
  caveCount: 5,
  riverCount: 2,
};
const SETTINGS = { ...DEFAULT_SETTINGS, ...(globalThis.GAME_SETTINGS ?? {}) };
const PIXEL_RATIO_CAP = SETTINGS.pixelRatioCap;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe7ff);
scene.fog = new THREE.FogExp2(0xb7ddff, 0.0045);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
const controls = new PointerLockControls(camera, canvas);
const yawObject = controls.getObject();
const pitchObject = yawObject.children[0] ?? null;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const VOXEL_SIZE = 0.5;
const CHUNK_SIZE = 220;
const HEIGHT_LOD = 1;
const COLLIDER_STEP = 4;
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
const CLOUD_COUNT = 30;
const CLOUD_ALTITUDE = VOXEL_SIZE * 150;
const CLOUD_AREA_MULTIPLIER = 2;
const CLOUD_MIN_SPEED = VOXEL_SIZE * 0.25;
const CLOUD_MAX_SPEED = VOXEL_SIZE * 0.75;
const CONTINENT_FREQ = 0.012;
const HILL_FREQ = 0.045;
const DETAIL_FREQ = 0.14;
const RIDGE_FREQ = 0.25;
const TERRAIN_RIDGE_POWER = 1.4;
const MAX_BLOCK_HEIGHT = 72;
const BLOCK_TYPES = {
  GRASS: 0,
  DIRT: 1,
  STONE: 2,
  SAND: 3,
  SNOW: 4,
  MUD: 5,
};
const TREE_ATTEMPTS = SETTINGS.treeAttempts;
const SHRUB_ATTEMPTS = SETTINGS.shrubAttempts;
const ROCK_ATTEMPTS = SETTINGS.rockAttempts;
const FLOWER_ATTEMPTS = SETTINGS.flowerAttempts;
const GRASS_ATTEMPTS = SETTINGS.grassBlades;
const CASTLE_COUNT = SETTINGS.castleCount ?? 4;
const RUIN_COUNT = SETTINGS.ruinCount ?? 6;
const CAVE_COUNT = SETTINGS.caveCount ?? 5;
const RIVER_COUNT = SETTINGS.riverCount ?? 2;
const TREE_MAX_SLOPE = 1.8;
const SHRUB_MAX_SLOPE = 2.6;
const ROCK_SLOPE_RANGE = [0.6, 4.5];
const FLOWER_MAX_SLOPE = 2.2;
const FLOWER_ALTITUDE_LIMIT = VOXEL_SIZE * 120;
const SEA_BUFFER = VOXEL_SIZE * 2.2;
const TREE_VIEW_RADIUS = CHUNK_SIZE * VOXEL_SIZE * SETTINGS.treeViewRadiusScale;
const SHRUB_VIEW_RADIUS = CHUNK_SIZE * VOXEL_SIZE * SETTINGS.shrubViewRadiusScale;
const ROCK_VIEW_RADIUS = CHUNK_SIZE * VOXEL_SIZE * SETTINGS.rockViewRadiusScale;
const FLOWER_VIEW_RADIUS = CHUNK_SIZE * VOXEL_SIZE * SETTINGS.flowerViewRadiusScale;
const GRASS_VIEW_RADIUS = CHUNK_SIZE * VOXEL_SIZE * SETTINGS.grassViewRadiusScale;
const FOLIAGE_UPDATE_BATCH = SETTINGS.foliageUpdateBatch;
const FOLIAGE_FADE_MARGIN = VOXEL_SIZE * SETTINGS.foliageFadeMargin;
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2f1b, roughness: 0.7, flatShading: true });
const birchBarkMaterial = new THREE.MeshStandardMaterial({ color: 0xe3e7dd, roughness: 0.6, flatShading: true });
const palmBarkMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3c1e, roughness: 0.75, flatShading: true });
const leafMaterialDeep = new THREE.MeshStandardMaterial({ color: 0x1c4b24, roughness: 0.4, metalness: 0, flatShading: true });
const leafMaterialBright = new THREE.MeshStandardMaterial({ color: 0x3e7a34, roughness: 0.45, flatShading: true });
const leafMaterialDry = new THREE.MeshStandardMaterial({ color: 0xa38b2c, roughness: 0.5, flatShading: true });
const leafMaterialSwamp = new THREE.MeshStandardMaterial({ color: 0x214428, roughness: 0.55, flatShading: true });
const cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5c32, roughness: 0.55, flatShading: true });
const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x727978, roughness: 0.9, flatShading: true });
const rockDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x4b4f50, roughness: 0.95, flatShading: true });
const flowerMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xf28f8f, roughness: 0.5, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0xf1e08a, roughness: 0.5, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x9ed36a, roughness: 0.45, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0xb697f7, roughness: 0.5, flatShading: true }),
];
const grassBladeMaterial = new THREE.MeshStandardMaterial({ color: 0x5f9b50, roughness: 0.4, flatShading: true });
const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xa7adb5, roughness: 0.85, metalness: 0.05, flatShading: true });
const darkStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x6d737d, roughness: 0.9, flatShading: true });
const mossyStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x748a59, roughness: 0.85, flatShading: true });
const caveMaterial = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.98, flatShading: true });
const riverMaterial = new THREE.MeshStandardMaterial({
  color: 0x2c8cc7,
  transparent: true,
  opacity: 0.82,
  roughness: 0.25,
  metalness: 0.2,
});
const caveHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x05070c, side: THREE.DoubleSide });
const BLOCK_COLOR_TABLE = {
  [BLOCK_TYPES.GRASS]: new THREE.Color(0x4b9d3a),
  [BLOCK_TYPES.DIRT]: new THREE.Color(0x6b4b32),
  [BLOCK_TYPES.STONE]: new THREE.Color(0x8c8f96),
  [BLOCK_TYPES.SAND]: new THREE.Color(0xd9c28f),
  [BLOCK_TYPES.SNOW]: new THREE.Color(0xf2f5f8),
  [BLOCK_TYPES.MUD]: new THREE.Color(0x3f4a2e),
};
const slopeField = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);
const columnHeights = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
const surfaceBlocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

function trigNoise(nx, nz, freq, phaseX, phaseZ) {
  return Math.sin((nx + phaseX) * freq * Math.PI * 2) * Math.cos((nz + phaseZ) * freq * Math.PI * 2);
}

function fractalNoise(nx, nz, baseFreq, octaves, persistence, lacunarity, offsetX = 0, offsetZ = 0) {
  let amplitude = 1;
  let frequency = baseFreq;
  let value = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * trigNoise(nx, nz, frequency, offsetX + i * 17.23, offsetZ + i * 27.91);
    norm += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / norm;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function remap(value, inMin, inMax, outMin, outMax) {
  const t = clamp01((value - inMin) / (inMax - inMin));
  return outMin + t * (outMax - outMin);
}
const cloudSpan = CHUNK_SIZE * VOXEL_SIZE * CLOUD_AREA_MULTIPLIER;

const infoBar = document.createElement('div');
infoBar.textContent = isMobile
  ? 'Tap enter · Drag right to look · Joystick to move · Tap Jump'
  : 'Click to enter · WASD move · Space jump · Shift descend · N noclip';
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

let mobileControlsUI = null;
let joystickKnob = null;
let joystickBase = null;
let lookPad = null;
let jumpButton = null;
let fireButton = null;

function setupMobileControls() {
  canvas.style.touchAction = 'none';
  document.body.style.touchAction = 'none';
  mobileControlsUI = document.createElement('div');
  Object.assign(mobileControlsUI.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '30',
  });

  joystickBase = document.createElement('div');
  Object.assign(joystickBase.style, {
    position: 'absolute',
    left: '24px',
    bottom: '24px',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.2)',
    pointerEvents: 'auto',
    touchAction: 'none',
  });

  joystickKnob = document.createElement('div');
  Object.assign(joystickKnob.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(126,190,255,0.5)',
    transform: 'translate(-50%, -50%)',
  });
  joystickBase.appendChild(joystickKnob);
  mobileControlsUI.appendChild(joystickBase);

  lookPad = document.createElement('div');
  Object.assign(lookPad.style, {
    position: 'absolute',
    right: '0',
    bottom: '0',
    width: '55%',
    height: '100%',
    pointerEvents: 'auto',
    touchAction: 'none',
  });
  mobileControlsUI.appendChild(lookPad);

  jumpButton = document.createElement('button');
  jumpButton.textContent = 'Jump';
  Object.assign(jumpButton.style, {
    position: 'absolute',
    right: '24px',
    bottom: '140px',
    padding: '12px 18px',
    borderRadius: '999px',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontFamily: 'monospace',
    pointerEvents: 'auto',
    touchAction: 'none',
  });
  mobileControlsUI.appendChild(jumpButton);

  fireButton = document.createElement('button');
  fireButton.textContent = 'Fire';
  Object.assign(fireButton.style, {
    position: 'absolute',
    right: '30px',
    bottom: '40px',
    padding: '16px 22px',
    borderRadius: '999px',
    border: 'none',
    background: 'rgba(255,82,82,0.4)',
    color: '#fff',
    fontFamily: 'monospace',
    pointerEvents: 'auto',
    touchAction: 'none',
  });
  mobileControlsUI.appendChild(fireButton);

  document.body.appendChild(mobileControlsUI);

  joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
  joystickBase.addEventListener('touchmove', handleJoystickMove, { passive: false });
  joystickBase.addEventListener('touchend', handleJoystickEnd, { passive: false });
  joystickBase.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

  lookPad.addEventListener('touchstart', handleLookStart, { passive: false });
  lookPad.addEventListener('touchmove', handleLookMove, { passive: false });
  lookPad.addEventListener('touchend', handleLookEnd, { passive: false });
  lookPad.addEventListener('touchcancel', handleLookEnd, { passive: false });

  jumpButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    movement.jump = true;
    jumpQueued = true;
  });
  jumpButton.addEventListener('touchend', (event) => {
    event.preventDefault();
    movement.jump = false;
  });
  jumpButton.addEventListener('touchcancel', (event) => {
    event.preventDefault();
    movement.jump = false;
  });

  fireButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    fireSniper();
  });
}

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
  if (!isMobile) {
    controls.lock();
  }
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

function rotateCameraTouch(deltaX, deltaY) {
  if (!isMobile) return;
  const lookSpeed = 0.003;
  yawObject.rotation.y -= deltaX * lookSpeed;
  const limit = Math.PI / 2 - 0.01;
  if (pitchObject) {
    pitchObject.rotation.x = Math.max(-limit, Math.min(limit, pitchObject.rotation.x - deltaY * lookSpeed));
  } else {
    camera.rotation.x = Math.max(-limit, Math.min(limit, camera.rotation.x - deltaY * lookSpeed));
  }
}

function updateMovementFromJoystick() {
  if (!isMobile) return;
  const { x, y } = mobileInputState.move.vector;
  const threshold = 0.25;
  movement.forward = y < -threshold;
  movement.backward = y > threshold;
  movement.left = x < -threshold;
  movement.right = x > threshold;
  if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
    movement.forward = movement.backward = movement.left = movement.right = false;
  }
}

function handleJoystickStart(event) {
  if (!isMobile) return;
  event.preventDefault();
  const touch = event.changedTouches[0];
  mobileInputState.move.active = true;
  mobileInputState.move.id = touch.identifier;
  updateJoystickVector(touch.clientX, touch.clientY);
}

function handleJoystickMove(event) {
  if (!isMobile) return;
  event.preventDefault();
  if (!mobileInputState.move.active) return;
  for (const touch of event.changedTouches) {
    if (touch.identifier === mobileInputState.move.id) {
      updateJoystickVector(touch.clientX, touch.clientY);
      break;
    }
  }
}

function handleJoystickEnd(event) {
  if (!isMobile || !mobileInputState.move.active) return;
  for (const touch of event.changedTouches) {
    if (touch.identifier === mobileInputState.move.id) {
      mobileInputState.move.active = false;
      mobileInputState.move.id = null;
      mobileInputState.move.vector.x = 0;
      mobileInputState.move.vector.y = 0;
      if (joystickKnob) {
        joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
      updateMovementFromJoystick();
      break;
    }
  }
}

function updateJoystickVector(clientX, clientY) {
  if (!joystickBase || !joystickKnob) return;
  const rect = joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = (clientX - centerX) / (rect.width / 2);
  const dy = (clientY - centerY) / (rect.height / 2);
  mobileInputState.move.vector.x = Math.max(-1, Math.min(1, dx));
  mobileInputState.move.vector.y = Math.max(-1, Math.min(1, dy));
  const knobX = mobileInputState.move.vector.x * (rect.width / 4);
  const knobY = mobileInputState.move.vector.y * (rect.height / 4);
  joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  updateMovementFromJoystick();
}

function handleLookStart(event) {
  if (!isMobile) return;
  event.preventDefault();
  for (const touch of event.changedTouches) {
    if (!mobileInputState.look.active) {
      mobileInputState.look.active = true;
      mobileInputState.look.id = touch.identifier;
      mobileInputState.look.lastX = touch.clientX;
      mobileInputState.look.lastY = touch.clientY;
      break;
    }
  }
}

function handleLookMove(event) {
  if (!isMobile || !mobileInputState.look.active) return;
  event.preventDefault();
  for (const touch of event.changedTouches) {
    if (touch.identifier === mobileInputState.look.id) {
      const deltaX = touch.clientX - mobileInputState.look.lastX;
      const deltaY = touch.clientY - mobileInputState.look.lastY;
      rotateCameraTouch(deltaX, deltaY);
      mobileInputState.look.lastX = touch.clientX;
      mobileInputState.look.lastY = touch.clientY;
      break;
    }
  }
}

function handleLookEnd(event) {
  if (!isMobile || !mobileInputState.look.active) return;
  for (const touch of event.changedTouches) {
    if (touch.identifier === mobileInputState.look.id) {
      mobileInputState.look.active = false;
      mobileInputState.look.id = null;
      break;
    }
  }
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
const cloudGroup = new THREE.Group();
const cloudSpeeds = [];
const cloudBlockGeometry = new THREE.BoxGeometry(1, 1, 1);
const cloudMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.35,
  metalness: 0,
  flatShading: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const foliageActors = [];
let foliageCullIndex = 0;
const foliageCullOrigin = new THREE.Vector3();
const foliageStats = { trees: 0, shrubs: 0, rocks: 0, flowers: 0, grass: 0, castles: 0, ruins: 0, caves: 0, rivers: 0 };
const instanceDummy = new THREE.Object3D();
const structureGroup = new THREE.Group();
const riverGroup = new THREE.Group();
const riverDirection = new THREE.Vector2();
const downhillVector = new THREE.Vector2();
const mobileInputState = {
  move: { active: false, id: null, vector: { x: 0, y: 0 } },
  look: { active: false, id: null, lastX: 0, lastY: 0 },
};

if (!isMobile) {
  canvas.addEventListener('click', () => controls.lock());
  controls.addEventListener('lock', () => {
    infoBar.style.display = 'none';
    crosshair.style.display = 'block';
  });
  controls.addEventListener('unlock', () => {
    infoBar.style.display = 'block';
    crosshair.style.display = 'none';
  });
} else {
  crosshair.style.display = 'block';
}

scene.add(new THREE.AmbientLight(0xfff9e8, 0.95));
const sun = new THREE.DirectionalLight(0xfff3c4, 1.6);
sun.position.set(-160, 220, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 500;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xe5f3ff, 0x55614b, 0.55));
scene.add(cloudGroup);
scene.add(riverGroup);
scene.add(structureGroup);
createCloudLayer(CLOUD_COUNT);
console.info('World settings', SETTINGS);

function heightAt(x, z) {
  const nx = x / CHUNK_SIZE;
  const nz = z / CHUNK_SIZE;
  const cx = nx - 0.5;
  const cz = nz - 0.5;
  const continental = fractalNoise(cx, cz, CONTINENT_FREQ, 4, 0.55, 2.4, 0.13, 0.67);
  const hills = fractalNoise(cx * 1.6, cz * 1.6, HILL_FREQ, 3, 0.52, 2.3, 1.7, 2.9);
  const detail = fractalNoise(nx * 3.5, nz * 3.5, DETAIL_FREQ, 2, 0.48, 2.8, 4.1, 3.7);
  const ridges = Math.pow(Math.abs(fractalNoise(cx * 2.2, cz * 2.2, RIDGE_FREQ, 3, 0.6, 2.1, 5.3, 1.4)), TERRAIN_RIDGE_POWER);
  const coast = clamp01(Math.sqrt(cx * cx + cz * cz) / 0.85);
  const coastDrop = Math.max(0, coast - 0.55) * 32;
  const valley = fractalNoise(cx + 2.4, cz - 3.6, 0.45, 2, 0.58, 2.5, 3.2, 6.3) * 8;
  const dunes = fractalNoise(nx * 5.4, nz * 4.9, 0.3, 2, 0.7, 2.8, 2.7, 1.2) * 3;
  const base = 9 + continental * 26 + hills * 14 + detail * 4 + ridges * 34 + valley + dunes;
  const river = Math.pow(1 - Math.abs(fractalNoise(cx + 4.1, cz + 1.7, 0.8, 3, 0.45, 2.5)), 3) * 20;
  const height = base - coastDrop - river;
  return Math.max(2, height);
}

function sampleClimate(x, z, altitude) {
  const nx = x / CHUNK_SIZE;
  const nz = z / CHUNK_SIZE;
  const humidityNoise = fractalNoise(nx, nz, 0.9, 4, 0.55, 2.35, 1.2, 5.1);
  const secondaryHumidity = fractalNoise(nx * 2.1, nz * 1.7, 0.6, 3, 0.6, 2.1, 3.8, 0.9);
  const temperatureNoise = fractalNoise(nx, nz, 0.8, 3, 0.5, 2.4, 6.4, 2.6);
  const polarGradient = clamp01(1 - Math.abs(nz - 0.5) * 2);
  const humidity = clamp01(0.5 + humidityNoise * 0.35 + secondaryHumidity * 0.2 + altitude * -0.1);
  const temperature = clamp01(0.55 + temperatureNoise * 0.4 + (polarGradient - 0.5) * 0.15 - altitude * 0.3);
  return { humidity, temperature };
}

function classifyBiome(temperature, humidity, altitude, coastProximity) {
  if (coastProximity > 0.7) return 'shore';
  if (altitude > 0.85) return 'tundra';
  if (altitude > 0.7) {
    return humidity > 0.45 ? 'pine' : 'highlands';
  }
  if (humidity < 0.22) return 'desert';
  if (humidity < 0.36) return temperature > 0.55 ? 'savanna' : 'meadow';
  if (humidity > 0.78) return 'swamp';
  if (temperature < 0.35) return 'pine';
  if (humidity > 0.65) return 'forest';
  return 'meadow';
}

function pickSurfaceBlock(biomeType, altitude) {
  switch (biomeType) {
    case 'desert':
    case 'shore':
      return BLOCK_TYPES.SAND;
    case 'swamp':
      return BLOCK_TYPES.MUD;
    case 'tundra':
      return BLOCK_TYPES.SNOW;
    case 'highlands':
      return BLOCK_TYPES.STONE;
    default:
      if (altitude > 0.8) return BLOCK_TYPES.SNOW;
      if (altitude > 0.65) return BLOCK_TYPES.STONE;
      return BLOCK_TYPES.GRASS;
  }
}

function getBlockColor(type) {
  return BLOCK_COLOR_TABLE[type] ?? BLOCK_COLOR_TABLE[BLOCK_TYPES.DIRT];
}

const heightField = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);
const biomeGrid = new Array(CHUNK_SIZE * CHUNK_SIZE);
const BIOME_BLEND_OFFSETS = [
  { dx: 0, dz: 0, weight: 4 },
  { dx: 3, dz: 0, weight: 2 },
  { dx: -3, dz: 0, weight: 2 },
  { dx: 0, dz: 3, weight: 2 },
  { dx: 0, dz: -3, weight: 2 },
  { dx: 3, dz: 3, weight: 1.2 },
  { dx: -3, dz: 3, weight: 1.2 },
  { dx: 3, dz: -3, weight: 1.2 },
  { dx: -3, dz: -3, weight: 1.2 },
  { dx: 6, dz: 0, weight: 0.6 },
  { dx: -6, dz: 0, weight: 0.6 },
  { dx: 0, dz: 6, weight: 0.6 },
  { dx: 0, dz: -6, weight: 0.6 },
];

function biomeAt(x, z) {
  const clampedX = Math.min(Math.max(Math.round(x), 0), CHUNK_SIZE - 1);
  const clampedZ = Math.min(Math.max(Math.round(z), 0), CHUNK_SIZE - 1);
  const idx = clampedZ * CHUNK_SIZE + clampedX;
  let biome = biomeGrid[idx];
  if (!biome) {
    const height = heightField[idx] ?? SEA_LEVEL;
    const altitude = height / ALTITUDE_SCALE;
    const { humidity, temperature } = sampleClimate(clampedX, clampedZ, altitude);
    const coastProximity = clamp01((SEA_LEVEL + SEA_BUFFER - height) / (SEA_BUFFER * 1.5));
    const type = classifyBiome(temperature, humidity, altitude, coastProximity);
    biome = { type, humidity, temperature };
    biomeGrid[idx] = biome;
  }
  return biome;
}

function computeBiomeColor(target, type, humidity, temperature, altitude, x, z) {
  if (type === 'desert') {
    const dune = 0.85 + 0.15 * Math.sin((x + z) * 0.4);
    target.setRGB(0.78 * dune, 0.65 * dune, 0.42 * dune);
  } else if (type === 'shore') {
    const wet = 0.6 + 0.4 * humidity;
    target.setRGB(0.86, 0.8 * wet, 0.55 * wet);
  } else if (type === 'meadow') {
    target.setRGB(0.32 + humidity * 0.25, 0.52 + humidity * 0.35, 0.26 + humidity * 0.2);
  } else if (type === 'savanna') {
    target.setRGB(0.56, 0.53, 0.26 + 0.12 * humidity);
  } else if (type === 'pine') {
    target.setRGB(0.18 + humidity * 0.18, 0.38 + humidity * 0.25, 0.16 + humidity * 0.12);
  } else if (type === 'swamp') {
    target.setRGB(0.2, 0.33, 0.18 + 0.1 * humidity);
  } else if (type === 'tundra') {
    const snowMix = Math.min(1, 0.4 + (0.6 - temperature) * 2 + altitude);
    target.setRGB(0.82 + 0.18 * snowMix, 0.86 + 0.12 * snowMix, 0.9 + 0.08 * snowMix);
  } else if (type === 'highlands') {
    const rocky = 0.5 + altitude * 0.3;
    target.setRGB(0.45 + rocky * 0.2, 0.42 + rocky * 0.1, 0.38 + rocky * 0.1);
  } else if (altitude > 0.65) {
    const rocky = 0.4 + 0.4 * altitude;
    target.setRGB(0.48 + rocky * 0.2, 0.44 + rocky * 0.1, 0.4 + rocky * 0.12);
  } else {
    const lush = Math.max(0.3, 0.95 * humidity);
    target.setRGB(0.18 + lush * 0.32, 0.36 + lush * 0.42, 0.15 + lush * 0.2);
  }
  return target;
}

function sampleBiomeColor(localX, localZ, target) {
  const gridX = Math.min(CHUNK_SIZE - 1, Math.max(0, Math.round(localX)));
  const gridZ = Math.min(CHUNK_SIZE - 1, Math.max(0, Math.round(localZ)));
  const idx = gridZ * CHUNK_SIZE + gridX;
  const height = heightField[idx];
  const { type, humidity, temperature } = biomeGrid[idx];
  const altitude = height / ALTITUDE_SCALE;
  return computeBiomeColor(target, type, humidity, temperature, altitude, gridX, gridZ);
}

async function buildLandscape(size, onProgress) {
  let best = { x: Math.floor(size / 2), z: Math.floor(size / 2), height: -Infinity };
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const columnHeight = heightAt(x, z);
      const blockHeight = Math.max(1, Math.min(MAX_BLOCK_HEIGHT, Math.round(columnHeight / VOXEL_SIZE)));
      const worldHeight = blockHeight * VOXEL_SIZE;
      const idx = z * size + x;
      heightField[idx] = worldHeight;
      columnHeights[idx] = blockHeight;
      const altitude = worldHeight / ALTITUDE_SCALE;
      const { humidity, temperature } = sampleClimate(x, z, altitude);
      const coastProximity = clamp01((SEA_LEVEL + SEA_BUFFER - worldHeight) / (SEA_BUFFER * 1.5));
      const type = classifyBiome(temperature, humidity, altitude, coastProximity);
      const biome = { type, humidity, temperature };
      biomeGrid[idx] = biome;
      surfaceBlocks[idx] = pickSurfaceBlock(type, altitude);
      if (worldHeight > SEA_LEVEL + VOXEL_SIZE * 12 && worldHeight > best.height) {
        best = { x, z, height: worldHeight };
      }
    }
    if (onProgress && x % 4 === 0) {
      onProgress((x + 1) / size);
      await nextFrame();
    }
  }
  computeSlopeField(size);
  if (best.height === -Infinity) {
    const cx = Math.floor(size / 2);
    const cz = Math.floor(size / 2);
    best = { x: cx, z: cz, height: heightField[cz * size + cx] };
  }
  return { spawnColumn: best };
}

function computeSlopeField(size) {
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const idx = z * size + x;
      const left = heightField[z * size + Math.max(0, x - 1)];
      const right = heightField[z * size + Math.min(size - 1, x + 1)];
      const up = heightField[Math.max(0, z - 1) * size + x];
      const down = heightField[Math.min(size - 1, z + 1) * size + x];
      const slopeX = (right - left) * 0.5;
      const slopeZ = (down - up) * 0.5;
      slopeField[idx] = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
    }
  }
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

function buildVoxelTerrainMesh() {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vertexIndex = 0;
  const cellSize = VOXEL_SIZE;
  const halfCell = cellSize * 0.5;
  const topShade = 1;
  const sideShade = 0.82;

  function pushQuad(a, b, c, d, normal, color, shade = 1) {
    positions.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) {
      normals.push(normal[0], normal[1], normal[2]);
      colors.push(color.r * shade, color.g * shade, color.b * shade);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
    vertexIndex += 4;
  }

  function addColumn(x, z) {
    const idx = z * CHUNK_SIZE + x;
    const height = columnHeights[idx];
    if (!height) return;
    const blockType = surfaceBlocks[idx];
    const color = getBlockColor(blockType);
    const cx = (x - CHUNK_SIZE / 2 + 0.5) * cellSize;
    const cz = (z - CHUNK_SIZE / 2 + 0.5) * cellSize;
    const minX = cx - halfCell;
    const maxX = cx + halfCell;
    const minZ = cz - halfCell;
    const maxZ = cz + halfCell;
    const topY = height * cellSize;

    pushQuad(
      [minX, topY, minZ],
      [maxX, topY, minZ],
      [maxX, topY, maxZ],
      [minX, topY, maxZ],
      [0, 1, 0],
      color,
      topShade
    );

    const neighbors = [
      { dx: 1, dz: 0, normal: [1, 0, 0] },
      { dx: -1, dz: 0, normal: [-1, 0, 0] },
      { dx: 0, dz: 1, normal: [0, 0, 1] },
      { dx: 0, dz: -1, normal: [0, 0, -1] },
    ];

    for (const neighbor of neighbors) {
      const nx = x + neighbor.dx;
      const nz = z + neighbor.dz;
      const neighborHeight = nx < 0 || nz < 0 || nx >= CHUNK_SIZE || nz >= CHUNK_SIZE ? 0 : columnHeights[nz * CHUNK_SIZE + nx];
      if (neighborHeight >= height) continue;
      const bottomY = neighborHeight * cellSize;
      const faceColor = color;
      if (neighbor.dx !== 0) {
        const xPos = neighbor.dx > 0 ? maxX : minX;
        const quad = neighbor.dx > 0
          ? [
              [xPos, bottomY, minZ],
              [xPos, bottomY, maxZ],
              [xPos, topY, maxZ],
              [xPos, topY, minZ],
            ]
          : [
              [xPos, bottomY, maxZ],
              [xPos, bottomY, minZ],
              [xPos, topY, minZ],
              [xPos, topY, maxZ],
            ];
        pushQuad(quad[0], quad[1], quad[2], quad[3], neighbor.normal, faceColor, sideShade);
      } else {
        const zPos = neighbor.dz > 0 ? maxZ : minZ;
        const quad = neighbor.dz > 0
          ? [
              [minX, bottomY, zPos],
              [maxX, bottomY, zPos],
              [maxX, topY, zPos],
              [minX, topY, zPos],
            ]
          : [
              [maxX, bottomY, zPos],
              [minX, bottomY, zPos],
              [minX, topY, zPos],
              [maxX, topY, zPos],
            ];
        pushQuad(quad[0], quad[1], quad[2], quad[3], neighbor.normal, faceColor, sideShade);
      }
    }

  }

  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      addColumn(x, z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const terrainMesh = buildVoxelTerrainMesh();
scene.add(terrainMesh);

function sampleDownhillDirection(wx, wz, target = downhillVector) {
  const eps = VOXEL_SIZE * 2;
  const hX1 = sampleTerrainHeightWorld(wx + eps, wz);
  const hX0 = sampleTerrainHeightWorld(wx - eps, wz);
  const hZ1 = sampleTerrainHeightWorld(wx, wz + eps);
  const hZ0 = sampleTerrainHeightWorld(wx, wz - eps);
  const gradX = (hX1 - hX0) / (2 * eps);
  const gradZ = (hZ1 - hZ0) / (2 * eps);
  target.set(-gradX, -gradZ);
  if (target.lengthSq() < 1e-4) {
    target.set(Math.random() - 0.5, Math.random() - 0.5);
  }
  return target.normalize();
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

function updateClouds(delta) {
  if (!cloudGroup.children.length) return;
  const halfSpan = cloudSpan * 0.5;
  for (let i = 0; i < cloudGroup.children.length; i++) {
    const cloud = cloudGroup.children[i];
    cloud.position.x += cloudSpeeds[i] * delta;
    if (cloud.position.x > halfSpan) {
      cloud.position.x = -halfSpan;
    } else if (cloud.position.x < -halfSpan) {
      cloud.position.x = halfSpan;
    }
  }
}

function updateFoliageVisibility(origin) {
  const total = foliageActors.length;
  if (!total) return;
  const batch = Math.min(FOLIAGE_UPDATE_BATCH, total);
  for (let i = 0; i < batch; i++) {
    const actor = foliageActors[foliageCullIndex];
    if (actor && actor.mesh) {
      const target = actor.center ?? actor.mesh.position;
      const distSq = origin.distanceToSquared(target);
      const radiusSq = actor.radiusSq;
      if (distSq > radiusSq) {
        const fadeRadius = actor.radius + FOLIAGE_FADE_MARGIN;
        const fadeSq = fadeRadius * fadeRadius;
        actor.mesh.visible = distSq <= fadeSq;
      } else {
        actor.mesh.visible = true;
      }
    }
    foliageCullIndex++;
    if (foliageCullIndex >= total) {
      foliageCullIndex = 0;
    }
  }
}

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

function makeBlock(material, width, height, depth, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const mesh = new THREE.Mesh(blockGeometry, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(offsetX, offsetY + height / 2, offsetZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPinePrefab() {
  const group = new THREE.Group();
  const trunkHeight = VOXEL_SIZE * 8;
  group.add(makeBlock(barkMaterial, VOXEL_SIZE * 0.8, trunkHeight, VOXEL_SIZE * 0.8, 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    const levelHeight = trunkHeight * 0.5 + i * VOXEL_SIZE * 1.5;
    const scale = VOXEL_SIZE * (4.2 - i * 0.8);
    group.add(makeBlock(leafMaterialDeep, scale, VOXEL_SIZE * 1.2, scale, 0, levelHeight, 0));
  }
  group.add(makeBlock(leafMaterialDeep, VOXEL_SIZE * 1.6, VOXEL_SIZE * 1.4, VOXEL_SIZE * 1.6, 0, trunkHeight + VOXEL_SIZE * 0.5, 0));
  return group;
}

function createOakPrefab() {
  const group = new THREE.Group();
  const trunkHeight = VOXEL_SIZE * 6.8;
  group.add(makeBlock(barkMaterial, VOXEL_SIZE * 1, trunkHeight, VOXEL_SIZE * 1, 0, 0, 0));
  const canopyLevels = [trunkHeight - VOXEL_SIZE * 0.5, trunkHeight + VOXEL_SIZE * 0.7, trunkHeight + VOXEL_SIZE * 1.7];
  canopyLevels.forEach((height, idx) => {
    const scale = VOXEL_SIZE * (4.8 - idx * 0.7);
    group.add(makeBlock(leafMaterialBright, scale, VOXEL_SIZE * 1.3, scale, 0, height, 0));
  });
  group.add(makeBlock(leafMaterialBright, VOXEL_SIZE * 1.8, VOXEL_SIZE * 1, VOXEL_SIZE * 3.2, VOXEL_SIZE * 1.6, trunkHeight + VOXEL_SIZE * 0.5, 0));
  group.add(makeBlock(leafMaterialBright, VOXEL_SIZE * 3.2, VOXEL_SIZE * 1, VOXEL_SIZE * 1.8, 0, trunkHeight + VOXEL_SIZE * 0.5, VOXEL_SIZE * 1.6));
  return group;
}

function createBirchPrefab() {
  const group = new THREE.Group();
  const trunkHeight = VOXEL_SIZE * 6.2;
  group.add(makeBlock(birchBarkMaterial, VOXEL_SIZE * 0.65, trunkHeight, VOXEL_SIZE * 0.65, 0, 0, 0));
  group.add(makeBlock(leafMaterialBright, VOXEL_SIZE * 3.5, VOXEL_SIZE * 1.2, VOXEL_SIZE * 3.5, 0, trunkHeight - VOXEL_SIZE * 0.4, 0));
  group.add(makeBlock(leafMaterialBright, VOXEL_SIZE * 2.8, VOXEL_SIZE * 1.1, VOXEL_SIZE * 2.8, 0, trunkHeight + VOXEL_SIZE * 0.6, 0));
  group.add(makeBlock(leafMaterialBright, VOXEL_SIZE * 2, VOXEL_SIZE * 1, VOXEL_SIZE * 2, 0, trunkHeight + VOXEL_SIZE * 1.4, 0));
  return group;
}

function createPalmPrefab() {
  const group = new THREE.Group();
  const trunkHeight = VOXEL_SIZE * 7.5;
  group.add(makeBlock(palmBarkMaterial, VOXEL_SIZE * 0.5, trunkHeight, VOXEL_SIZE * 0.5, 0, 0, 0));
  const frondLength = VOXEL_SIZE * 4.2;
  const frondThickness = VOXEL_SIZE * 0.35;
  const crownHeight = trunkHeight + VOXEL_SIZE * 0.5;
  group.add(makeBlock(leafMaterialDry, frondThickness, VOXEL_SIZE * 0.8, frondLength, 0, crownHeight, 0));
  group.add(makeBlock(leafMaterialDry, frondLength, VOXEL_SIZE * 0.8, frondThickness, 0, crownHeight, 0));
  group.add(makeBlock(leafMaterialDry, frondLength * 0.8, VOXEL_SIZE * 0.8, frondThickness, 0, crownHeight, frondLength * 0.3));
  group.add(makeBlock(leafMaterialDry, frondThickness, VOXEL_SIZE * 0.8, frondLength * 0.8, frondLength * 0.3, crownHeight, 0));
  return group;
}

function createDeadTreePrefab() {
  const group = new THREE.Group();
  const trunkHeight = VOXEL_SIZE * 6.5;
  group.add(makeBlock(barkMaterial, VOXEL_SIZE * 0.6, trunkHeight, VOXEL_SIZE * 0.6, 0, 0, 0));
  group.add(makeBlock(barkMaterial, VOXEL_SIZE * 0.4, VOXEL_SIZE * 3, VOXEL_SIZE * 0.4, VOXEL_SIZE * 1.2, trunkHeight - VOXEL_SIZE * 1.2, 0));
  group.add(makeBlock(barkMaterial, VOXEL_SIZE * 0.4, VOXEL_SIZE * 2.4, VOXEL_SIZE * 0.4, -VOXEL_SIZE * 1.1, trunkHeight - VOXEL_SIZE * 0.8, 0));
  return group;
}

function createSwampPrefab() {
  const group = new THREE.Group();
  const trunkHeight = VOXEL_SIZE * 5.5;
  group.add(makeBlock(barkMaterial, VOXEL_SIZE * 0.7, trunkHeight, VOXEL_SIZE * 0.7, 0, 0, 0));
  group.add(makeBlock(leafMaterialSwamp, VOXEL_SIZE * 3.6, VOXEL_SIZE * 1.3, VOXEL_SIZE * 3.6, 0, trunkHeight - VOXEL_SIZE * 0.2, 0));
  group.add(makeBlock(leafMaterialSwamp, VOXEL_SIZE * 2.8, VOXEL_SIZE * 1.1, VOXEL_SIZE * 2.8, 0, trunkHeight + VOXEL_SIZE * 0.9, 0));
  group.add(makeBlock(leafMaterialSwamp, VOXEL_SIZE * 2.4, VOXEL_SIZE * 1, VOXEL_SIZE * 2.4, 0, trunkHeight + VOXEL_SIZE * 1.6, 0));
  return group;
}

function createCactusPrefab() {
  const group = new THREE.Group();
  const segments = 4;
  for (let i = 0; i < segments; i++) {
    group.add(makeBlock(cactusMaterial, VOXEL_SIZE * 0.8, VOXEL_SIZE * 1.5, VOXEL_SIZE * 0.8, 0, i * VOXEL_SIZE * 1.5, 0));
  }
  group.add(makeBlock(cactusMaterial, VOXEL_SIZE * 0.6, VOXEL_SIZE * 1.2, VOXEL_SIZE * 0.6, VOXEL_SIZE, VOXEL_SIZE * 3, 0));
  group.add(makeBlock(cactusMaterial, VOXEL_SIZE * 0.6, VOXEL_SIZE * 1.05, VOXEL_SIZE * 0.6, -VOXEL_SIZE, VOXEL_SIZE * 2.2, 0));
  return group;
}

const treePrefabs = {
  pine: createPinePrefab(),
  oak: createOakPrefab(),
  birch: createBirchPrefab(),
  palm: createPalmPrefab(),
  dead: createDeadTreePrefab(),
  swamp: createSwampPrefab(),
  cactus: createCactusPrefab(),
};

function createCastleStructure(scale = 1) {
  const castle = new THREE.Group();
  const keepWidth = VOXEL_SIZE * 5 * scale;
  const keepHeight = VOXEL_SIZE * 8 * scale;
  const keepDepth = VOXEL_SIZE * 5 * scale;
  castle.add(makeBlock(stoneMaterial, keepWidth, keepHeight, keepDepth, 0, 0, 0));
  const towerSize = VOXEL_SIZE * 1.6 * scale;
  const towerHeight = keepHeight + VOXEL_SIZE * 2 * scale;
  const offsets = [
    [keepWidth * 0.65, keepDepth * 0.65],
    [-keepWidth * 0.65, keepDepth * 0.65],
    [keepWidth * 0.65, -keepDepth * 0.65],
    [-keepWidth * 0.65, -keepDepth * 0.65],
  ];
  offsets.forEach(([ox, oz]) => {
    castle.add(makeBlock(darkStoneMaterial, towerSize, towerHeight, towerSize, ox, VOXEL_SIZE * 0.2 * scale, oz));
    const crenellationCount = 3;
    for (let i = 0; i < crenellationCount; i++) {
      const offset = -towerSize * 0.5 + (i / (crenellationCount - 1)) * towerSize;
      castle.add(makeBlock(stoneMaterial, towerSize * 0.3, VOXEL_SIZE * 0.6 * scale, towerSize * 0.3, ox + offset * 0.2, towerHeight - VOXEL_SIZE * 0.2 * scale, oz));
    }
  });
  const wallHeight = VOXEL_SIZE * 3.2 * scale;
  const wallThickness = VOXEL_SIZE * 0.8 * scale;
  castle.add(makeBlock(stoneMaterial, keepWidth * 1.6, wallHeight, wallThickness, 0, VOXEL_SIZE * 0.1, keepDepth));
  castle.add(makeBlock(stoneMaterial, keepWidth * 1.6, wallHeight, wallThickness, 0, VOXEL_SIZE * 0.1, -keepDepth));
  castle.add(makeBlock(stoneMaterial, wallThickness, wallHeight, keepDepth * 1.6, keepWidth, VOXEL_SIZE * 0.1, 0));
  castle.add(makeBlock(stoneMaterial, wallThickness, wallHeight, keepDepth * 1.6, -keepWidth, VOXEL_SIZE * 0.1, 0));
  castle.add(makeBlock(darkStoneMaterial, keepWidth * 0.4, wallHeight * 0.9, wallThickness * 0.8, 0, 0, keepDepth + wallThickness * 0.3));
  return castle;
}

function createRuinStructure(scale = 1) {
  const ruin = new THREE.Group();
  const wallLength = VOXEL_SIZE * 6 * scale;
  const wallHeight = VOXEL_SIZE * 3.2 * scale;
  const gap = VOXEL_SIZE * 1.2 * scale;
  ruin.add(makeBlock(mossyStoneMaterial, wallLength, wallHeight, VOXEL_SIZE * 0.7 * scale, 0, 0, 0));
  ruin.add(makeBlock(mossyStoneMaterial, VOXEL_SIZE * 0.7 * scale, wallHeight * 0.8, wallLength * 0.6, wallLength * 0.5 - gap, 0, 0));
  ruin.add(makeBlock(mossyStoneMaterial, VOXEL_SIZE * 0.7 * scale, wallHeight * 0.6, wallLength * 0.5, -wallLength * 0.4, 0, 0));
  const pillarCount = 3;
  for (let i = 0; i < pillarCount; i++) {
    const offset = -wallLength * 0.4 + (i / (pillarCount - 1)) * wallLength * 0.8;
    const height = wallHeight * (0.4 + Math.random() * 0.3);
    ruin.add(makeBlock(darkStoneMaterial, VOXEL_SIZE * 0.5 * scale, height, VOXEL_SIZE * 0.5 * scale, offset, 0, wallLength * 0.3));
  }
  return ruin;
}

function createCaveEntranceStructure(scale = 1) {
  const cave = new THREE.Group();
  const archWidth = VOXEL_SIZE * 4.5 * scale;
  const archHeight = VOXEL_SIZE * 4 * scale;
  const thickness = VOXEL_SIZE * 1.6 * scale;
  cave.add(makeBlock(darkStoneMaterial, thickness, archHeight, thickness * 2.2, -archWidth * 0.5, 0, 0));
  cave.add(makeBlock(darkStoneMaterial, thickness, archHeight, thickness * 2.2, archWidth * 0.5, 0, 0));
  const archLayers = 3;
  for (let i = 0; i < archLayers; i++) {
    const layerWidth = archWidth - i * VOXEL_SIZE * 0.8 * scale;
    cave.add(makeBlock(darkStoneMaterial, layerWidth, VOXEL_SIZE * 0.7 * scale, thickness * 1.2, 0, archHeight - i * VOXEL_SIZE * 0.6 * scale, 0));
  }
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(archWidth * 0.9, archHeight * 0.7), caveHoleMaterial);
  mouth.position.set(0, archHeight * 0.5, -thickness * 0.4);
  mouth.rotation.y = Math.PI;
  mouth.castShadow = false;
  mouth.receiveShadow = false;
  cave.add(mouth);
  cave.add(makeBlock(mossyStoneMaterial, archWidth * 0.8, VOXEL_SIZE * 0.6 * scale, thickness * 0.8, 0, VOXEL_SIZE * 0.2, thickness));
  return cave;
}

function spawnTree(type, scale = 1) {
  const prefab = treePrefabs[type];
  if (!prefab) return null;
  const tree = prefab.clone(true);
  const s = scale * (0.85 + Math.random() * 0.35);
  tree.scale.setScalar(s);
  tree.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return tree;
}

function registerFoliage(mesh, radius = TREE_VIEW_RADIUS, allowInstanced = false, center = null) {
  if (!mesh || (mesh.isInstancedMesh && !allowInstanced)) return;
  const r = radius;
  foliageActors.push({ mesh, radius: r, radiusSq: r * r, center: center ? center.clone() : null });
}

function chooseTreeType(biome, altitude) {
  switch (biome.type) {
    case 'desert':
      return Math.random() < 0.7 ? 'cactus' : null;
    case 'savanna':
      return Math.random() < 0.45 ? 'palm' : 'dead';
    case 'swamp':
      return 'swamp';
    case 'shore':
      return 'palm';
    case 'pine':
      return 'pine';
    case 'tundra':
      return Math.random() < 0.5 ? 'pine' : 'dead';
    case 'highlands':
      return altitude > 0.75 ? 'dead' : 'pine';
    case 'meadow':
      return Math.random() < 0.6 ? 'birch' : 'oak';
    case 'forest':
    default:
      return Math.random() < 0.5 ? 'oak' : 'pine';
  }
}

function createBushMesh(material, scale = 1) {
  const bush = new THREE.Group();
  const pieces = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < pieces; i++) {
    const width = VOXEL_SIZE * (1 + Math.random() * 1.2) * scale;
    const height = VOXEL_SIZE * (0.8 + Math.random() * 0.8) * scale;
    const depth = VOXEL_SIZE * (1 + Math.random() * 1.2) * scale;
    const offsetX = (Math.random() - 0.5) * width * 0.8;
    const offsetZ = (Math.random() - 0.5) * depth * 0.8;
    const chunk = makeBlock(material, width, height, depth, offsetX, height * i * 0.02, offsetZ);
    chunk.castShadow = false;
    chunk.receiveShadow = false;
    bush.add(chunk);
  }
  return bush;
}

function createRockCluster(darker = false) {
  const rock = new THREE.Group();
  const pieces = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < pieces; i++) {
    const material = darker || i % 2 === 0 ? rockDarkMaterial : rockMaterial;
    const width = VOXEL_SIZE * (1 + Math.random() * 2.4);
    const height = VOXEL_SIZE * (0.6 + Math.random() * 1.8);
    const depth = VOXEL_SIZE * (1 + Math.random() * 2.4);
    const offsetX = (Math.random() - 0.5) * width * 0.6;
    const offsetZ = (Math.random() - 0.5) * depth * 0.6;
    rock.add(makeBlock(material, width, height, depth, offsetX, 0, offsetZ));
  }
  return rock;
}

async function scatterTrees(attempts) {
  const trees = new THREE.Group();
  let placed = 0;
  let tries = 0;
  const maxTries = attempts * 4;
  while (placed < attempts && tries < maxTries) {
    tries++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.6;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.6;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height < SEA_LEVEL + VOXEL_SIZE * 0.2) continue;
    const slope = slopeField[idx];
    if (slope > TREE_MAX_SLOPE) continue;
    const biome = biomeGrid[idx] ?? biomeAt(hx, hz);
    const altitude = height / ALTITUDE_SCALE;
    const treeType = chooseTreeType(biome, altitude);
    if (!treeType) continue;
    const tree = spawnTree(treeType, 1 + altitude * 0.15);
    if (!tree) continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    tree.position.set(px, height, pz);
    tree.rotation.y = Math.random() * Math.PI * 2;
    trees.add(tree);
    registerFoliage(tree, TREE_VIEW_RADIUS);
    placed++;
    if (placed % 80 === 0) {
      await nextFrame();
    }
  }
  foliageStats.trees = placed;
  return trees;
}

async function scatterShrubs(count) {
  const shrubs = new THREE.Group();
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 5;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.9;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.9;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height < SEA_LEVEL - VOXEL_SIZE * 0.4) continue;
    const slope = slopeField[idx];
    if (slope > SHRUB_MAX_SLOPE) continue;
    const biome = biomeGrid[idx] ?? biomeAt(hx, hz);
    const altitude = height / ALTITUDE_SCALE;
    let mesh = null;
    if (biome.type === 'desert') {
      if (Math.random() > 0.3) continue;
      mesh = spawnTree('cactus', 0.5 + Math.random() * 0.4);
    } else if (biome.type === 'swamp') {
      mesh = createBushMesh(leafMaterialSwamp, 0.8);
    } else if (biome.type === 'savanna') {
      mesh = createBushMesh(leafMaterialDry, 0.8);
    } else {
      mesh = createBushMesh(leafMaterialBright, 0.65 + altitude * 0.25);
    }
    if (!mesh) continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    mesh.position.set(px, height, pz);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    shrubs.add(mesh);
    registerFoliage(mesh, SHRUB_VIEW_RADIUS);
    placed++;
    if (placed % 120 === 0) await nextFrame();
  }
  foliageStats.shrubs = placed;
  return shrubs;
}

async function scatterRocks(count) {
  const rocks = new THREE.Group();
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 5;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.9;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.9;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height) continue;
    const slope = slopeField[idx];
    if (slope < ROCK_SLOPE_RANGE[0] || slope > ROCK_SLOPE_RANGE[1]) continue;
    const biome = biomeGrid[idx] ?? biomeAt(hx, hz);
    const mesh = createRockCluster(biome.type === 'highlands' || biome.type === 'tundra');
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    mesh.position.set(px, height, pz);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    rocks.add(mesh);
    registerFoliage(mesh, ROCK_VIEW_RADIUS);
    placed++;
    if (placed % 80 === 0) await nextFrame();
  }
  foliageStats.rocks = placed;
  return rocks;
}

async function scatterFlowersInstanced(count) {
  const colorBuckets = flowerMaterials.map(() => []);
  let attempts = 0;
  let placed = 0;
  const maxAttempts = count * 6;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.7;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.7;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height > FLOWER_ALTITUDE_LIMIT || height < SEA_LEVEL - VOXEL_SIZE * 0.2) continue;
    const slope = slopeField[idx];
    if (slope > FLOWER_MAX_SLOPE) continue;
    const biome = biomeGrid[idx] ?? biomeAt(hx, hz);
    if (biome.type === 'desert' || biome.type === 'tundra' || biome.type === 'swamp') continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const colorIndex = Math.floor(Math.random() * flowerMaterials.length);
    const bloomHeight = VOXEL_SIZE * (0.9 + Math.random() * 0.8);
    colorBuckets[colorIndex].push({
      position: new THREE.Vector3(px, height + bloomHeight * 0.5, pz),
      height: bloomHeight,
      rotation: Math.random() * Math.PI * 2,
    });
    placed++;
    if (placed % 200 === 0) await nextFrame();
  }
  foliageStats.flowers = placed;
  const meshes = [];
  colorBuckets.forEach((placements, idx) => {
    if (!placements.length) return;
    const instanced = new THREE.InstancedMesh(blockGeometry, flowerMaterials[idx], placements.length);
    const center = new THREE.Vector3();
    placements.forEach((placement, instanceIdx) => {
      instanceDummy.position.copy(placement.position);
      instanceDummy.scale.set(VOXEL_SIZE * 0.25, placement.height, VOXEL_SIZE * 0.25);
      instanceDummy.rotation.set(0, placement.rotation, 0);
      instanceDummy.updateMatrix();
      instanced.setMatrixAt(instanceIdx, instanceDummy.matrix);
      center.add(placement.position);
    });
    instanced.count = placements.length;
    instanced.instanceMatrix.needsUpdate = true;
    instanced.castShadow = false;
    instanced.receiveShadow = false;
    center.multiplyScalar(1 / placements.length);
    registerFoliage(instanced, FLOWER_VIEW_RADIUS, true, center);
    meshes.push(instanced);
  });
  return meshes;
}

async function scatterGrassInstanced(count) {
  if (count <= 0) return null;
  const placements = [];
  let attempts = 0;
  let placed = 0;
  const maxAttempts = count * 4;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.8;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.8;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height < SEA_LEVEL - VOXEL_SIZE * 0.2) continue;
    const slope = slopeField[idx];
    if (slope > FLOWER_MAX_SLOPE) continue;
    const biome = biomeGrid[idx] ?? biomeAt(hx, hz);
    if (biome.type === 'desert' || biome.type === 'tundra') continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const bladeHeight = VOXEL_SIZE * (0.8 + Math.random() * 0.9);
    placements.push({
      position: new THREE.Vector3(px, height + bladeHeight * 0.5, pz),
      height: bladeHeight,
      rotation: Math.random() * Math.PI,
    });
    placed++;
    if (placed % 250 === 0) await nextFrame();
  }
  foliageStats.grass = placements.length;
  if (!placements.length) return null;
  const instanced = new THREE.InstancedMesh(blockGeometry, grassBladeMaterial, placements.length);
  const center = new THREE.Vector3();
  placements.forEach((placement, idx) => {
    instanceDummy.position.copy(placement.position);
    instanceDummy.scale.set(VOXEL_SIZE * 0.12, placement.height, VOXEL_SIZE * 0.18);
    instanceDummy.rotation.set(0, placement.rotation, 0);
    instanceDummy.updateMatrix();
    instanced.setMatrixAt(idx, instanceDummy.matrix);
    center.add(placement.position);
  });
  instanced.count = placements.length;
  instanced.instanceMatrix.needsUpdate = true;
  instanced.castShadow = false;
  instanced.receiveShadow = false;
  center.multiplyScalar(1 / placements.length);
  registerFoliage(instanced, GRASS_VIEW_RADIUS, true, center);
  return instanced;
}

async function scatterCastles(count) {
  const castles = new THREE.Group();
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 30;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.2;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.2;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height < SEA_LEVEL + VOXEL_SIZE * 2) continue;
    const slope = slopeField[idx];
    if (slope > 1.2) continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const castle = createCastleStructure(0.85 + Math.random() * 0.4);
    castle.position.set(px, height, pz);
    castle.rotation.y = Math.random() * Math.PI * 2;
    castles.add(castle);
    registerFoliage(castle, TREE_VIEW_RADIUS * 1.25);
    placed++;
    if (placed % 2 === 0) await nextFrame();
  }
  foliageStats.castles = placed;
  return castles;
}

async function scatterRuins(count) {
  const ruins = new THREE.Group();
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 24;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.3;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.3;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height < SEA_LEVEL + VOXEL_SIZE * 0.6) continue;
    const slope = slopeField[idx];
    if (slope > 1.6) continue;
    const biome = biomeGrid[idx] ?? biomeAt(hx, hz);
    if (biome.type === 'swamp') continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const ruin = createRuinStructure(0.9 + Math.random() * 0.5);
    ruin.position.set(px, height, pz);
    ruin.rotation.y = Math.random() * Math.PI * 2;
    ruins.add(ruin);
    registerFoliage(ruin, TREE_VIEW_RADIUS);
    placed++;
    if (placed % 3 === 0) await nextFrame();
  }
  foliageStats.ruins = placed;
  return ruins;
}

async function scatterCaves(count) {
  const caves = new THREE.Group();
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 30;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.4;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 1.4;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const idx = hz * CHUNK_SIZE + hx;
    const height = columnHeights[idx] * VOXEL_SIZE;
    if (!height || height < SEA_LEVEL + VOXEL_SIZE * 0.8) continue;
    const slope = slopeField[idx];
    if (slope < 1.2 || slope > 4.5) continue;
    const px = (hx - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const pz = (hz - CHUNK_SIZE / 2 + 0.5) * VOXEL_SIZE;
    const cave = createCaveEntranceStructure(0.9 + Math.random() * 0.4);
    cave.position.set(px, height, pz);
    cave.rotation.y = Math.random() * Math.PI * 2;
    caves.add(cave);
    registerFoliage(cave, TREE_VIEW_RADIUS * 0.9);
    placed++;
    if (placed % 2 === 0) await nextFrame();
  }
  foliageStats.caves = placed;
  return caves;
}

async function buildRivers(count) {
  let created = 0;
  for (let i = 0; i < count; i++) {
    const path = generateRiverPath();
    if (!path) continue;
    const curve = new THREE.CatmullRomCurve3(path);
    const segments = Math.max(24, path.length * 6);
    const geometry = new THREE.TubeGeometry(curve, segments, VOXEL_SIZE * 0.65, 6, false);
    const mesh = new THREE.Mesh(geometry, riverMaterial.clone());
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    riverGroup.add(mesh);
    const midPoint = curve.getPoint(0.5);
    registerFoliage(mesh, TREE_VIEW_RADIUS * 1.5, false, midPoint);
    created++;
    await nextFrame();
  }
  foliageStats.rivers = created;
}

function generateRiverPath() {
  const start = pickRiverStart();
  if (!start) return null;
  const path = [];
  let wx = start.x;
  let wz = start.z;
  riverDirection.set(Math.random() - 0.5, Math.random() - 0.5).normalize();
  const stepLength = VOXEL_SIZE * 6;
  const maxSteps = 60;
  for (let i = 0; i < maxSteps; i++) {
    const height = sampleTerrainHeightWorld(wx, wz);
    if (height < SEA_LEVEL - VOXEL_SIZE) break;
    path.push(new THREE.Vector3(wx, height + 0.05, wz));
    riverDirection.lerp(sampleDownhillDirection(wx, wz), 0.4).normalize();
    const jitter = (Math.random() - 0.5) * 0.5;
    const cos = Math.cos(jitter);
    const sin = Math.sin(jitter);
    const dx = riverDirection.x * cos - riverDirection.y * sin;
    const dz = riverDirection.x * sin + riverDirection.y * cos;
    riverDirection.set(dx, dz).normalize();
    wx += riverDirection.x * stepLength;
    wz += riverDirection.y * stepLength;
    if (Math.abs(wx) > CHUNK_SIZE * VOXEL_SIZE || Math.abs(wz) > CHUNK_SIZE * VOXEL_SIZE) break;
  }
  return path.length >= 4 ? path : null;
}

function pickRiverStart() {
  for (let i = 0; i < 200; i++) {
    const tx = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 0.8;
    const tz = (Math.random() - 0.5) * CHUNK_SIZE * VOXEL_SIZE * 0.8;
    const hx = Math.floor(tx / VOXEL_SIZE + CHUNK_SIZE / 2);
    const hz = Math.floor(tz / VOXEL_SIZE + CHUNK_SIZE / 2);
    if (hx < 0 || hz < 0 || hx >= CHUNK_SIZE || hz >= CHUNK_SIZE) continue;
    const height = heightField[hz * CHUNK_SIZE + hx];
    if (height > SEA_LEVEL + VOXEL_SIZE * 4) {
      return { x: tx, z: tz };
    }
  }
  return null;
}

function createCloudLayer(count) {
  const halfSpan = cloudSpan * 0.5;
  for (let i = 0; i < count; i++) {
    const cluster = new THREE.Group();
    const blockCount = 4 + Math.floor(Math.random() * 4);
    const baseSize = VOXEL_SIZE * (3 + Math.random() * 2);
    for (let b = 0; b < blockCount; b++) {
      const block = new THREE.Mesh(cloudBlockGeometry, cloudMaterial);
      const width = baseSize * (0.8 + Math.random() * 0.6);
      const depth = baseSize * (0.8 + Math.random() * 0.6);
      const height = VOXEL_SIZE * (1.4 + Math.random() * 0.6);
      block.scale.set(width, height, depth);
      block.position.set(
        Math.round((Math.random() - 0.5) * 4) * baseSize * 0.6,
        Math.round((Math.random() - 0.5) * 2) * VOXEL_SIZE * 0.8,
        Math.round((Math.random() - 0.5) * 4) * baseSize * 0.6
      );
      cluster.add(block);
    }
    cluster.position.set(
      (Math.random() - 0.5) * cloudSpan,
      CLOUD_ALTITUDE + Math.random() * VOXEL_SIZE * 12,
      (Math.random() - 0.5) * cloudSpan
    );
    cluster.rotation.y = 0;
    cloudGroup.add(cluster);
    cloudSpeeds.push(THREE.MathUtils.lerp(CLOUD_MIN_SPEED, CLOUD_MAX_SPEED, Math.random()));
  }
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

setLoading(0.72, 'Planting forests...');
const treeGroup = await scatterTrees(TREE_ATTEMPTS);
scene.add(treeGroup);
setLoading(0.78, 'Growing shrubs...');
const shrubGroup = await scatterShrubs(SHRUB_ATTEMPTS);
scene.add(shrubGroup);
setLoading(0.83, 'Scattering rocks...');
const rockGroup = await scatterRocks(ROCK_ATTEMPTS);
scene.add(rockGroup);
setLoading(0.87, 'Blooming flowers...');
const flowerMeshes = await scatterFlowersInstanced(FLOWER_ATTEMPTS);
flowerMeshes.forEach((mesh) => scene.add(mesh));
setLoading(0.91, 'Growing grass...');
const grassMesh = await scatterGrassInstanced(GRASS_ATTEMPTS);
if (grassMesh) scene.add(grassMesh);
setLoading(0.94, 'Raising monuments...');
const castles = await scatterCastles(CASTLE_COUNT);
structureGroup.add(castles);
const ruins = await scatterRuins(RUIN_COUNT);
structureGroup.add(ruins);
const caves = await scatterCaves(CAVE_COUNT);
structureGroup.add(caves);
setLoading(0.97, 'Carving rivers...');
await buildRivers(RIVER_COUNT);
const totalFoliage =
  foliageStats.trees +
  foliageStats.shrubs +
  foliageStats.rocks +
  foliageStats.flowers +
  foliageStats.grass +
  foliageStats.castles +
  foliageStats.ruins +
  foliageStats.caves +
  foliageStats.rivers;
const statsSummary = { ...foliageStats, totalFoliage };
console.table(statsSummary);
globalThis.__foliageStats = statsSummary;

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

if (isMobile) {
  setupMobileControls();
}

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
  if (isMobile) return;
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
  if (!isMobile && !controls.isLocked) {
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
  if (!isMobile && !controls.isLocked) return;
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
  updateClouds(delta);

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

  foliageCullOrigin.copy(controls.getObject().position);
  updateFoliageVisibility(foliageCullOrigin);

  renderer.render(scene, camera);
}

resizeRenderer();
animate();
