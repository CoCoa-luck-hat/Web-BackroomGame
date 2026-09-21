import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * IntroCinematic - Kane Pixels Style "Found Footage" Prologue
 * Stages an authentic real-world office hallway, choreographs camera walking,
 * accidental dimensional no-clip glitch tear, freefall through broken ceiling,
 * violent carpet impact crash, stunned recovery, and flashlight switch-on.
 */
export class IntroCinematic {
  constructor(scene, controls, soundManager, vhsMaterial, uiManager, spawnPosition) {
    this.scene = scene;
    this.controls = controls;
    this.camera = controls.camera;
    this.soundManager = soundManager;
    this.vhsMaterial = vhsMaterial;
    this.uiManager = uiManager;
    this.spawnPosition = spawnPosition || new THREE.Vector3(6, 1.65, 6);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.isActive = false;
    this.elapsed = 0;
    this.duration = 7.5;
    this.onCompleteCallback = null;

    // Sound and event triggers
    this.step1 = false;
    this.step2 = false;
    this.step3 = false;
    this.tearTriggered = false;
    this.windTriggered = false;
    this.crashTriggered = false;
    this.gaspTriggered = false;
    this.clickTriggered = false;

    // Staging coordinates (directly above spawn point in Level 0)
    this.corridorY = 12.0;
    this.corridorX = this.spawnPosition.x; // 6.0
    this.doorZ = 4.8;
    this.startZ = 10.8;
    this.tearZ = 6.0;

    this.buildRealWorldCorridor();
    this.buildCeilingBreach();

    // Initially hidden
    this.group.visible = false;
  }

  /**
   * Build the 3D Real-World Corridor (Drywall, Vinyl Tile, Wood Baseboard, Door, Office Lighting)
   */
  buildRealWorldCorridor() {
    this.corridorGroup = new THREE.Group();
    this.group.add(this.corridorGroup);

    const width = 3.2;
    const length = 8.5;
    const height = 2.8;

    // Textures
    const wallTex = TextureGenerator.createRealWorldWallTexture();
    wallTex.repeat.set(2.5, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.05
    });

    const tileTex = TextureGenerator.createRealWorldTileTexture();
    tileTex.repeat.set(4, 10);
    const tileMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.5,
      metalness: 0.1
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.9
    });

    // 1. Floor (solid section from startZ down to tear threshold)
    const solidFloorGeo = new THREE.PlaneGeometry(width, 4.5);
    const solidFloor = new THREE.Mesh(solidFloorGeo, tileMat);
    solidFloor.rotation.x = -Math.PI / 2;
    solidFloor.position.set(this.corridorX, this.corridorY, 9.2);
    solidFloor.receiveShadow = true;
    this.corridorGroup.add(solidFloor);

    // Front floor section past the tear (near the door)
    const frontFloorGeo = new THREE.PlaneGeometry(width, 1.6);
    const frontFloor = new THREE.Mesh(frontFloorGeo, tileMat);
    frontFloor.rotation.x = -Math.PI / 2;
    frontFloor.position.set(this.corridorX, this.corridorY, 5.2);
    frontFloor.receiveShadow = true;
    this.corridorGroup.add(frontFloor);

    // Dimensional Void / Glitch Tear Aperture at Y = corridorY
    const tearGeo = new THREE.PlaneGeometry(width - 0.2, 2.0);
    const tearMat = new THREE.MeshBasicMaterial({
      color: 0x020305,
      side: THREE.DoubleSide
    });
    this.tearMesh = new THREE.Mesh(tearGeo, tearMat);
    this.tearMesh.rotation.x = -Math.PI / 2;
    this.tearMesh.position.set(this.corridorX, this.corridorY - 0.01, this.tearZ);
    this.corridorGroup.add(this.tearMesh);

    // 2. Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(width, length);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(this.corridorX, this.corridorY + height, 8.5);
    this.corridorGroup.add(ceiling);

    // 3. Left Wall
    const sideWallGeo = new THREE.PlaneGeometry(length, height);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(this.corridorX - width / 2, this.corridorY + height / 2, 8.5);
    this.corridorGroup.add(leftWall);

    // 4. Right Wall
    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(this.corridorX + width / 2, this.corridorY + height / 2, 8.5);
    this.corridorGroup.add(rightWall);

    // 5. Back Wall
    const endWallGeo = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(endWallGeo, wallMat);
    backWall.position.set(this.corridorX, this.corridorY + height / 2, 12.7);
    this.corridorGroup.add(backWall);

    // 6. Front Wall with Office Door
    const frontWall = new THREE.Mesh(endWallGeo, wallMat);
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(this.corridorX, this.corridorY + height / 2, this.doorZ);
    this.corridorGroup.add(frontWall);

    const doorTex = TextureGenerator.createDoorTexture();
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      roughness: 0.6
    });
    const doorGeo = new THREE.PlaneGeometry(1.2, 2.3);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.rotation.y = Math.PI;
    door.position.set(this.corridorX, this.corridorY + 1.15, this.doorZ + 0.02);
    this.corridorGroup.add(door);

    // 7. Overhead Fluorescent Light Fixture & Lighting
    const fixtureGeo = new THREE.BoxGeometry(0.5, 0.08, 2.4);
    const fixtureHousing = new THREE.Mesh(fixtureGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
    fixtureHousing.position.set(this.corridorX, this.corridorY + height - 0.04, 8.5);
    this.corridorGroup.add(fixtureHousing);

    const bulbGeo = new THREE.PlaneGeometry(0.35, 2.2);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(this.corridorX, this.corridorY + height - 0.09, 8.5);
    this.corridorGroup.add(bulb);

    this.hallwayLight = new THREE.PointLight(0xf1f5f9, 2.2, 12, 1.8);
    this.hallwayLight.position.set(this.corridorX, this.corridorY + height - 0.2, 8.5);
    this.corridorGroup.add(this.hallwayLight);
  }

  /**
   * Broken Level 0 Ceiling Breach (Hanging T-Bars and Fractured Acoustic Tiles)
   * Directly above the spawn point (X=6, Z=6, Y=3.0) where the player crashed through.
   */
  buildCeilingBreach() {
    this.breachGroup = new THREE.Group();
    this.group.add(this.breachGroup);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.6, roughness: 0.4 });
    const tileMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createCeilingTexture(),
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    // Fractured T-bar bent downwards
    const barGeo1 = new THREE.BoxGeometry(0.06, 0.06, 1.8);
    const bar1 = new THREE.Mesh(barGeo1, frameMat);
    bar1.position.set(this.spawnPosition.x - 0.6, 2.7, this.spawnPosition.z);
    bar1.rotation.set(0.3, 0.1, 0.45);
    this.breachGroup.add(bar1);

    const barGeo2 = new THREE.BoxGeometry(1.6, 0.06, 0.06);
    const bar2 = new THREE.Mesh(barGeo2, frameMat);
    bar2.position.set(this.spawnPosition.x + 0.4, 2.65, this.spawnPosition.z + 0.5);
    bar2.rotation.set(-0.25, 0.4, -0.3);
    this.breachGroup.add(bar2);

    // Broken acoustic tile chunk 1
    const chunkGeo1 = new THREE.PlaneGeometry(0.8, 0.9);
    const chunk1 = new THREE.Mesh(chunkGeo1, tileMat);
    chunk1.position.set(this.spawnPosition.x - 0.4, 2.5, this.spawnPosition.z - 0.2);
    chunk1.rotation.set(Math.PI / 2 + 0.5, 0.2, 0.3);
    this.breachGroup.add(chunk1);

    // Broken acoustic tile chunk 2
    const chunkGeo2 = new THREE.PlaneGeometry(0.7, 0.6);
    const chunk2 = new THREE.Mesh(chunkGeo2, tileMat);
    chunk2.position.set(this.spawnPosition.x + 0.5, 2.45, this.spawnPosition.z + 0.3);
    chunk2.rotation.set(Math.PI / 2 - 0.4, -0.3, 0.1);
    this.breachGroup.add(chunk2);

    // Dangling electrical wire
    const wireGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(this.spawnPosition.x - 0.2, 2.6, this.spawnPosition.z + 0.4);
    wire.rotation.set(0.15, 0, 0.2);
    this.breachGroup.add(wire);
  }

  /**
   * Start the Found Footage Cinematic Intro
   */
  start(onComplete) {
    this.isActive = true;
    this.elapsed = 0;
    this.onCompleteCallback = onComplete;

    // Reset trigger flags
    this.step1 = false;
    this.step2 = false;
    this.step3 = false;
    this.tearTriggered = false;
    this.windTriggered = false;
    this.crashTriggered = false;
    this.gaspTriggered = false;
    this.clickTriggered = false;

    // Make 3D staging visible
    this.group.visible = true;

    // Turn off player flashlight during real world intro
    if (this.controls) {
      this.controls.setFlashlight(false);
      this.controls.yawObject.position.set(this.corridorX, this.corridorY + 1.65, this.startZ);
      this.controls.yawObject.rotation.y = 0;
      this.controls.pitchObject.rotation.x = -0.04;
      this.camera.position.set(0, 0, 0);
      this.camera.rotation.set(0, 0, 0);
    }

    // Quiet fluorescent hum during real world
    if (this.soundManager) {
      this.soundManager.setFluorescentHumVolume(0.0, 0.1);
    }

    // Initialize UI in vintage playback mode
    if (this.uiManager) {
      this.uiManager.startCinematicMode();
    }

    if (this.vhsMaterial) {
      this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.0;
    }
  }

  /**
   * Step the cinematic animation every frame
   */
  update(delta) {
    if (!this.isActive) return;

    this.elapsed += delta;
    const t = this.elapsed;

    // =========================================================================
    // Phase 1: Real-World Walking in Hallway (0.0s - 2.2s)
    // =========================================================================
    if (t < 2.2) {
      const p = t / 2.2;
      // Walk forward along -Z towards the no-clip breach
      const currentZ = THREE.MathUtils.lerp(this.startZ, 7.1, p);
      // Realistic human walking head bob
      const bobY = Math.sin(t * 9.0) * 0.035;
      const bobRoll = Math.sin(t * 4.5) * 0.015;
      const bobPitch = -0.04 + Math.cos(t * 9.0) * 0.01;

      if (this.controls) {
        this.controls.yawObject.position.set(this.corridorX, this.corridorY + 1.65 + bobY, currentZ);
        this.controls.yawObject.rotation.y = 0;
        this.controls.pitchObject.rotation.x = bobPitch;
        this.camera.rotation.z = bobRoll;
      }

      // Footstep sound triggers
      if (t >= 0.4 && !this.step1) {
        if (this.soundManager) this.soundManager.playTileFootstep();
        this.step1 = true;
      }
      if (t >= 1.0 && !this.step2) {
        if (this.soundManager) this.soundManager.playTileFootstep();
        this.step2 = true;
      }
      if (t >= 1.6 && !this.step3) {
        if (this.soundManager) this.soundManager.playTileFootstep();
        this.step3 = true;
      }

      if (this.vhsMaterial) {
        this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.0;
      }
    }
    // =========================================================================
    // Phase 2: Accidental Stumble & Reality Glitch Tear (2.2s - 3.2s)
    // =========================================================================
    else if (t < 3.2) {
      const p = (t - 2.2) / 1.0;

      // Audio: Violent dimensional tear arc
      if (!this.tearTriggered) {
        if (this.soundManager) this.soundManager.playNoClipTear();
        this.tearTriggered = true;
      }

      // Camcorder trip forward & down
      const currentZ = THREE.MathUtils.lerp(7.1, 6.0, p);
      const currentY = THREE.MathUtils.lerp(this.corridorY + 1.65, this.corridorY - 0.2, p * p);

      // Sudden downward pitch (looking down at feet/rift) + sideways tilt
      const stumblePitch = -0.04 - p * 0.7;
      const stumbleRoll = p * 0.38;

      if (this.controls) {
        this.controls.yawObject.position.set(this.corridorX, currentY, currentZ);
        this.controls.pitchObject.rotation.x = stumblePitch;
        this.camera.rotation.z = stumbleRoll;
      }

      // VHS glitch tear spike
      const glitch = Math.sin(p * Math.PI) * 0.8;
      if (this.vhsMaterial) {
        this.vhsMaterial.uniforms.uGlitchIntensity.value = glitch;
      }

      // UI timecode glitching
      if (this.uiManager && Math.random() > 0.4) {
        this.uiManager.glitchTimecode();
      }
    }
    // =========================================================================
    // Phase 3: The Void Freefall Tumbling (3.2s - 4.5s)
    // =========================================================================
    else if (t < 4.5) {
      const p = (t - 3.2) / 1.3;

      // Audio: Rushing wind filter sweep
      if (!this.windTriggered) {
        if (this.soundManager) this.soundManager.playFreeFallWind(1.3);
        this.windTriggered = true;
      }

      // Accelerating plunge through Level 0 ceiling (Y=3.0) towards carpet (Y=0.22)
      // Quadratic gravity fall
      const startFallY = this.corridorY - 0.2;
      const targetLandingY = 0.22;
      const currentY = startFallY - (p * p) * (startFallY - targetLandingY);

      // Tumbling rotation around pitch, roll, and yaw
      const tumblePitch = -0.74 - p * 3.8;
      const tumbleRoll = 0.38 + p * 4.5;
      const tumbleYaw = p * 3.0;

      // Micro turbulence sway
      const turbX = this.corridorX + Math.sin(p * 14.0) * 0.18;
      const turbZ = this.spawnPosition.z + Math.cos(p * 10.0) * 0.15;

      if (this.controls) {
        this.controls.yawObject.position.set(turbX, currentY, turbZ);
        this.controls.yawObject.rotation.y = tumbleYaw;
        this.controls.pitchObject.rotation.x = tumblePitch;
        this.camera.rotation.z = tumbleRoll;
      }

      // Glitch tracking lines during fall
      if (this.vhsMaterial) {
        this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.35 + Math.random() * 0.35;
      }

      if (this.uiManager) {
        this.uiManager.flashTapeError();
      }
    }
    // =========================================================================
    // Phase 4: Carpet Crash Landing & Stunned POV (4.5s - 6.0s)
    // =========================================================================
    else if (t < 6.0) {
      const p = (t - 4.5) / 1.5;

      // Audio: Brutal floor thud & camcorder mic overload
      if (!this.crashTriggered) {
        if (this.soundManager) this.soundManager.playCarpetCrash();
        this.crashTriggered = true;
        if (this.uiManager) this.uiManager.flashWhiteImpact();
      }

      // Camera hits carpet at Y=0.22 with rapid decaying impact bounce
      const impactElapsed = t - 4.5;
      const bounceDecay = Math.exp(-impactElapsed * 10.0);
      const bounceY = 0.22 + Math.sin(impactElapsed * 35.0) * 0.08 * bounceDecay;

      // Camcorder lands resting on its side on the damp carpet:
      const sideRoll = 1.36;
      const sidePitch = -0.14;
      const sideYaw = 0.42;

      // Slight groaning breathing heave
      let breatheY = 0;
      if (t >= 5.0) {
        breatheY = Math.sin((t - 5.0) * 2.2) * 0.015;
      }

      if (this.controls) {
        this.controls.yawObject.position.set(this.spawnPosition.x, bounceY + breatheY, this.spawnPosition.z);
        this.controls.yawObject.rotation.y = sideYaw;
        this.controls.pitchObject.rotation.x = sidePitch;
        this.camera.rotation.z = sideRoll;
      }

      // Groan audio cue
      if (t >= 5.1 && !this.gaspTriggered) {
        if (this.soundManager) this.soundManager.playPlayerPainedGasp();
        this.gaspTriggered = true;
      }

      // Settle VHS glitch
      if (this.vhsMaterial) {
        this.vhsMaterial.uniforms.uGlitchIntensity.value = Math.max(0.04, 0.5 * Math.exp(-impactElapsed * 4.0));
      }

      if (this.uiManager) {
        this.uiManager.setHUDLandPaused();
      }
    }
    // =========================================================================
    // Phase 5: Recovery, Stand Up, Flashlight On & Transition (6.0s - 7.5s)
    // =========================================================================
    else if (t < 7.5) {
      const p = (t - 6.0) / 1.5;
      // Smooth cubic ease-in-out curve
      const k = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      // Lift camera up from carpet (Y=0.22) to standing eye height (Y=1.65)
      const liftY = THREE.MathUtils.lerp(0.22, 1.65, k);
      // Smoothly rotate camera upright
      const curRoll = THREE.MathUtils.lerp(1.36, 0.0, k);
      const curPitch = THREE.MathUtils.lerp(-0.14, 0.0, k);
      const curYaw = THREE.MathUtils.lerp(0.42, 0.0, k);

      if (this.controls) {
        this.controls.yawObject.position.set(this.spawnPosition.x, liftY, this.spawnPosition.z);
        this.controls.yawObject.rotation.y = curYaw;
        this.controls.pitchObject.rotation.x = curPitch;
        this.camera.rotation.z = curRoll;
      }

      // Mechanical Flashlight Click ("CLACK") and fade in 60Hz hum
      if (t >= 6.8 && !this.clickTriggered) {
        if (this.soundManager) {
          this.soundManager.playFlashlightClick();
          this.soundManager.setFluorescentHumVolume(0.08, 1.5);
        }
        if (this.controls) {
          this.controls.setFlashlight(true);
        }
        if (this.uiManager) {
          this.uiManager.lockHUDRecording();
        }
        this.clickTriggered = true;
      }

      if (this.vhsMaterial) {
        this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.0;
      }
    }
    // =========================================================================
    // Cinematic Completed
    // =========================================================================
    else {
      this.finish();
    }
  }

  /**
   * Complete cinematic sequence and transfer full agency to player
   */
  finish() {
    this.isActive = false;
    this.group.visible = false;

    // Reset camera roll to zero
    this.camera.rotation.set(0, 0, 0);

    // Ensure player is at standing spawn position
    if (this.controls) {
      this.controls.setPosition(this.spawnPosition);
      this.controls.yawObject.rotation.y = 0;
      this.controls.pitchObject.rotation.x = 0;
      this.controls.setFlashlight(true);
    }

    // Reset VHS shader
    if (this.vhsMaterial) {
      this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.0;
    }

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }
}
