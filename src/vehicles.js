/* ─── Vehicle Builders ─── */
import * as THREE from 'three';

function mat(color, emissive = 0x000000) {
    return new THREE.MeshLambertMaterial({ color, flatShading: true, emissive });
}

/* ═══════════════════════════════════════════════════
   CYBERTRUCK  –  angular stainless-steel pickup
   ═══════════════════════════════════════════════════ */
export function buildCybertruck() {
    const group = new THREE.Group();

    // Main body slab
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 5.2), mat(0xbbbbbb));
    bodyMesh.position.y = 0.95;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Slanted hood (wedge-like via scaled box)
    const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.25, 1.4), mat(0xc0c0c0));
    hoodMesh.position.set(0, 1.55, 2.1);
    hoodMesh.rotation.x = 0.22;
    group.add(hoodMesh);

    // Cabin (trapezoid silhouette via two stacked boxes)
    const cabLow = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 2.6), mat(0xb0b0b0));
    cabLow.position.set(0, 1.78, -0.15);
    cabLow.castShadow = true;
    group.add(cabLow);

    const cabTop = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.45, 2.3), mat(0xa8a8a8));
    cabTop.position.set(0, 2.28, -0.15);
    cabTop.castShadow = true;
    group.add(cabTop);

    // Windshield (dark glass)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 0.12), mat(0x1c2030));
    windshield.position.set(0, 1.95, 1.22);
    windshield.rotation.x = -0.25;
    group.add(windshield);

    // Rear glass
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 0.12), mat(0x1c2030));
    rearGlass.position.set(0, 1.9, -1.48);
    rearGlass.rotation.x = 0.2;
    group.add(rearGlass);

    // Bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 1.7), mat(0x909090));
    bed.position.set(0, 1.06, -2.05);
    bed.castShadow = true;
    group.add(bed);

    // Bed rails
    [-1.05, 1.05].forEach(x => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 1.7), mat(0x888888));
        rail.position.set(x, 1.27, -2.05);
        group.add(rail);
    });

    // Front bumper (thick angular)
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 0.32), mat(0x303030));
    bumper.position.set(0, 0.55, 2.75);
    group.add(bumper);

    // LED headlight bar
    const hbar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.09, 0.09),
        new THREE.MeshBasicMaterial({ color: 0xeeeeff }));
    hbar.position.set(0, 1.12, 2.7);
    group.add(hbar);

    // Tail light bar
    const tbar = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tbar.position.set(0, 1.1, -2.65);
    group.add(tbar);

    // Side mirrors
    [-1.25, 1.25].forEach(x => {
        const mir = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.18), mat(0x888888));
        mir.position.set(x * 1.08, 1.7, 1.1);
        group.add(mir);
    });

    // Wheels (4 — blocky with hubcap)
    const wheelPositions = [
        [-1.32, 0.38, 1.65], [1.32, 0.38, 1.65],
        [-1.32, 0.38, -1.65], [1.32, 0.38, -1.65],
    ];
    const wheels = wheelPositions.map(([x, y, z]) => {
        const tire = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.68), mat(0x111111));
        tire.position.set(x, y, z);
        tire.castShadow = true;
        group.add(tire);
        const hub = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.38, 0.38), mat(0x888888));
        hub.position.set(x, y, z);
        group.add(hub);
        return tire;
    });

    return { group, wheels, groundOffset: 0.38 };
}

/* ═══════════════════════════════════════════════════
   PT CRUISER  –  retro rounded hatchback
   ═══════════════════════════════════════════════════ */
export function buildPTCruiser() {
    const group = new THREE.Group();

    const BODY = 0xc8a83a;   // golden tan
    const DARK = 0x222222;
    const CHROME = 0xddddcc;
    const GLASS = 0x1a2535;

    // Lower body (wide, low slab)
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.82, 4.2), mat(BODY));
    lower.position.y = 0.72;
    lower.castShadow = true;
    group.add(lower);

    // Upper body mid section (rounded feel — two overlapping boxes)
    const midA = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.55, 3.5), mat(BODY));
    midA.position.set(0, 1.38, -0.05);
    midA.castShadow = true;
    group.add(midA);

    // High arched roofline (signature PT shape)
    const roofA = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.6, 2.2), mat(BODY));
    roofA.position.set(0, 1.88, -0.3);
    roofA.castShadow = true;
    group.add(roofA);

    const roofPeak = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.22, 1.6), mat(BODY));
    roofPeak.position.set(0, 2.18, -0.5);
    group.add(roofPeak);

    // Hood bulge (slightly raised)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.5), mat(BODY));
    hood.position.set(0, 1.18, 1.4);
    hood.rotation.x = 0.08;
    group.add(hood);

    // Windshield (large, slightly angled)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.72, 0.12), mat(GLASS));
    windshield.position.set(0, 1.7, 0.82);
    windshield.rotation.x = -0.35;
    group.add(windshield);

    // Rear hatch glass
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 0.12), mat(GLASS));
    hatch.position.set(0, 1.65, -1.62);
    hatch.rotation.x = 0.28;
    group.add(hatch);

    // Side windows (two per side)
    [[-1.04, 1.58, 0.3], [1.04, 1.58, 0.3],
    [-1.04, 1.55, -0.8], [1.04, 1.55, -0.8]].forEach(([x, y, z]) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.72), mat(GLASS));
        win.position.set(x, y, z);
        group.add(win);
    });

    // Chrome front grille (retro round egg-crate style)
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 0.12), mat(CHROME));
    grille.position.set(0, 0.9, 2.15);
    group.add(grille);

    const grilleCenter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.14), mat(0x888833));
    grilleCenter.position.set(0, 0.88, 2.16);
    group.add(grilleCenter);

    // Round-ish headlights (box pair)
    [[-0.68, 0.98, 2.15], [0.68, 0.98, 2.15]].forEach(([x, y, z]) => {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.12),
            new THREE.MeshBasicMaterial({ color: 0xffeecc }));
        lens.position.set(x, y, z);
        group.add(lens);
    });

    // Front chrome bumper (with fog light pockets)
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 0.28), mat(CHROME));
    frontBumper.position.set(0, 0.52, 2.2);
    group.add(frontBumper);

    // Rear bumper
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 0.26), mat(CHROME));
    rearBumper.position.set(0, 0.52, -2.22);
    group.add(rearBumper);

    // Tail lights (round-ish red clusters)
    [[-0.7, 0.95, -2.12], [0.7, 0.95, -2.12]].forEach(([x, y, z]) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xee1111 }));
        tl.position.set(x, y, z);
        group.add(tl);
    });

    // Fender flares
    [[-1.1, 0.5, 1.55], [1.1, 0.5, 1.55],
    [-1.1, 0.5, -1.55], [1.1, 0.5, -1.55]].forEach(([x, y, z]) => {
        const flare = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.8), mat(BODY));
        flare.position.set(x, y, z);
        group.add(flare);
    });

    // Chrome door handles
    [[-1.07, 1.15, 0.3], [1.07, 1.15, 0.3],
    [-1.07, 1.15, -0.8], [1.07, 1.15, -0.8]].forEach(([x, y, z]) => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.28), mat(CHROME));
        handle.position.set(x, y, z);
        group.add(handle);
    });

    // Side mirrors
    [[-1.08, 1.38, 1.0], [1.08, 1.38, 1.0]].forEach(([x, y, z]) => {
        const mir = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), mat(BODY));
        mir.position.set(x, y, z);
        group.add(mir);
    });

    // Wheels (4 — shorter/wider than cybertruck)
    const wheelPositions = [
        [-1.12, 0.36, 1.55], [1.12, 0.36, 1.55],
        [-1.12, 0.36, -1.55], [1.12, 0.36, -1.55],
    ];
    const wheels = wheelPositions.map(([x, y, z]) => {
        const tire = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.64), mat(0x111111));
        tire.position.set(x, y, z);
        tire.castShadow = true;
        group.add(tire);
        const hub = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), mat(CHROME));
        hub.position.set(x, y, z);
        group.add(hub);
        return tire;
    });

    return { group, wheels, groundOffset: 0.36 };
}

/* ═══════════════════════════════════════════════════
   ABRAMS TANK  –  M1A2 main battle tank
   ═══════════════════════════════════════════════════ */
export function buildAbramsTank() {
    const group = new THREE.Group();

    const OLIVE = 0x4a5240;     // military olive
    const DARK_OLV = 0x363b2e;
    const STEEL = 0x5a5a5a;

    // Hull — low, wide, flat
    const hullMain = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 6.4), mat(OLIVE));
    hullMain.position.y = 0.7;
    hullMain.castShadow = true;
    group.add(hullMain);

    // Glacis plate (angled front armour)
    const glacis = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.5, 1.0), mat(DARK_OLV));
    glacis.position.set(0, 1.0, 3.0);
    glacis.rotation.x = -0.55;
    glacis.castShadow = true;
    group.add(glacis);

    // Upper hull deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 5.6), mat(OLIVE));
    deck.position.set(0, 1.12, -0.2);
    group.add(deck);

    // Rear engine deck (slightly raised)
    const engineDeck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.32, 1.5), mat(DARK_OLV));
    engineDeck.position.set(0, 1.2, -2.8);
    group.add(engineDeck);

    // Exhaust grilles
    [-0.9, 0.9].forEach(x => {
        const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.6), mat(0x222222));
        grille.position.set(x, 1.37, -2.85);
        group.add(grille);
    });

    // Side skirts (armour)
    [-1.7, 1.7].forEach(x => {
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 5.6), mat(DARK_OLV));
        skirt.position.set(x, 0.55, -0.2);
        skirt.castShadow = true;
        group.add(skirt);
    });

    // Turret base ring
    const turretBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 3.0), mat(OLIVE));
    turretBase.position.set(0, 1.3, -0.4);
    group.add(turretBase);

    // Turret main body
    const turret = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 2.8), mat(OLIVE));
    turret.position.set(0, 1.85, -0.4);
    turret.castShadow = true;
    group.add(turret);

    // Turret top (slightly smaller, angled sides implied by smaller box)
    const turretTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 2.5), mat(DARK_OLV));
    turretTop.position.set(0, 2.33, -0.4);
    group.add(turretTop);

    // Commander's hatch
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.55), mat(STEEL));
    hatch.position.set(-0.5, 2.48, -0.2);
    group.add(hatch);

    // Loader's hatch
    const hatch2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.45), mat(STEEL));
    hatch2.position.set(0.4, 2.48, -0.6);
    group.add(hatch2);

    // Main gun barrel (long tube)
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5.0), mat(DARK_OLV));
    barrel.position.set(0, 2.0, 2.5);
    barrel.castShadow = true;
    group.add(barrel);

    // Muzzle brake
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.38), mat(STEEL));
    muzzle.position.set(0, 2.0, 5.08);
    group.add(muzzle);

    // Coaxial machine gun
    const coax = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.2), mat(STEEL));
    coax.position.set(0.55, 1.98, 2.1);
    group.add(coax);

    // Smoke grenade launchers (clusters on turret sides)
    [-1.18, 1.18].forEach(x => {
        for (let i = 0; i < 3; i++) {
            const smk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), mat(STEEL));
            smk.position.set(x, 2.05, 0.5 + i * 0.2);
            smk.rotation.y = x > 0 ? 0.35 : -0.35;
            group.add(smk);
        }
    });

    // ERA blocks (explosive reactive armour tiles on turret front)
    for (let i = -2; i <= 2; i++) {
        const era = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.12), mat(0x3d4535));
        era.position.set(i * 0.44, 1.82, 1.12);
        group.add(era);
    }

    // Road wheels (5 per side, visible below skirts)
    const wheelResult = [];
    [-1.7, 1.7].forEach(x => {
        for (let i = 0; i < 5; i++) {
            const whl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.62), mat(0x222222));
            whl.position.set(x, 0.38, -2.3 + i * 1.05);
            group.add(whl);
            if (i === 0 || i === 4) wheelResult.push(whl); // use first/last as "wheels" for physics
        }
    });

    // Sprocket (rear drive wheel)
    [-1.68, 1.68].forEach(x => {
        const spr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.7), mat(STEEL));
        spr.position.set(x, 0.42, -2.85);
        group.add(spr);
    });

    // Idler wheel (front)
    [-1.68, 1.68].forEach(x => {
        const idl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.62), mat(STEEL));
        idl.position.set(x, 0.42, 2.85);
        group.add(idl);
    });

    // Track (simplified flat strip each side)
    [-1.72, 1.72].forEach(x => {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 6.5), mat(0x1a1a1a));
        track.position.set(x, 0.12, -0.1);
        group.add(track);
    });

    return { group, wheels: wheelResult, groundOffset: 0.12 };
}

/* ═══════════════════════════════════════════════════
   Factory
   ═══════════════════════════════════════════════════ */
export function buildVehicle(type) {
    switch (type) {
        case 'ptcruiser': return buildPTCruiser();
        case 'tank': return buildAbramsTank();
        case 'cybertruck':
        default: return buildCybertruck();
    }
}
