/* ─── Ghost Truck Renderer ─── */

import * as THREE from 'three';
import { buildCybertruck } from './vehicles.js';

const GHOST_COLORS = {
    0: 0xb0b0b0,  // gray (default, shouldn't appear as ghost)
    1: 0x4dd9e8,  // cyan
    2: 0xe8944d,  // orange
};

const LERP_SPEED = 8; // interpolation speed for smooth movement

/**
 * Manages ghost truck meshes for remote players.
 */
export class GhostTruckManager {
    constructor(scene) {
        this.scene = scene;
        this.ghosts = new Map(); // playerId → { group, targetPos, targetHeading }
    }

    /**
     * Update ghost trucks from remote player data.
     * @param {Array} remotePlayers - [{ id, x, y, z, heading, speed }]
     * @param {number} dt - delta time
     */
    update(remotePlayers, dt) {
        const activeIds = new Set();

        for (const player of remotePlayers) {
            activeIds.add(player.id);

            if (!this.ghosts.has(player.id)) {
                // Create a new ghost truck for this player
                this._createGhost(player.id);
            }

            const ghost = this.ghosts.get(player.id);
            ghost.targetPos.set(player.x, player.y, player.z);
            ghost.targetHeading = player.heading;
        }

        // Update positions with interpolation, and remove disconnected ghosts
        for (const [id, ghost] of this.ghosts) {
            if (!activeIds.has(id)) {
                // Player disconnected — remove ghost
                this.scene.remove(ghost.group);
                this.ghosts.delete(id);
                console.log(`[Ghosts] Removed ghost for player ${id}`);
                continue;
            }

            // Smooth position interpolation
            const lerpFactor = Math.min(1, LERP_SPEED * dt);
            ghost.group.position.lerp(ghost.targetPos, lerpFactor);

            // Smooth heading interpolation
            let headingDiff = ghost.targetHeading - ghost.group.rotation.y;
            // Handle wrapping around ±π
            while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
            while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
            ghost.group.rotation.y += headingDiff * lerpFactor;
        }
    }

    _createGhost(playerId) {
        const { group } = buildCybertruck();

        // Apply ghost tint color
        const tintColor = new THREE.Color(GHOST_COLORS[playerId] || 0x88bbff);

        group.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clone material so we don't affect the local truck
                child.material = child.material.clone();
                child.material.color.lerp(tintColor, 0.6);
                child.material.transparent = true;
                child.material.opacity = 0.7;
                // Ghosts don't cast shadows (performance)
                child.castShadow = false;
            }
        });

        this.scene.add(group);
        this.ghosts.set(playerId, {
            group,
            targetPos: new THREE.Vector3(),
            targetHeading: 0,
        });

        console.log(`[Ghosts] Created ghost for player ${playerId}`);
    }
}
