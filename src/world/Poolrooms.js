import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * The Poolrooms (Level 37) - Multi-Chamber Complex Edition
 * Features: Central Skylight Atrium, Vaulted Water Canals, Pillar Sanctuary,
 * Submerged Stairs, Archways, and Raised Terraces for extensive liminal exploration.
 */
export class Poolrooms {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false; // Hidden initially until No-clip warp
    this.collisionBoxes = [];

    this.waterMesh = null;
    this.timer = 0;

    // Complex dimensions
    this.totalSize = 96; // 96 x 96 meters
    this.ceilingHeight = 6.5;

    this.spawnPosition = new THREE.Vector3(0, 1.65, 0);

    this.init();
  }

  init() {
    this.createMaterials();
    this.buildMultiChamberComplex();
    this.createWaterSurface();
    this.setupLighting();
    this.scene.add(this.group);
  }

  createMaterials() {
    // White ceramic porcelain pool tile
    this.tileTex = TextureGenerator.createPoolTileTexture();
    this.tileTex.repeat.set(24, 24);

    this.tileMat = new THREE.MeshStandardMaterial({
      map: this.tileTex,
      roughness: 0.22,
      metalness: 0.12
    });

    // Submerged floor tile (slightly cooler tone)
    this.submergedTileTex = TextureGenerator.createPoolTileTexture();
    this.submergedTileTex.repeat.set(32, 32);
    this.submergedMat = new THREE.MeshStandardMaterial({
      map: this.submergedTileTex,
      roughness: 0.28,
      metalness: 0.15,
      color: 0xc8f2f8
    });

    // Skylight emitter
    this.skylightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  }

  buildMultiChamberComplex() {
    const size = this.totalSize;
    const h = this.ceilingHeight;

    // 1. Overall Floor & Ceiling
    const floorGeo = new THREE.PlaneGeometry(size, size);
    const floor = new THREE.Mesh(floorGeo, this.submergedMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const ceilingGeo = new THREE.PlaneGeometry(size, size);
    const ceiling = new THREE.Mesh(ceilingGeo, this.tileMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    ceiling.receiveShadow = true;
    this.group.add(ceiling);

    // 2. Outer Boundary Walls
    const half = size / 2;
    this.createSolidWall(size, h, 2, 0, h / 2, -half); // North
    this.createSolidWall(size, h, 2, 0, h / 2, half);  // South
    this.createSolidWall(2, h, size, half, h / 2, 0);  // East
    this.createSolidWall(2, h, size, -half, h / 2, 0); // West

    // 3. Chamber Partition Walls with Open Archways
    // North Partition Wall (z = -16) with 3 Open Archways
    this.createWallWithArch(size, h, -16, [ -24, 0, 24 ], 4.5, 4.2);

    // South Partition Wall (z = 16) with 3 Open Archways
    this.createWallWithArch(size, h, 16, [ -24, 0, 24 ], 4.5, 4.2);

    // West Partition Wall (x = -16) with 3 Open Archways
    this.createRotatedWallWithArch(size, h, -16, [ -32, 0, 32 ], 4.5, 4.2);

    // East Partition Wall (x = 16) with 3 Open Archways
    this.createRotatedWallWithArch(size, h, 16, [ -32, 0, 32 ], 4.5, 4.2);

    // 4. Central Atrium Features (Spawn Area)
    // Raised Center Platform / Dry Island
    const islandGeo = new THREE.BoxGeometry(8, 0.5, 8);
    const island = new THREE.Mesh(islandGeo, this.tileMat);
    island.position.set(0, 0.25, 0);
    island.receiveShadow = true;
    this.group.add(island);

    // Submerged Steps leading down into water from central island
    this.createSubmergedSteps(0, 0, 8);

    // Atrium Skylights
    this.createSkylight(0, 0, 10);
    this.createSkylight(0, -32, 8);
    this.createSkylight(0, 32, 8);
    this.createSkylight(-32, 0, 8);
    this.createSkylight(32, 0, 8);

    // 5. South Pillar Sanctuary: 3x3 Forest of White Ceramic Columns
    for (let px = -32; px <= 32; px += 16) {
      for (let pz = 24; pz <= 40; pz += 16) {
        this.createPillar(px, pz, 2.2, h);
      }
    }

    // 6. North Water Canal: Elevated Walkways along water channel
    this.createSolidWall(24, 0.6, 3, -24, 0.3, -32);
    this.createSolidWall(24, 0.6, 3, 24, 0.3, -32);

    // 7. East Sunken Bath: Deep Chamber with surrounding steps
    for (let pz = -36; pz <= 36; pz += 18) {
      this.createPillar(34, pz, 1.8, h);
    }

    // 8. West Gallery: Row of columns and arched vistas
    for (let pz = -36; pz <= 36; pz += 18) {
      this.createPillar(-34, pz, 1.8, h);
    }
  }

  createSolidWall(w, h, d, x, y, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(geo, this.tileMat);
    wall.position.set(x, y, z);
    wall.receiveShadow = true;
    wall.castShadow = true;
    this.group.add(wall);

    const box = new THREE.Box3().setFromObject(wall);
    this.collisionBoxes.push(box);
    return wall;
  }

  createPillar(x, z, size, h) {
    const geo = new THREE.BoxGeometry(size, h, size);
    const pillar = new THREE.Mesh(geo, this.tileMat);
    pillar.position.set(x, h / 2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.group.add(pillar);

    const box = new THREE.Box3().setFromObject(pillar);
    this.collisionBoxes.push(box);
  }

  createWallWithArch(totalLength, h, zPos, archPositionsX, archWidth, archHeight) {
    // Build wall segments with open archways along X axis
    const halfLen = totalLength / 2;
    let currentX = -halfLen;

    archPositionsX.forEach((archX) => {
      const archLeft = archX - archWidth / 2;
      const archRight = archX + archWidth / 2;

      // Solid segment leading up to arch
      if (archLeft > currentX) {
        const segW = archLeft - currentX;
        const segX = currentX + segW / 2;
        this.createSolidWall(segW, h, 1.8, segX, h / 2, zPos);
      }

      // Arch Header (lintel above the doorway)
      const lintelH = h - archHeight;
      const lintelY = archHeight + lintelH / 2;
      this.createSolidWall(archWidth, lintelH, 1.8, archX, lintelY, zPos);

      currentX = archRight;
    });

    // Final segment after last arch
    if (currentX < halfLen) {
      const segW = halfLen - currentX;
      const segX = currentX + segW / 2;
      this.createSolidWall(segW, h, 1.8, segX, h / 2, zPos);
    }
  }

  createRotatedWallWithArch(totalLength, h, xPos, archPositionsZ, archWidth, archHeight) {
    // Build partition wall along Z axis
    const halfLen = totalLength / 2;
    let currentZ = -halfLen;

    archPositionsZ.forEach((archZ) => {
      const archBack = archZ - archWidth / 2;
      const archFront = archZ + archWidth / 2;

      if (archBack > currentZ) {
        const segL = archBack - currentZ;
        const segZ = currentZ + segL / 2;
        this.createSolidWall(1.8, h, segL, xPos, h / 2, segZ);
      }

      const lintelH = h - archHeight;
      const lintelY = archHeight + lintelH / 2;
      this.createSolidWall(1.8, lintelH, archWidth, xPos, lintelY, archZ);

      currentZ = archFront;
    });

    if (currentZ < halfLen) {
      const segL = halfLen - currentZ;
      const segZ = currentZ + segL / 2;
      this.createSolidWall(1.8, h, segL, xPos, h / 2, segZ);
    }
  }

  createSubmergedSteps(centerX, centerZ, baseWidth) {
    // 3 tiered steps around square platform
    const stepOffsets = [
      { w: baseWidth + 1.6, h: 0.18 },
      { w: baseWidth + 3.2, h: 0.10 }
    ];

    stepOffsets.forEach((st) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(st.w, st.h, st.w), this.submergedMat);
      step.position.set(centerX, st.h / 2, centerZ);
      step.receiveShadow = true;
      this.group.add(step);
    });
  }

  createSkylight(x, z, size) {
    const geo = new THREE.PlaneGeometry(size, size);
    const skylight = new THREE.Mesh(geo, this.skylightMat);
    skylight.rotation.x = Math.PI / 2;
    skylight.position.set(x, this.ceilingHeight - 0.02, z);
    this.group.add(skylight);

    // Natural daylight shaft
    const spot = new THREE.SpotLight(0xe0f7fa, 2.2, 35, Math.PI / 3, 0.45, 1.2);
    spot.position.set(x, this.ceilingHeight - 0.2, z);
    spot.target.position.set(x, 0, z);
    this.group.add(spot.target);
    this.group.add(spot);
  }

  createWaterSurface() {
    // Large undulating translucent water plane covering entire complex
    const waterGeo = new THREE.PlaneGeometry(this.totalSize - 1, this.totalSize - 1, 96, 96);

    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uWaterColor: { value: new THREE.Color(0x00e5ff) },
        uDeepColor: { value: new THREE.Color(0x00838f) }
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Gentle liminal water waves
          float wave1 = sin(pos.x * 0.6 + uTime * 2.2) * 0.045;
          float wave2 = cos(pos.y * 0.5 + uTime * 1.8) * 0.04;
          pos.z += wave1 + wave2;

          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uWaterColor;
        uniform vec3 uDeepColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          // Specular ripples and aquatic caustics
          float ripple = sin(vWorldPos.x * 2.2 + uTime * 2.0) * cos(vWorldPos.z * 2.2 + uTime * 1.6);
          float caustics = pow(max(0.0, ripple), 3.2) * 0.5;

          vec3 col = mix(uWaterColor, uDeepColor, 0.3) + vec3(caustics);

          gl_FragColor = vec4(col, 0.65);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, 0.35, 0); // 35cm water depth
    this.group.add(this.waterMesh);
  }

  setupLighting() {
    // Soft, peaceful cyan-blue ambient light
    const ambient = new THREE.AmbientLight(0xc9f1fd, 0.95);
    this.group.add(ambient);

    // Warm sun rays shining across the complex
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.group.add(sunLight);

    // Underwater turquoise glow lamps in each chamber
    const lampPositions = [
      [ 0, 0.4, 0 ],
      [ -28, 0.4, -28 ], [ 28, 0.4, -28 ],
      [ -28, 0.4, 28 ],  [ 28, 0.4, 28 ],
      [ 0, 0.4, -32 ],   [ 0, 0.4, 32 ],
      [ -32, 0.4, 0 ],   [ 32, 0.4, 0 ]
    ];

    lampPositions.forEach(([lx, ly, lz]) => {
      const pLight = new THREE.PointLight(0x00f2fe, 1.8, 22, 1.4);
      pLight.position.set(lx, ly, lz);
      this.group.add(pLight);
    });
  }

  update(delta) {
    this.timer += delta;
    if (this.waterMat && this.waterMat.uniforms) {
      this.waterMat.uniforms.uTime.value = this.timer;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
