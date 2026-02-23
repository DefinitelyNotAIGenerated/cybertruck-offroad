/* ─── Minecraft-Style Cybertruck + Vehicle Physics ─── */

import * as THREE from 'three';
import { getHeightAt, getNormalAt } from './terrain.js';
import { input } from './input.js';

function makeMat(color) {
    return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/**
 * Build a blocky, Minecraft-style Cybertruck out of box primitives.
 */
export function createCybertruck() {
    const group = new THREE.Group();

    // ── Body (main slab) ──
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.2, 5.0);
    const bodyMat = makeMat(0xb0b0b0);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    // ── Cabin top ──
    const cabinGeo = new THREE.BoxGeometry(2.2, 0.9, 2.8);
    const cabinMat = makeMat(0xa0a0a0);
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.85, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // ── Windshield (dark glass) ──
    const windshieldGeo = new THREE.BoxGeometry(2.0, 0.7, 0.15);
    const windshieldMat = makeMat(0x222233);
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 1.9, 1.2);
    group.add(windshield);

    // ── Rear window ──
    const rearGeo = new THREE.BoxGeometry(2.0, 0.6, 0.15);
    const rearMat = makeMat(0x222233);
    const rearWindow = new THREE.Mesh(rearGeo, rearMat);
    rearWindow.position.set(0, 1.85, -1.6);
    group.add(rearWindow);

    // ── Bed ──
    const bedGeo = new THREE.BoxGeometry(2.2, 0.3, 1.6);
    const bedMat = makeMat(0x909090);
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(0, 1.05, -2.0);
    bed.castShadow = true;
    group.add(bed);

    // ── Bumper front ──
    const bumperGeo = new THREE.BoxGeometry(2.6, 0.4, 0.3);
    const bumperMat = makeMat(0x333333);
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, 0.5, 2.6);
    group.add(bumper);

    // ── Headlight bar ──
    const lightBarGeo = new THREE.BoxGeometry(2.5, 0.1, 0.1);
    const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    lightBar.position.set(0, 1.15, 2.55);
    group.add(lightBar);

    // ── Tail lights ──
    const tailGeo = new THREE.BoxGeometry(2.4, 0.08, 0.08);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const tailLight = new THREE.Mesh(tailGeo, tailMat);
    tailLight.position.set(0, 1.1, -2.55);
    group.add(tailLight);

    // ── Wheels (blocky boxes) ──
    const wheelGeo = new THREE.BoxGeometry(0.5, 0.6, 0.6);
    const wheelMat = makeMat(0x1a1a1a);

    const wheelPositions = [
        new THREE.Vector3(-1.3, 0.35, 1.5),
        new THREE.Vector3(1.3, 0.35, 1.5),
        new THREE.Vector3(-1.3, 0.35, -1.5),
        new THREE.Vector3(1.3, 0.35, -1.5),
    ];

    const wheels = wheelPositions.map(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.copy(pos);
        wheel.castShadow = true;
        group.add(wheel);
        return wheel;
    });

    group.position.set(0, 0, 0);
    return { group, wheels };
}

/**
 * Arcade vehicle physics — Minecraft feel (slower, chunkier).
 * Tuning from original: acceleration=7, maxSpeed=40, reverse=10.
 */
export class VehiclePhysics {
    constructor(group, wheels) {
        this.group = group;
        this.wheels = wheels;
        this.speed = 0;
        this.heading = 0;
        this.grounded = true;
        this.verticalVelocity = 0;

        // Tuning matching the Minecraft overhaul values
        this.maxSpeed = 40;
        this.reverseMax = 10;
        this.acceleration = 7;
        this.brakeForce = 20;
        this.friction = 5;
        this.turnSpeed = 2.0;
        this.gravity = -30;

        // Place on terrain
        const startHeight = getHeightAt(0, 0);
        this.group.position.y = startHeight + 0.6;
    }

    update(dt) {
        dt = Math.min(dt, 0.05);

        // ── Acceleration / Braking ──
        if (input.forward) {
            this.speed += this.acceleration * dt;
        } else if (input.brake) {
            if (this.speed > 1) {
                this.speed -= this.brakeForce * dt;
            } else {
                this.speed -= this.acceleration * 0.5 * dt;
            }
        } else {
            // Friction deceleration
            if (Math.abs(this.speed) < 0.3) {
                this.speed = 0;
            } else {
                this.speed -= Math.sign(this.speed) * this.friction * dt;
            }
        }

        // Clamp
        this.speed = THREE.MathUtils.clamp(this.speed, -this.reverseMax, this.maxSpeed);

        // ── Steering ──
        if (Math.abs(this.speed) > 0.5) {
            const turnFactor = Math.min(1, Math.abs(this.speed) / 12);
            if (input.left) {
                this.heading += this.turnSpeed * turnFactor * dt;
            }
            if (input.right) {
                this.heading -= this.turnSpeed * turnFactor * dt;
            }
        }

        // ── Movement (forward = +Z in local space) ──
        const dx = Math.sin(this.heading) * this.speed * dt;
        const dz = Math.cos(this.heading) * this.speed * dt;

        this.group.position.x += dx;
        this.group.position.z += dz;

        // ── Terrain following ──
        const terrainHeight = getHeightAt(this.group.position.x, this.group.position.z);
        const groundLevel = terrainHeight + 0.6;

        if (this.group.position.y > groundLevel + 0.5) {
            // Airborne
            this.verticalVelocity += this.gravity * dt;
            this.group.position.y += this.verticalVelocity * dt;
            this.grounded = false;

            if (this.group.position.y <= groundLevel) {
                this.group.position.y = groundLevel;
                this.verticalVelocity = 0;
                this.grounded = true;
            }
        } else {
            // Smooth terrain follow with interpolation
            const targetY = groundLevel;
            this.group.position.y += (targetY - this.group.position.y) * Math.min(1, 8 * dt);
            this.verticalVelocity = 0;
            this.grounded = true;
        }

        // ── Rotation ──
        this.group.rotation.y = this.heading;

        // Tilt to match terrain
        const normal = getNormalAt(this.group.position.x, this.group.position.z);
        const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

        const pitchDot = -(normal.x * forward.x + normal.z * forward.z);
        const rollDot = normal.x * right.x + normal.z * right.z;

        const targetPitch = Math.asin(THREE.MathUtils.clamp(pitchDot, -0.4, 0.4));
        const targetRoll = Math.asin(THREE.MathUtils.clamp(rollDot, -0.4, 0.4));

        this.group.rotation.x += (targetPitch - this.group.rotation.x) * Math.min(1, 5 * dt);
        this.group.rotation.z += (targetRoll - this.group.rotation.z) * Math.min(1, 5 * dt);

        // ── World bounds ──
        const halfWorld = 190;
        this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -halfWorld, halfWorld);
        this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -halfWorld, halfWorld);
    }

    getSpeedKmh() {
        return Math.abs(Math.round(this.speed * 3.6));
    }

    getGear() {
        if (this.speed < -0.5) return 'R';
        if (this.speed < 0.5) return 'N';
        if (this.speed < 10) return '1';
        if (this.speed < 20) return '2';
        if (this.speed < 30) return '3';
        return '4';
    }
}
