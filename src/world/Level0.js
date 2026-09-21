import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class Level0 {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.collisionBoxes = [];
    this.lights = [];
    this.flickerLights = [];

    this.cellSize = 4.0; // 4 meters per grid cell
    this.wallHeight = 3.0; // Low oppressive office ceiling

    // 16x16 Maze layout: 1 = Wall, 0 = Empty floor, 2 = Pillar, 9 = No-clip Wall Location
    this.grid = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 2, 1, 0, 1, 1, 0, 0, 1, 0, 2, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 9, 1], // 9 is No-clip wall
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    this.noClipPosition = new THREE.Vector3();
    this.spawnPosition = new THREE.Vector3(1 * this.cellSize + 2, 1.65, 1 * this.cellSize + 2);

    this.init();
  }

  init() {
    this.createMaterials();
    this.buildFloorAndCeiling();
    this.buildWalls();
    this.setupLighting();
    this.scene.add(this.group);
  }

  createMaterials() {
    // Wallpaper
    this.wallpaperTex = TextureGenerator.createWallpaperTexture();
    this.wallpaperTex.repeat.set(1.5, 1);
    this.wallMat = new THREE.MeshStandardMaterial({
      map: this.wallpaperTex,
      roughness: 0.85,
      metalness: 0.05
    });

    // Carpet
    this.carpetTex = TextureGenerator.createCarpetTexture();
    this.carpetTex.repeat.set(24, 24);
    this.carpetMat = new THREE.MeshStandardMaterial({
      map: this.carpetTex,
      roughness: 0.95,
      metalness: 0.02
    });

    // Ceiling
    this.ceilingTex = TextureGenerator.createCeilingTexture();
    this.ceilingTex.repeat.set(20, 20);
    this.ceilingMat = new THREE.MeshStandardMaterial({
      map: this.ceilingTex,
      roughness: 0.9,
      metalness: 0.05
    });

    // Fluorescent Fixture
    this.fixtureMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    this.fixtureHousingMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.5 });
  }

  buildFloorAndCeiling() {
    const totalSize = 16 * this.cellSize;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const floor = new THREE.Mesh(floorGeo, this.carpetMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(totalSize / 2, 0, totalSize / 2);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const ceiling = new THREE.Mesh(ceilingGeo, this.ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(totalSize / 2, this.wallHeight, totalSize / 2);
    ceiling.receiveShadow = true;
    this.group.add(ceiling);
  }

  buildWalls() {
    const wallGeo = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
    const pillarGeo = new THREE.BoxGeometry(1.2, this.wallHeight, 1.2);

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const type = this.grid[r][c];
        const posX = c * this.cellSize + this.cellSize / 2;
        const posZ = r * this.cellSize + this.cellSize / 2;

        if (type === 1) {
          // Standard Wall Block
          const wall = new THREE.Mesh(wallGeo, this.wallMat);
          wall.position.set(posX, this.wallHeight / 2, posZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.group.add(wall);

          // Add to collision bounding boxes
          const box = new THREE.Box3().setFromObject(wall);
          this.collisionBoxes.push(box);
        } else if (type === 2) {
          // Pillar in open space
          const pillar = new THREE.Mesh(pillarGeo, this.wallMat);
          pillar.position.set(posX, this.wallHeight / 2, posZ);
          pillar.castShadow = true;
          pillar.receiveShadow = true;
          this.group.add(pillar);

          const box = new THREE.Box3().setFromObject(pillar);
          this.collisionBoxes.push(box);
        } else if (type === 9) {
          // No-Clip Anomaly position
          this.noClipPosition.set(posX, 1.5, posZ);
        }
      }
    }
  }

  setupLighting() {
    // Eerie warm yellow-green ambient light
    const ambientLight = new THREE.AmbientLight(0xd4be70, 0.55);
    this.group.add(ambientLight);

    // Fluorescent tube lights throughout corridors
    const lightPositions = [
      [2, 2], [5, 2], [9, 2], [13, 2],
      [3, 5], [7, 5], [11, 5], [14, 5],
      [2, 9], [6, 8], [10, 8], [13, 9],
      [4, 11], [8, 11], [11, 13], [14, 13]
    ];

    const tubeGeo = new THREE.BoxGeometry(1.6, 0.08, 0.4);
    const housingGeo = new THREE.BoxGeometry(1.8, 0.1, 0.5);

    lightPositions.forEach(([c, r], index) => {
      const posX = c * this.cellSize + this.cellSize / 2;
      const posZ = r * this.cellSize + this.cellSize / 2;
      const posY = this.wallHeight - 0.05;

      // Fixture housing
      const housing = new THREE.Mesh(housingGeo, this.fixtureHousingMat);
      housing.position.set(posX, posY + 0.02, posZ);
      this.group.add(housing);

      // Glowing tube
      const tube = new THREE.Mesh(tubeGeo, this.fixtureMat);
      tube.position.set(posX, posY, posZ);
      this.group.add(tube);

      // PointLight casting warm fluorescent light
      const light = new THREE.PointLight(0xfff3c4, 1.4, 14, 1.6);
      light.position.set(posX, posY - 0.2, posZ);
      light.castShadow = (index % 4 === 0); // Optimize shadow-casting lights for 60fps
      if (light.castShadow) {
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.bias = -0.002;
      }
      this.group.add(light);
      this.lights.push(light);

      // Make 2-3 lights randomly flicker with authentic electrical glitch
      if (index === 2 || index === 7 || index === 12) {
        this.flickerLights.push({
          light: light,
          tube: tube,
          baseIntensity: 1.4,
          flickerTimer: Math.random() * 2
        });
      }
    });
  }

  update(delta) {
    // Animate flickering fluorescent lights
    for (let i = 0; i < this.flickerLights.length; i++) {
      const fl = this.flickerLights[i];
      fl.flickerTimer += delta;

      if (fl.flickerTimer > 2.5 + i * 0.8) {
        // Micro-flicker sequence
        const isOff = Math.random() > 0.4;
        fl.light.intensity = isOff ? 0.05 : fl.baseIntensity * (0.6 + Math.random() * 0.5);
        fl.tube.material.color.setHex(isOff ? 0x333320 : 0xfffae6);

        if (fl.flickerTimer > 2.8 + i * 0.8) {
          fl.flickerTimer = 0;
          fl.light.intensity = fl.baseIntensity;
          fl.tube.material.color.setHex(0xfffae6);
        }
      }
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
