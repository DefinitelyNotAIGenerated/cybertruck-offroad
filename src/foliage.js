/* ─── Minecraft-Style Foliage System ─── */

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { getHeightAt, getNormalAt, WORLD_SIZE } from './terrain.js';

const foliageNoise = createNoise2D(() => 0.42);

// Shared flat-shading box helper
function makeMat(color) {
    return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

// ── Oak Trees (Minecraft-style: block trunk + cube leaf canopy) ──
function createOakTrees(scene) {
    const count = 600;

    // Trunk: tall narrow box
    const trunkGeo = new THREE.BoxGeometry(0.5, 3, 0.5);
    const trunkMat = makeMat(0x6b4226);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkMesh.castShadow = true;

    // Leaves: chunky cube
    const leafGeo = new THREE.BoxGeometry(2.8, 2.4, 2.8);
    const leafMat = makeMat(0x3a8c2e);
    const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
    leafMesh.castShadow = true;

    // Leaf top layer (smaller)
    const leafTopGeo = new THREE.BoxGeometry(1.8, 1.2, 1.8);
    const leafTopMat = makeMat(0x2e7a24);
    const leafTopMesh = new THREE.InstancedMesh(leafTopGeo, leafTopMat, count);
    leafTopMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let attempt = 0; attempt < count * 5 && placed < count; attempt++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.88;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.88;

        const density = foliageNoise(x * 0.008, z * 0.008);
        if (density < 0.0) continue;

        const height = getHeightAt(x, z);
        const normal = getNormalAt(x, z);
        if (normal.y < 0.85 || height > 28) continue;
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;

        const scale = 0.8 + Math.random() * 0.5;

        // Trunk
        dummy.position.set(x, height + 1.5 * scale, z);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(0, Math.random() * Math.PI * 0.5, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(placed, dummy.matrix);

        // Leaves
        dummy.position.y = height + 3.8 * scale;
        dummy.updateMatrix();
        leafMesh.setMatrixAt(placed, dummy.matrix);

        // Top leaves
        dummy.position.y = height + 5.2 * scale;
        dummy.updateMatrix();
        leafTopMesh.setMatrixAt(placed, dummy.matrix);

        placed++;
    }

    trunkMesh.count = placed;
    leafMesh.count = placed;
    leafTopMesh.count = placed;
    trunkMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
    leafTopMesh.instanceMatrix.needsUpdate = true;

    scene.add(trunkMesh);
    scene.add(leafMesh);
    scene.add(leafTopMesh);
}

// ── Spruce Trees (Minecraft-style: layered block canopy) ──
function createSpruceTrees(scene) {
    const count = 400;

    const trunkGeo = new THREE.BoxGeometry(0.4, 4, 0.4);
    const trunkMat = makeMat(0x4a2f1b);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkMesh.castShadow = true;

    // Three layers of decreasing leaf blocks
    const layer1Geo = new THREE.BoxGeometry(2.6, 1.4, 2.6);
    const layer2Geo = new THREE.BoxGeometry(2.0, 1.4, 2.0);
    const layer3Geo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
    const spruceMat = makeMat(0x1a5c22);

    const layer1Mesh = new THREE.InstancedMesh(layer1Geo, spruceMat, count);
    const layer2Mesh = new THREE.InstancedMesh(layer2Geo, spruceMat, count);
    const layer3Mesh = new THREE.InstancedMesh(layer3Geo, spruceMat, count);
    layer1Mesh.castShadow = true;
    layer2Mesh.castShadow = true;
    layer3Mesh.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let attempt = 0; attempt < count * 5 && placed < count; attempt++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.88;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.88;

        const density = foliageNoise(x * 0.01 + 100, z * 0.01 + 100);
        if (density < 0.1) continue;

        const height = getHeightAt(x, z);
        const normal = getNormalAt(x, z);
        if (normal.y < 0.85 || height > 30) continue;
        if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

        const scale = 0.7 + Math.random() * 0.5;

        // Trunk
        dummy.position.set(x, height + 2 * scale, z);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(placed, dummy.matrix);

        // Bottom layer
        dummy.position.y = height + 3.5 * scale;
        dummy.updateMatrix();
        layer1Mesh.setMatrixAt(placed, dummy.matrix);

        // Middle layer
        dummy.position.y = height + 4.9 * scale;
        dummy.updateMatrix();
        layer2Mesh.setMatrixAt(placed, dummy.matrix);

        // Top layer
        dummy.position.y = height + 6.0 * scale;
        dummy.updateMatrix();
        layer3Mesh.setMatrixAt(placed, dummy.matrix);

        placed++;
    }

    [trunkMesh, layer1Mesh, layer2Mesh, layer3Mesh].forEach(m => {
        m.count = placed;
        m.instanceMatrix.needsUpdate = true;
        scene.add(m);
    });
}

// ── Bushes (small leaf boxes on ground) ──
function createBushes(scene) {
    const count = 500;
    const bushGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
    const bushMat = makeMat(0x3d8c40);
    const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, count);
    bushMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let attempt = 0; attempt < count * 4 && placed < count; attempt++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.88;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.88;

        const height = getHeightAt(x, z);
        const normal = getNormalAt(x, z);
        if (normal.y < 0.8 || height > 22) continue;
        if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;

        const scale = 0.6 + Math.random() * 0.8;
        dummy.position.set(x, height + 0.4 * scale, z);
        dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.3), scale);
        dummy.rotation.set(0, Math.random() * Math.PI * 0.5, 0);
        dummy.updateMatrix();
        bushMesh.setMatrixAt(placed, dummy.matrix);
        placed++;
    }

    bushMesh.count = placed;
    bushMesh.instanceMatrix.needsUpdate = true;
    scene.add(bushMesh);
}

// ── Rocks (blocky cubes) ──
function createRocks(scene) {
    const count = 300;
    const rockGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
    const rockMat = makeMat(0x808080);
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, count);
    rockMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let attempt = 0; attempt < count * 4 && placed < count; attempt++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.92;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.92;

        const height = getHeightAt(x, z);
        if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;

        const rockChance = (height + 20) / 60;
        if (Math.random() > rockChance) continue;

        const scale = 0.4 + Math.random() * 0.9;
        dummy.position.set(x, height + 0.3 * scale, z);
        dummy.scale.set(scale, scale * (0.5 + Math.random() * 0.5), scale);
        dummy.rotation.set(0, Math.random() * Math.PI * 0.5, 0);
        dummy.updateMatrix();
        rockMesh.setMatrixAt(placed, dummy.matrix);
        placed++;
    }

    rockMesh.count = placed;
    rockMesh.instanceMatrix.needsUpdate = true;
    scene.add(rockMesh);
}

// ── Flowers / tall grass (small colored blocks) ──
function createFlowers(scene) {
    const count = 800;
    const flowerGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
    const colors = [0xd4e157, 0x66bb6a, 0x4caf50, 0x81c784];

    const meshes = colors.map(c => {
        const mat = makeMat(c);
        return new THREE.InstancedMesh(flowerGeo, mat, Math.floor(count / colors.length));
    });

    const dummy = new THREE.Object3D();
    const counters = new Array(colors.length).fill(0);

    for (let attempt = 0; attempt < count * 3; attempt++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.82;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.82;

        const height = getHeightAt(x, z);
        const normal = getNormalAt(x, z);
        if (normal.y < 0.9 || height > 18) continue;

        const colorIdx = Math.floor(Math.random() * colors.length);
        const max = Math.floor(count / colors.length);
        if (counters[colorIdx] >= max) continue;

        dummy.position.set(x, height + 0.3, z);
        dummy.scale.set(1, 0.7 + Math.random() * 0.6, 1);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();
        meshes[colorIdx].setMatrixAt(counters[colorIdx], dummy.matrix);
        counters[colorIdx]++;
    }

    meshes.forEach((m, i) => {
        m.count = counters[i];
        m.instanceMatrix.needsUpdate = true;
        scene.add(m);
    });
}

export function populateFoliage(scene) {
    createOakTrees(scene);
    createSpruceTrees(scene);
    createBushes(scene);
    createRocks(scene);
    createFlowers(scene);
}
