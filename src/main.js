/* ─── Main Entry Point ─── */

import * as THREE from 'three';
import { createTerrain } from './terrain.js';
import { VehiclePhysics } from './cybertruck.js';
import { buildVehicle } from './vehicles.js';
import { populateFoliage } from './foliage.js';
import { createChaseCamera } from './camera.js';
import { updateHUD, hideSplash, hideControlsHint } from './hud.js';
import { input } from './input.js';
import { isMobile } from './device.js';
import { initNetwork, sendState, getRemotePlayers } from './network.js';
import { GhostTruckManager } from './ghost-trucks.js';
import { CyberFM } from './audio-radio.js';

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ba4d8);
scene.fog = new THREE.FogExp2(0x7ba4d8, 0.003);

// ── Renderer ──
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

// ── Camera ──
const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.5,
    isMobile ? 500 : 800
);

// ── Lighting ──
const ambient = new THREE.AmbientLight(0xcccccc, 0.7);
scene.add(ambient);

const hemiLight = new THREE.HemisphereLight(0x7ba4d8, 0x567d46, 0.6);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(120, 180, 80);
sun.castShadow = true;
const shadowRes = isMobile ? 1024 : 2048;
sun.shadow.mapSize.width = shadowRes;
sun.shadow.mapSize.height = shadowRes;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 400;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.bias = -0.001;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3);
fillLight.position.set(-60, 40, -30);
scene.add(fillLight);

// ── Sky dome ──
const skyGeo = new THREE.SphereGeometry(400, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
        topColor: { value: new THREE.Color(0x4a80bd) },
        bottomColor: { value: new THREE.Color(0x9ec8e8) },
        offset: { value: 20 },
        exponent: { value: 0.5 },
    },
    vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// ── Terrain ──
console.log('Generating terrain...');
const terrain = createTerrain();
scene.add(terrain);

// ── Foliage ──
console.log('Placing foliage...');
populateFoliage(scene);

// ── Vehicle (spawned after car selection) ──
let truckGroup = null;
let wheels = null;
let vehicle = null;

const chaseCam = createChaseCamera(camera);
const shadowTarget = new THREE.Object3D();
scene.add(shadowTarget);
sun.target = shadowTarget;

// ── Multiplayer ──
console.log('Initializing multiplayer...');
initNetwork();
const ghostManager = new GhostTruckManager(scene);

// ── Dust particles ──
const dustCount = isMobile ? 80 : 200;
const dustGeo = new THREE.BufferGeometry();
const dustPositions = new Float32Array(dustCount * 3);
const dustVelocities = [];
for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = 0;
    dustPositions[i * 3 + 1] = -100;
    dustPositions[i * 3 + 2] = 0;
    dustVelocities.push(new THREE.Vector3());
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dustMat = new THREE.PointsMaterial({
    color: 0xc4a97d,
    size: 0.5,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
});
const dustParticles = new THREE.Points(dustGeo, dustMat);
scene.add(dustParticles);
let dustIndex = 0;

function emitDust(position, speed) {
    if (speed < 3) return;
    const count = Math.min(3, Math.floor(speed / 6));
    for (let i = 0; i < count; i++) {
        const idx = dustIndex % dustCount;
        dustPositions[idx * 3] = position.x + (Math.random() - 0.5) * 1.5;
        dustPositions[idx * 3 + 1] = position.y + 0.2;
        dustPositions[idx * 3 + 2] = position.z + (Math.random() - 0.5) * 1.5;
        dustVelocities[idx].set(
            (Math.random() - 0.5) * 2,
            0.8 + Math.random() * 1.5,
            (Math.random() - 0.5) * 2
        );
        dustIndex++;
    }
}

function updateDust(dt) {
    for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] += dustVelocities[i].x * dt;
        dustPositions[i * 3 + 1] += dustVelocities[i].y * dt;
        dustPositions[i * 3 + 2] += dustVelocities[i].z * dt;
        dustVelocities[i].y -= 2 * dt;
        dustVelocities[i].multiplyScalar(0.98);
    }
    dustGeo.attributes.position.needsUpdate = true;
}

// ── Game loop ──
const clock = new THREE.Clock();
let gameStarted = false;

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (!gameStarted || !vehicle) return;

    vehicle.update(dt);

    shadowTarget.position.copy(truckGroup.position);
    sun.position.set(
        truckGroup.position.x + 120,
        180,
        truckGroup.position.z + 80
    );

    if (vehicle.grounded) {
        emitDust(truckGroup.position, Math.abs(vehicle.speed));
    }
    updateDust(dt);

    chaseCam.update(dt, truckGroup, vehicle.speed);
    updateHUD(vehicle.getSpeedKmh(), vehicle.getGear());
    sendState(truckGroup, vehicle.speed);
    ghostManager.update(getRemotePlayers(), dt);

    renderer.render(scene, camera);
}

// ── Car Selection → Game Start ──
function startGame(vehicleType) {
    console.log('Building vehicle:', vehicleType);
    const built = buildVehicle(vehicleType);
    truckGroup = built.group;
    wheels = built.wheels;
    scene.add(truckGroup);
    vehicle = new VehiclePhysics(truckGroup, wheels, vehicleType);
    gameStarted = true;
    hideSplash();
    hideControlsHint();
    // Start CYBER FM radio station
    CyberFM.start();
}
// Expose globally so the inline non-module <script> in index.html can call it
window.startGame = startGame;
// Expose CyberFM for the mute button
window.CyberFM = CyberFM;

// ── Resize handler ──
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Start render loop (scene renders even before game starts) ──
console.log('Starting render loop...');
// Do an initial render so the terrain is visible behind the splash
renderer.render(scene, camera);
animate();
