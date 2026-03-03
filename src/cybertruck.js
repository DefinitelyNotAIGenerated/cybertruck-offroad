/* ─── Vehicle Physics ─── */

import * as THREE from 'three';
import { getHeightAt, getNormalAt } from './terrain.js';
import { input } from './input.js';
import { buildVehicle } from './vehicles.js';

// Re-export builder for backwards compat
export { buildVehicle };

/* Per-vehicle physics tuning */
const VEHICLE_TUNING = {
    cybertruck: {
        maxSpeed: 22, reverseMax: 6, acceleration: 4, brakeForce: 14,
        friction: 4, turnSpeed: 1.9, gravity: -28, groundOffset: 0.38,
    },
    ptcruiser: {
        maxSpeed: 18, reverseMax: 5, acceleration: 3.2, brakeForce: 12,
        friction: 4.5, turnSpeed: 2.2, gravity: -28, groundOffset: 0.36,
    },
    tank: {
        maxSpeed: 10, reverseMax: 3.5, acceleration: 2.2, brakeForce: 8,
        friction: 3.5, turnSpeed: 1.2, gravity: -30, groundOffset: 0.12,
    },
};

/**
 * Arcade vehicle physics.
 */
export class VehiclePhysics {
    constructor(group, wheels, vehicleType = 'cybertruck') {
        this.group = group;
        this.wheels = wheels;
        this.speed = 0;
        this.heading = 0;
        this.grounded = true;
        this.verticalVelocity = 0;

        const t = VEHICLE_TUNING[vehicleType] || VEHICLE_TUNING.cybertruck;
        this.maxSpeed = t.maxSpeed;
        this.reverseMax = t.reverseMax;
        this.acceleration = t.acceleration;
        this.brakeForce = t.brakeForce;
        this.friction = t.friction;
        this.turnSpeed = t.turnSpeed;
        this.gravity = t.gravity;
        this.groundOffset = t.groundOffset;

        // Place on terrain
        const startHeight = getHeightAt(0, 0);
        this.group.position.y = startHeight + this.groundOffset;
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
            if (Math.abs(this.speed) < 0.3) {
                this.speed = 0;
            } else {
                this.speed -= Math.sign(this.speed) * this.friction * dt;
            }
        }

        this.speed = THREE.MathUtils.clamp(this.speed, -this.reverseMax, this.maxSpeed);

        // ── Steering ──
        if (Math.abs(this.speed) > 0.5) {
            const turnFactor = Math.min(1, Math.abs(this.speed) / 8);
            if (input.left) this.heading += this.turnSpeed * turnFactor * dt;
            if (input.right) this.heading -= this.turnSpeed * turnFactor * dt;
        }

        // ── Movement ──
        const dx = Math.sin(this.heading) * this.speed * dt;
        const dz = Math.cos(this.heading) * this.speed * dt;
        this.group.position.x += dx;
        this.group.position.z += dz;

        // ── Terrain following (tight ground hug) ──
        const terrainHeight = getHeightAt(this.group.position.x, this.group.position.z);
        const groundLevel = terrainHeight + this.groundOffset;

        if (this.group.position.y > groundLevel + 0.2) {
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
            // Smooth terrain follow
            this.group.position.y += (groundLevel - this.group.position.y) * Math.min(1, 12 * dt);
            this.verticalVelocity = 0;
            this.grounded = true;
        }

        // ── Rotation ──
        this.group.rotation.y = this.heading;

        // Tilt to match terrain normal
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
        if (this.speed < 6) return '1';
        if (this.speed < 12) return '2';
        if (this.speed < 18) return '3';
        return '4';
    }
}
