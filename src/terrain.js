/* ─── Minecraft-Style Stepped Terrain ─── */

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export const WORLD_SIZE = 400;

const SEGMENTS = 256;
const STEP_HEIGHT = 1.0;

// Deterministic noise layers
const noise1 = createNoise2D(() => 0.1234);
const noise2 = createNoise2D(() => 0.5678);
const noise3 = createNoise2D(() => 0.9012);

/**
 * Raw continuous height sample from layered noise.
 */
function rawHeight(x, z) {
    let h = 0;
    h += noise1(x * 0.005, z * 0.005) * 25;   // broad rolling hills
    h += noise2(x * 0.015, z * 0.015) * 10;   // medium detail
    h += noise3(x * 0.04, z * 0.04) * 4;      // fine bumps
    return h;
}

/**
 * Stepped (quantized) height for Minecraft look.
 */
export function getHeightAt(x, z) {
    return Math.floor(rawHeight(x, z) / STEP_HEIGHT) * STEP_HEIGHT;
}

/**
 * Approximate surface normal at (x, z) via finite differences.
 */
export function getNormalAt(x, z) {
    const eps = 0.5;
    const hL = getHeightAt(x - eps, z);
    const hR = getHeightAt(x + eps, z);
    const hD = getHeightAt(x, z - eps);
    const hU = getHeightAt(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
    normal.normalize();
    return normal;
}

/**
 * Build terrain mesh using PlaneGeometry with vertex displacement.
 */
export function createTerrain() {
    const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
    geometry.rotateX(-Math.PI / 2); // lay flat (Y-up)

    const pos = geometry.attributes.position;
    const colors = [];

    // Color palette
    const grassColor = new THREE.Color(0x567d46);
    const dirtColor = new THREE.Color(0x8b6c42);
    const stoneColor = new THREE.Color(0x888888);
    const snowColor = new THREE.Color(0xdddddd);
    const sandColor = new THREE.Color(0xc2b280);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);

        // Displace Y to stepped height
        const h = getHeightAt(x, z);
        pos.setY(i, h);

        // Color by height / slope
        let color;
        if (h > 28) {
            color = snowColor;
        } else if (h > 20) {
            color = stoneColor;
        } else if (h < -8) {
            color = sandColor;
        } else {
            const normal = getNormalAt(x, z);
            color = normal.y > 0.85 ? grassColor : dirtColor;
        }
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
}
