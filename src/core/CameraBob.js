/**
 * Authentic Handheld Camcorder Sway & Walking Bobbing
 * Simulates the natural sway of holding a vintage 90s camcorder while walking.
 */

export class CameraBob {
  constructor() {
    this.timer = 0;
    this.swayTimer = 0;
    this.currentOffset = { x: 0, y: 0, rotZ: 0 };
    this.stepTriggerDistance = 1.6; // Meters travelled between footstep sounds
    this.distanceAccumulator = 0;
  }

  update(delta, speed, isMoving, isSprinting, onStepCallback) {
    // Handheld idle breathing sway (even when standing still)
    this.swayTimer += delta * 1.5;
    const idleSwayX = Math.sin(this.swayTimer * 0.8) * 0.012;
    const idleSwayY = Math.cos(this.swayTimer * 1.1) * 0.015;

    if (isMoving && speed > 0.1) {
      const bobFreq = isSprinting ? 12.0 : 8.0;
      const bobAmpY = isSprinting ? 0.07 : 0.04;
      const bobAmpX = isSprinting ? 0.04 : 0.025;

      this.timer += delta * bobFreq;

      // Vertical bounce (sine wave)
      const walkBobY = Math.abs(Math.sin(this.timer)) * bobAmpY;
      // Horizontal sway (half frequency)
      const walkBobX = Math.sin(this.timer * 0.5) * bobAmpX;
      // Camera tilt roll
      const walkTiltZ = Math.sin(this.timer * 0.5) * (isSprinting ? 0.03 : 0.015);

      this.currentOffset.x = idleSwayX + walkBobX;
      this.currentOffset.y = idleSwayY + walkBobY;
      this.currentOffset.rotZ = walkTiltZ;

      // Footstep distance accumulator
      this.distanceAccumulator += speed * delta;
      const triggerThreshold = isSprinting ? 1.3 : 1.7;
      if (this.distanceAccumulator >= triggerThreshold) {
        this.distanceAccumulator = 0;
        if (onStepCallback) {
          onStepCallback(isSprinting);
        }
      }
    } else {
      // Return smoothly to idle
      this.currentOffset.x = idleSwayX;
      this.currentOffset.y = idleSwayY;
      this.currentOffset.rotZ *= 0.9;
      this.distanceAccumulator = 0;
    }

    return this.currentOffset;
  }
}
