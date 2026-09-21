import * as THREE from 'three';
import { SoundManager } from './audio/SoundManager.js';
import { Controls } from './core/Controls.js';
import { Level0 } from './world/Level0.js';
import { NoClipWall } from './world/NoClipWall.js';
import { Entity } from './world/Entity.js';
import { Poolrooms } from './world/Poolrooms.js';
import { IntroCinematic } from './world/IntroCinematic.js';
import { VHSShader } from './shaders/VHSShader.js';
import { UIManager } from './ui/UIManager.js';

class BackroomsApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.soundManager = new SoundManager();
    this.uiManager = new UIManager(this.soundManager);

    // Game States: 'intro', 'cinematic', 'level0', 'transitioning', 'poolrooms', 'gameover'
    this.state = 'intro';
    this.clock = new THREE.Clock();
    this.playerWorldPos = new THREE.Vector3();

    this.initThree();
    this.initPostProcessing();
    this.initWorlds();
    this.initControls();
    this.initUIEvents();

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  initThree() {
    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x18150c, 0.04);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  initPostProcessing() {
    this.renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      }
    );

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.vhsMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(VHSShader.uniforms),
      vertexShader: VHSShader.vertexShader,
      fragmentShader: VHSShader.fragmentShader
    });
    this.vhsMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.vhsMaterial.uniforms.uResolution.value = [window.innerWidth, window.innerHeight];

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeo, this.vhsMaterial);
    this.postScene.add(quad);
  }

  initWorlds() {
    // Level 0: The Lobby
    this.level0 = new Level0(this.scene);

    // No-Clip Anomaly Wall
    this.noClipWall = new NoClipWall(this.scene, this.level0.noClipPosition);

    // The Bacteria Entity
    this.entity = new Entity(this.scene, this.soundManager);
    this.entity.setCollisionBoxes(this.level0.collisionBoxes);
    this.entity.setGrid(this.level0.grid, this.level0.cellSize);

    // Level 37: The Poolrooms
    this.poolrooms = new Poolrooms(this.scene);
  }

  initControls() {
    this.controls = new Controls(this.camera, this.canvas, this.soundManager);
    this.controls.setCollisionBoxes(this.level0.collisionBoxes);
    this.controls.setPosition(this.level0.spawnPosition);
    this.scene.add(this.controls.getObject());

    // Connect controls to UIManager for sensitivity settings
    this.uiManager.setControls(this.controls);

    // Kane Pixels Style Found Footage Intro Cinematic Staging
    this.introCinematic = new IntroCinematic(
      this.scene,
      this.controls,
      this.soundManager,
      this.vhsMaterial,
      this.uiManager,
      this.level0.spawnPosition
    );
  }

  initUIEvents() {
    // Start Game (Trigger Kane Pixels Style Found Footage Cinematic Fall)
    this.uiManager.onStartGameCallback = async () => {
      await this.soundManager.init();
      this.state = 'cinematic';
      this.controls.enabled = false;
      this.controls.started = false;

      this.introCinematic.start(() => {
        this.controls.started = true;
        this.controls.enabled = true;
        this.controls.lock();
        this.state = 'level0';
      });
    };

    // Resume from Help Modal or Pause
    this.uiManager.onResumeGameCallback = () => {
      this.controls.lock();
    };

    // Restart back to Level 0
    this.uiManager.onRestartCallback = () => {
      this.restartToLevel0();
    };

    // Return to Main Menu
    this.uiManager.onMainMenuCallback = () => {
      this.returnToMainMenu();
    };
  }

  restartToLevel0() {
    this.state = 'level0';
    this.level0.setVisible(true);
    this.noClipWall.setVisible(true);
    this.entity.setVisible(true);
    this.entity.reset();

    this.poolrooms.setVisible(false);
    this.controls.enabled = true;
    this.controls.started = true;
    this.controls.setPosition(this.level0.spawnPosition);
    this.controls.setCollisionBoxes(this.level0.collisionBoxes);
    this.controls.surfaceType = 'carpet';

    this.scene.fog.color.setHex(0x18150c);
    this.scene.fog.density = 0.04;
    this.soundManager.setEnvironment('level0');

    this.uiManager.resetTimecode();
    this.uiManager.showHUD();
    this.controls.lock();
  }

  returnToMainMenu() {
    this.state = 'intro';
    this.controls.enabled = false;
    this.controls.started = false;
    this.controls.unlock();

    this.level0.setVisible(true);
    this.noClipWall.setVisible(true);
    this.entity.setVisible(true);
    this.entity.reset();
    this.poolrooms.setVisible(false);

    this.controls.setPosition(this.level0.spawnPosition);
    this.controls.setCollisionBoxes(this.level0.collisionBoxes);
    this.controls.surfaceType = 'carpet';

    this.scene.fog.color.setHex(0x18150c);
    this.scene.fog.density = 0.04;
    this.soundManager.setEnvironment('level0');

    this.uiManager.resetTimecode();
    this.uiManager.showIntro();
  }

  transitionToPoolrooms() {
    if (this.state === 'transitioning' || this.state === 'poolrooms') return;
    this.state = 'transitioning';
    this.soundManager.playNoClipWarp();

    // Instant Blinding White Flash!
    const whiteFlash = document.getElementById('white-flash');
    if (whiteFlash) {
      whiteFlash.classList.remove('fading');
      whiteFlash.classList.add('active');
    }

    // VHS Glitch spike
    this.vhsMaterial.uniforms.uGlitchIntensity.value = 1.0;

    // Phase 1: Dimension swap under pure whiteout (250ms)
    setTimeout(() => {
      // Hide Level 0 & Monster
      this.level0.setVisible(false);
      this.noClipWall.setVisible(false);
      this.entity.setVisible(false);

      // Show Poolrooms
      this.poolrooms.setVisible(true);
      this.controls.setCollisionBoxes(this.poolrooms.collisionBoxes);
      this.controls.surfaceType = 'water';

      // Start falling from ceiling (y = 5.5)
      this.controls.setPosition(new THREE.Vector3(0, 5.5, 0));

      // Change fog to serene bright aquamarine
      this.scene.fog.color.setHex(0xb2ebf2);
      this.scene.fog.density = 0.012;
      this.soundManager.setEnvironment('poolrooms');

      // Start fading out the white flash into the turquoise pool water!
      if (whiteFlash) {
        whiteFlash.classList.remove('active');
        whiteFlash.classList.add('fading');
      }

      // Phase 2: Dynamic dimension fall physics into shallow water (700ms)
      const fallStartTime = performance.now();
      const startY = 5.5;
      const targetY = 1.65;

      const fallInterval = setInterval(() => {
        const elapsed = (performance.now() - fallStartTime) / 700;
        if (elapsed >= 1.0) {
          clearInterval(fallInterval);
          this.controls.setPosition(new THREE.Vector3(0, targetY, 0));

          // Heavy water splashdown sound!
          this.soundManager.playFootstep('water', true);
          setTimeout(() => this.soundManager.playFootstep('water', false), 130);

          // Subtle landing bounce
          this.camera.position.y = -0.35;

          this.state = 'poolrooms';
          this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.02;
        } else {
          // Accelerate downward (gravity curve)
          const currentY = startY - (startY - targetY) * Math.pow(elapsed, 2.2);
          this.controls.setPosition(new THREE.Vector3(0, currentY, 0));
          this.vhsMaterial.uniforms.uGlitchIntensity.value = 1.0 - elapsed * 0.95;
        }
      }, 16);
    }, 250);
  }

  startDeathSequence() {
    if (this.state === 'dying' || this.state === 'gameover') return;
    this.state = 'dying';

    // Record survival time before death
    const survivalTime = this.uiManager.getFormattedTimecode();

    // Disable player movement
    this.controls.enabled = false;

    // Play horrific synthesized death scream and bass impact
    this.soundManager.playDeathScream();

    // Turn on danger vignette
    const dangerVignette = document.getElementById('danger-vignette');
    if (dangerVignette) dangerVignette.classList.add('active');

    // Position camera to look directly at the monster's face
    const monsterPos = this.entity.group.position;
    const headWorldPos = new THREE.Vector3(monsterPos.x, monsterPos.y + 2.8, monsterPos.z);

    // Monster lunges forward slightly during screamer
    const dirToPlayer = this.controls.getPosition().clone().sub(monsterPos);
    dirToPlayer.y = 0;
    dirToPlayer.normalize();
    this.entity.group.position.add(dirToPlayer.multiplyScalar(0.4));

    const jumpscareStartTime = performance.now();
    const startPitch = this.controls.pitchObject.rotation.x;
    const startYaw = this.controls.yawObject.rotation.y;

    // Calculate target yaw and pitch to face monster's head
    const diff = headWorldPos.clone().sub(this.controls.yawObject.position);
    let targetYaw = Math.atan2(-diff.x, -diff.z);
    const horizDist = Math.hypot(diff.x, diff.z);
    const targetPitch = Math.atan2(diff.y, Math.max(0.1, horizDist));

    // Shortest angular distance to prevent 360 degree spin
    let deltaYaw = (targetYaw - startYaw) % (Math.PI * 2);
    if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
    targetYaw = startYaw + deltaYaw;

    const jumpscareDuration = 1500; // 1.5 seconds jumpscare

    const jumpscareInterval = setInterval(() => {
      const elapsed = performance.now() - jumpscareStartTime;
      const progress = Math.min(1.0, elapsed / jumpscareDuration);

      // Violent camera shake + snap to monster face
      const shakeX = (Math.random() - 0.5) * 0.12 * (1.0 - progress * 0.3);
      const shakeY = (Math.random() - 0.5) * 0.12 * (1.0 - progress * 0.3);

      this.controls.yawObject.rotation.y = THREE.MathUtils.lerp(startYaw, targetYaw, Math.min(1, progress * 4.5)) + shakeX;
      this.controls.pitchObject.rotation.x = THREE.MathUtils.lerp(startPitch, targetPitch, Math.min(1, progress * 4.5)) + shakeY;

      // Heavy glitch spike
      this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.95 + (Math.random() * 0.05);

      if (progress >= 1.0) {
        clearInterval(jumpscareInterval);

        // Phase 2: Signal breakdown & static drop (0.8s)
        this.vhsMaterial.uniforms.uGlitchIntensity.value = 1.0;
        this.controls.unlock();

        setTimeout(() => {
          this.state = 'gameover';
          this.vhsMaterial.uniforms.uGlitchIntensity.value = 0.05;
          if (dangerVignette) dangerVignette.classList.remove('active');

          // Show ASYNC Casualty Report Death Screen
          this.uiManager.showDeathScreen(survivalTime);
        }, 800);
      }
    }, 16);
  }

  handleGameOver() {
    this.startDeathSequence();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.renderTarget.setSize(w * pr, h * pr);

    this.vhsMaterial.uniforms.uResolution.value = [w, h];
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    let glitchIntensity = 0.0;
    let isChasing = false;
    let distToMonster = 999;

    if (this.state === 'cinematic') {
      this.introCinematic.update(delta);
      this.soundManager.updateListener(this.camera);
    } else {
      // Update Controls
      this.controls.update(delta);

      // Get current player world position
      this.playerWorldPos.copy(this.controls.getPosition());

      // Update 3D Audio Listener
      this.soundManager.updateListener(this.camera);

      if (this.state === 'dying') {
        this.entity.animateBody(delta);
        glitchIntensity = 0.95;
      } else if (this.state === 'level0') {
        this.level0.update(delta);

        // Check No-Clip Anomaly
        const noClipStatus = this.noClipWall.update(delta, this.playerWorldPos);
        if (noClipStatus.proximityFactor > 0) {
          glitchIntensity = Math.max(glitchIntensity, noClipStatus.proximityFactor * 0.7);
        }
        if (noClipStatus.isTriggered) {
          this.transitionToPoolrooms();
        }

        // Check Monster Entity
        const entityStatus = this.entity.update(delta, this.playerWorldPos, this.controls.flashlightOn);
        distToMonster = entityStatus.distance;
        isChasing = entityStatus.state === 'chase';

        if (distToMonster < 16) {
          const monsterGlitch = Math.pow((16 - distToMonster) / 16, 1.5) * (isChasing ? 0.85 : 0.45);
          glitchIntensity = Math.max(glitchIntensity, monsterGlitch);
        }

        if (entityStatus.isCaught) {
          this.startDeathSequence();
        }

        this.uiManager.updateHUD(delta, isChasing, distToMonster);
      } else if (this.state === 'poolrooms') {
        this.poolrooms.update(delta);
        this.uiManager.updateHUD(delta, false, 999);
        glitchIntensity = 0.02;
      }

      // VHS Shader Uniforms (lerp only outside cinematic)
      this.vhsMaterial.uniforms.uGlitchIntensity.value = THREE.MathUtils.lerp(
        this.vhsMaterial.uniforms.uGlitchIntensity.value,
        glitchIntensity,
        0.15
      );
    }

    this.vhsMaterial.uniforms.uTime.value = elapsedTime;

    // Render 3D Scene to Texture, then Render Post-process to Screen
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BackroomsApp();
});
