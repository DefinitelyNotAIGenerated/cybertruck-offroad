/* ─── Chase Camera ─── */

import * as THREE from 'three';

/**
 * Third-person chase camera — sits behind the vehicle and looks ahead.
 * The truck faces +Z when heading=0, so "behind" means -Z offset.
 */
export function createChaseCamera(camera) {
    const offsetBehind = 14;   // distance behind the truck
    const offsetUp = 6;        // height above the truck
    const lookAheadDist = 4;   // how far ahead to look
    const lookUpOffset = 1.5;

    const currentPos = new THREE.Vector3();
    const currentLook = new THREE.Vector3();
    let initialized = false;

    return {
        update(dt, target, speed) {
            const heading = target.rotation.y;
            const sinH = Math.sin(heading);
            const cosH = Math.cos(heading);

            // Camera distance increases slightly at speed
            const speedFactor = 1 + Math.abs(speed) * 0.005;

            // "Behind" the truck = opposite of forward direction (+Z forward → camera at -Z)
            const desiredPos = new THREE.Vector3(
                target.position.x - sinH * offsetBehind * speedFactor,
                target.position.y + offsetUp * speedFactor,
                target.position.z - cosH * offsetBehind * speedFactor
            );

            // Look-at point: slightly ahead of the truck
            const desiredLook = new THREE.Vector3(
                target.position.x + sinH * lookAheadDist,
                target.position.y + lookUpOffset,
                target.position.z + cosH * lookAheadDist
            );

            if (!initialized) {
                currentPos.copy(desiredPos);
                currentLook.copy(desiredLook);
                initialized = true;
            }

            // Smooth follow using time-based interpolation
            const posSmooth = 1 - Math.pow(0.02, dt);
            const lookSmooth = 1 - Math.pow(0.005, dt);

            currentPos.lerp(desiredPos, posSmooth);
            currentLook.lerp(desiredLook, lookSmooth);

            camera.position.copy(currentPos);
            camera.lookAt(currentLook);
        }
    };
}
