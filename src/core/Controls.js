import * as THREE from 'three';
import { CameraBob } from './CameraBob.js';

export class Controls {
  constructor(camera, domElement, soundManager) {
    this.camera = camera;
    this.domElement = domElement;
    this.soundManager = soundManager;

    this.isLocked = false;
    this.enabled = true;

    // Movement speeds (m/s)
    this.walkSpeed = 3.6;
    this.sprintSpeed = 6.8; // Sprint is significantly faster than monster chase (3.8 m/s)
    this.currentSpeed = 0;

    // Stamina
    this.maxStamina = 100;
    this.stamina = 100;
    this.staminaDrainRate = 14;   // Lasts ~7.2s of full sprint
    this.staminaRecoverRate = 24; // Recovers quickly when walking

    // Flashlight
    this.flashlightOn = true;
    this.flashlight = null;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false
    };

    // Standard FPS Decoupled Hierarchy:
    // yawObject (horizontal Y-rotation) -> pitchObject (vertical X-rotation) -> camera
    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);

    // Initial eye height
    this.baseCameraY = 1.65;
    this.yawObject.position.y = this.baseCameraY;
    this.camera.position.set(0, 0, 0);

    // Standard FPS mouse sensitivity (with localStorage support)
    const savedSens = localStorage.getItem('backrooms_mouse_sensitivity');
    this.mouseSensitivity = savedSens ? parseFloat(savedSens) : 0.0024;
    this.justLocked = false;

    // Camera sway and bob
    this.bob = new CameraBob();

    // Collision
    this.collisionBoxes = [];
    this.playerRadius = 0.45;

    // Surface type for footstep sounds ('carpet' or 'water')
    this.surfaceType = 'carpet';
    this.started = false;

    this.initListeners();
    this.initFlashlight();
  }

  getObject() {
    return this.yawObject;
  }

  setSensitivity(value) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      this.mouseSensitivity = parsed;
      try {
        localStorage.setItem('backrooms_mouse_sensitivity', parsed.toString());
      } catch (e) {}
    }
  }

  getSensitivity() {
    return this.mouseSensitivity;
  }

  initListeners() {
    // Pointer Lock change listener
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (this.isLocked) {
        this.justLocked = true;
      }
      const pauseOverlay = document.getElementById('pause-overlay');
      const helpModal = document.getElementById('help-modal');
      const helpOpen = helpModal && !helpModal.classList.contains('hidden');

      if (pauseOverlay && this.started) {
        if (!this.isLocked && !helpOpen) {
          pauseOverlay.classList.remove('hidden');
        } else {
          pauseOverlay.classList.add('hidden');
        }
      }
    });

    // Re-lock pointer on canvas click whenever unlocked
    this.domElement.addEventListener('click', () => {
      const helpModal = document.getElementById('help-modal');
      const helpOpen = helpModal && !helpModal.classList.contains('hidden');
      if (!this.isLocked && this.enabled && this.started && !helpOpen) {
        this.lock();
      }
    });

    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
      pauseOverlay.addEventListener('click', () => {
        if (!this.isLocked && this.enabled && this.started) {
          this.lock();
        }
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || !this.enabled) return;

      // Ignore synthetic first-frame recentering jump after pointer lock
      if (this.justLocked) {
        this.justLocked = false;
        return;
      }

      const rawX = e.movementX || 0;
      const rawY = e.movementY || 0;

      // Only reject extreme abnormal hardware/browser teleport glitches (> 600px in a single frame)
      if (Math.abs(rawX) > 600 || Math.abs(rawY) > 600) {
        return;
      }

      // Smooth 1:1 raw FPS mouse rotation
      this.yawObject.rotation.y -= rawX * this.mouseSensitivity;
      this.pitchObject.rotation.x -= rawY * this.mouseSensitivity;

      // Clamp vertical look pitch [-85 deg, +85 deg]
      const maxPitch = Math.PI / 2 - 0.08;
      this.pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.pitchObject.rotation.x));
    });

    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.onKeyDown(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.onKeyUp(e.code);
    });
  }

  initFlashlight() {
    // Flashlight attached to pitchObject so it follows vertical and horizontal look
    this.flashlight = new THREE.SpotLight(0xfff5db, 2.8, 28, Math.PI / 4.2, 0.4, 1.2);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.bias = -0.001;

    this.flashlightTarget = new THREE.Object3D();
    this.pitchObject.add(this.flashlightTarget);
    this.flashlightTarget.position.set(0, 0, -10);

    this.flashlight.target = this.flashlightTarget;
    this.flashlight.position.set(0.12, -0.08, 0.1);
    this.pitchObject.add(this.flashlight);
  }

  toggleFlashlight() {
    this.setFlashlight(!this.flashlightOn);
    if (this.soundManager) {
      this.soundManager.playFlashlightClick();
    }
  }

  setFlashlight(isOn) {
    this.flashlightOn = !!isOn;
    if (this.flashlight) {
      this.flashlight.visible = this.flashlightOn;
    }
  }

  onKeyDown(code) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'KeyF':
        this.toggleFlashlight();
        break;
    }
  }

  onKeyUp(code) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  setPosition(pos) {
    this.yawObject.position.set(pos.x, this.baseCameraY, pos.z);
  }

  getPosition() {
    return this.yawObject.position;
  }

  setCollisionBoxes(boxes) {
    this.collisionBoxes = boxes;
  }

  update(delta) {
    if (!this.enabled || !this.isLocked) {
      this.currentSpeed = 0;
      return;
    }

    const isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;

    // Stamina
    let isSprinting = this.keys.sprint && isMoving && this.stamina > 5;
    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * delta);
      if (this.stamina === 0) isSprinting = false;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecoverRate * delta);
    }

    const targetSpeed = isMoving ? (isSprinting ? this.sprintSpeed : this.walkSpeed) : 0;
    this.currentSpeed = targetSpeed;

    // Movement calculation in absolute yaw space
    if (isMoving) {
      const yaw = this.yawObject.rotation.y;
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

      const displacement = new THREE.Vector3();
      if (this.keys.forward) displacement.add(forward);
      if (this.keys.backward) displacement.sub(forward);
      if (this.keys.right) displacement.add(right);
      if (this.keys.left) displacement.sub(right);

      if (displacement.lengthSq() > 0) {
        displacement.normalize();
        displacement.multiplyScalar(targetSpeed * delta);
        this.moveWithCollision(displacement);
      }
    }

    // Handheld Camcorder Bobbing (subtle, no nausea)
    const bobOffset = this.bob.update(
      delta,
      this.currentSpeed,
      isMoving,
      isSprinting,
      (sprinting) => {
        if (this.soundManager) {
          this.soundManager.playFootstep(this.surfaceType, sprinting);
        }
      }
    );

    // Apply vertical and subtle horizontal bobbing to camera inside pitchObject
    this.camera.position.y = bobOffset.y;
    this.camera.position.x = bobOffset.x;
  }

  moveWithCollision(displacement) {
    const origPos = this.yawObject.position.clone();

    // Test X movement
    const testPosX = origPos.x + displacement.x;
    if (!this.checkCollisionAt(testPosX, origPos.z)) {
      this.yawObject.position.x = testPosX;
    }

    // Test Z movement
    const testPosZ = origPos.z + displacement.z;
    if (!this.checkCollisionAt(this.yawObject.position.x, testPosZ)) {
      this.yawObject.position.z = testPosZ;
    }
  }

  checkCollisionAt(x, z) {
    const r = this.playerRadius;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(x - r, 0.2, z - r),
      new THREE.Vector3(x + r, 2.5, z + r)
    );

    for (let i = 0; i < this.collisionBoxes.length; i++) {
      if (playerBox.intersectsBox(this.collisionBoxes[i])) {
        return true;
      }
    }
    return false;
  }
}
