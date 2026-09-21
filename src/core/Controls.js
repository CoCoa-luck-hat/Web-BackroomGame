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
    this.touchSensitivity = this.mouseSensitivity * 1.5;
    this.justLocked = false;

    // Mobile / Touch Detection & State
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    this.touchMoveId = null;
    this.touchMoveOrigin = { x: 0, y: 0 };
    this.touchVector = { x: 0, y: 0 }; // Normalized [-1, 1]
    this.touchAutoSprint = false;
    this.joystickMaxRadius = 46;

    this.touchLookId = null;
    this.touchLookLast = { x: 0, y: 0 };

    this.joystickBase = null;
    this.joystickNipple = null;

    // Camera sway and bob
    this.bob = new CameraBob();

    // Collision
    this.collisionBoxes = [];
    this.playerRadius = 0.45;

    // Surface type for footstep sounds ('carpet' or 'water')
    this.surfaceType = 'carpet';
    this.started = false;

    this.initListeners();
    this.initTouchListeners();
    this.initFlashlight();
  }

  getObject() {
    return this.yawObject;
  }

  setSensitivity(value) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      this.mouseSensitivity = parsed;
      this.touchSensitivity = parsed * 1.5;
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

      if (pauseOverlay && this.started && !this.isTouchDevice) {
        if (!this.isLocked && !helpOpen) {
          pauseOverlay.classList.remove('hidden');
        } else {
          pauseOverlay.classList.add('hidden');
        }
      }
    });

    // Re-lock pointer on canvas click whenever unlocked (Desktop only)
    this.domElement.addEventListener('click', () => {
      if (this.isTouchDevice) return;
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
    if (this.isTouchDevice) {
      this.isLocked = true;
      return;
    }
    this.domElement.requestPointerLock();
  }

  unlock() {
    if (this.isTouchDevice) {
      this.isLocked = false;
      return;
    }
    document.exitPointerLock();
  }

  initTouchListeners() {
    this.joystickBase = document.getElementById('touch-joystick-base');
    this.joystickNipple = document.getElementById('touch-joystick-nipple');
    const moveZone = document.getElementById('touch-move-zone');
    const lookZone = document.getElementById('touch-look-zone');
    const btnSprint = document.getElementById('btn-touch-sprint');
    const btnLight = document.getElementById('btn-touch-light');

    // 1. Dynamic Floating Joystick (Left Half Move Zone)
    if (moveZone && this.joystickBase && this.joystickNipple) {
      moveZone.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (this.touchMoveId === null) {
            this.touchMoveId = touch.identifier;
            this.touchMoveOrigin = { x: touch.clientX, y: touch.clientY };
            this.touchVector = { x: 0, y: 0 };
            this.touchAutoSprint = false;

            // Anchor joystick base directly under thumb
            this.joystickBase.style.left = `${touch.clientX}px`;
            this.joystickBase.style.top = `${touch.clientY}px`;
            this.joystickNipple.style.transform = 'translate(-50%, -50%)';
            this.joystickBase.classList.remove('hidden');
            break;
          }
        }
      }, { passive: false });

      const handleMoveTouch = (e) => {
        if (!this.enabled || this.touchMoveId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.touchMoveId) {
            e.preventDefault();
            const dx = touch.clientX - this.touchMoveOrigin.x;
            const dy = touch.clientY - this.touchMoveOrigin.y;
            const dist = Math.hypot(dx, dy);
            const clampedDist = Math.min(dist, this.joystickMaxRadius);
            const angle = Math.atan2(dy, dx);

            const nippleX = Math.cos(angle) * clampedDist;
            const nippleY = Math.sin(angle) * clampedDist;

            this.joystickNipple.style.transform = `translate(calc(-50% + ${nippleX}px), calc(-50% + ${nippleY}px))`;

            // Normalized analog vector: X = strafe [-1, 1], Y = forward/back [-1, 1]
            this.touchVector.x = nippleX / this.joystickMaxRadius;
            this.touchVector.y = -nippleY / this.joystickMaxRadius;

            // Auto-sprint when pushed near maximum radius forward
            if (dist > this.joystickMaxRadius * 0.85 && this.touchVector.y > 0.55) {
              this.touchAutoSprint = true;
            } else {
              this.touchAutoSprint = false;
            }
            break;
          }
        }
      };

      const handleEndTouch = (e) => {
        if (this.touchMoveId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.touchMoveId) {
            this.touchMoveId = null;
            this.touchVector = { x: 0, y: 0 };
            this.touchAutoSprint = false;
            this.joystickBase.classList.add('hidden');
            this.joystickNipple.style.transform = 'translate(-50%, -50%)';
            break;
          }
        }
      };

      moveZone.addEventListener('touchmove', handleMoveTouch, { passive: false });
      moveZone.addEventListener('touchend', handleEndTouch, { passive: false });
      moveZone.addEventListener('touchcancel', handleEndTouch, { passive: false });
      window.addEventListener('touchcancel', handleEndTouch, { passive: false });
    }

    // 2. Swipe-to-Look (Right Half Look Zone)
    if (lookZone) {
      lookZone.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (this.touchLookId === null) {
            this.touchLookId = touch.identifier;
            this.touchLookLast = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }
      }, { passive: false });

      lookZone.addEventListener('touchmove', (e) => {
        if (!this.enabled || this.touchLookId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.touchLookId) {
            e.preventDefault();
            const dx = touch.clientX - this.touchLookLast.x;
            const dy = touch.clientY - this.touchLookLast.y;
            this.touchLookLast = { x: touch.clientX, y: touch.clientY };

            // Rotate camera (1:1 responsive touch look)
            this.yawObject.rotation.y -= dx * this.touchSensitivity;
            this.pitchObject.rotation.x -= dy * this.touchSensitivity;

            // Clamp vertical pitch [-85 deg, +85 deg]
            const maxPitch = Math.PI / 2 - 0.08;
            this.pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.pitchObject.rotation.x));
            break;
          }
        }
      }, { passive: false });

      const handleEndLook = (e) => {
        if (this.touchLookId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.touchLookId) {
            this.touchLookId = null;
            break;
          }
        }
      };

      lookZone.addEventListener('touchend', handleEndLook, { passive: false });
      lookZone.addEventListener('touchcancel', handleEndLook, { passive: false });
    }

    // 3. Camcorder Action Buttons
    if (btnSprint) {
      btnSprint.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys.sprint = true;
        btnSprint.classList.add('active');
      }, { passive: false });

      const releaseSprint = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys.sprint = false;
        btnSprint.classList.remove('active');
      };

      btnSprint.addEventListener('touchend', releaseSprint, { passive: false });
      btnSprint.addEventListener('touchcancel', releaseSprint, { passive: false });
    }

    if (btnLight) {
      btnLight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleFlashlight();
        btnLight.classList.add('active');
        setTimeout(() => btnLight.classList.remove('active'), 150);
      }, { passive: false });
    }
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
    if (!this.enabled || (!this.isLocked && !this.isTouchDevice)) {
      this.currentSpeed = 0;
      return;
    }

    const isKeyMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    const isTouchMoving = this.touchMoveId !== null && (Math.abs(this.touchVector.x) > 0.05 || Math.abs(this.touchVector.y) > 0.05);
    const isMoving = isKeyMoving || isTouchMoving;

    // Stamina
    const sprintRequested = this.keys.sprint || this.touchAutoSprint;
    let isSprinting = sprintRequested && isMoving && this.stamina > 5;
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

      // Add touch joystick continuous analog displacement
      if (isTouchMoving) {
        displacement.addScaledVector(forward, this.touchVector.y);
        displacement.addScaledVector(right, this.touchVector.x);
      }

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
