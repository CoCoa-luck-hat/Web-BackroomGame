import * as THREE from 'three';

export class Entity {
  constructor(scene, soundManager) {
    this.scene = scene;
    this.soundManager = soundManager;
    this.group = new THREE.Group();

    // AI States: 'patrol', 'spotted', 'chase'
    this.state = 'patrol';

    // Speeds - Balanced so sprinting player clearly outruns the monster
    this.patrolSpeed = 1.3;
    this.chaseSpeed = 3.6;
    this.currentSpeed = this.patrolSpeed;

    // Movement & timers
    this.timer = 0;
    this.animTimer = 0;
    this.twitchTimer = 0;
    this.spottedTimer = 0;
    this.chaseTimer = 0;
    this.lostSightTimer = 0;
    this.pathTimer = 0;

    // Detection ranges (meters)
    this.detectRadius = 9.5;
    this.chaseRadius = 15.0;
    this.catchDistance = 1.2;

    // Grid reference for pathfinding
    this.grid = null;
    this.cellSize = 4.0;
    this.currentPath = [];

    // Valid open-hallway waypoints in Level 0
    this.waypoints = [
      new THREE.Vector3(10, 0, 6),
      new THREE.Vector3(30, 0, 6),
      new THREE.Vector3(38, 0, 22),
      new THREE.Vector3(30, 0, 30),
      new THREE.Vector3(42, 0, 38),
      new THREE.Vector3(26, 0, 46),
      new THREE.Vector3(10, 0, 46),
      new THREE.Vector3(10, 0, 30)
    ];
    this.currentWaypointIndex = 0;

    // Collision boxes reference & radius
    this.collisionBoxes = [];
    this.entityRadius = 0.45;

    // Body parts for procedural animation
    this.limbs = [];
    this.torso = null;
    this.head = null;

    this.spawnPosition = new THREE.Vector3(38, 0, 22);

    this.initModel();
    this.reset();
  }

  initModel() {
    // Dark cable-like fibrous material
    const mat = new THREE.MeshStandardMaterial({
      color: 0x080809,
      roughness: 0.9,
      metalness: 0.1
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Main central twisted torso
    const torsoGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 7);
    this.torso = new THREE.Mesh(torsoGeo, mat);
    this.torso.position.y = 1.6;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head (twisted oblong shape)
    const headGeo = new THREE.DodecahedronGeometry(0.22);
    this.head = new THREE.Mesh(headGeo, mat);
    this.head.position.y = 2.85;
    this.group.add(this.head);

    // Eerie pin-prick eyes
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.025), eyeMat);
    eye1.position.set(0.06, 2.88, 0.2);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.025), eyeMat);
    eye2.position.set(-0.06, 2.88, 0.2);
    this.group.add(eye1);
    this.group.add(eye2);

    // Create 6 segmented tendril limbs (arms and legs)
    const limbConfigs = [
      { basePos: [-0.25, 2.5, 0], len1: 1.1, len2: 1.3, isArm: true },
      { basePos: [0.25, 2.5, 0], len1: 1.1, len2: 1.3, isArm: true },
      { basePos: [-0.15, 2.2, -0.15], len1: 0.9, len2: 1.1, isArm: true },
      { basePos: [0.15, 2.2, -0.15], len1: 0.9, len2: 1.1, isArm: true },
      { basePos: [-0.2, 1.2, 0], len1: 1.2, len2: 1.4, isArm: false },
      { basePos: [0.2, 1.2, 0], len1: 1.2, len2: 1.4, isArm: false }
    ];

    limbConfigs.forEach((cfg) => {
      const upperGeo = new THREE.CylinderGeometry(0.045, 0.06, cfg.len1, 6);
      const upper = new THREE.Mesh(upperGeo, mat);
      upper.position.set(...cfg.basePos);
      this.group.add(upper);

      const lowerGeo = new THREE.CylinderGeometry(0.03, 0.045, cfg.len2, 6);
      const lower = new THREE.Mesh(lowerGeo, mat);
      lower.position.set(cfg.basePos[0], cfg.basePos[1] - cfg.len1 * 0.9, cfg.basePos[2]);
      this.group.add(lower);

      this.limbs.push({
        upper,
        lower,
        basePos: cfg.basePos,
        isArm: cfg.isArm,
        phase: Math.random() * Math.PI * 2
      });
    });

    this.scene.add(this.group);
  }

  setCollisionBoxes(boxes) {
    this.collisionBoxes = boxes || [];
  }

  setGrid(grid, cellSize = 4.0) {
    this.grid = grid;
    this.cellSize = cellSize;
  }

  reset() {
    this.group.position.copy(this.spawnPosition);
    this.state = 'patrol';
    this.currentSpeed = this.patrolSpeed;
    this.currentWaypointIndex = 0;
    this.currentPath = [];
    this.lostSightTimer = 0;
  }

  checkWallCollision(x, z) {
    const r = this.entityRadius;
    const box = new THREE.Box3(
      new THREE.Vector3(x - r, 0.2, z - r),
      new THREE.Vector3(x + r, 2.5, z + r)
    );

    for (let i = 0; i < this.collisionBoxes.length; i++) {
      if (box.intersectsBox(this.collisionBoxes[i])) {
        return true;
      }
    }
    return false;
  }

  hasLineOfSight(fromPos, toPos) {
    const horizDist = Math.hypot(toPos.x - fromPos.x, toPos.z - fromPos.z);
    if (horizDist < 1.3) return true; // Close proximity always has line of sight
    const steps = Math.max(2, Math.ceil(horizDist / 0.6));
    const stepX = (toPos.x - fromPos.x) / steps;
    const stepZ = (toPos.z - fromPos.z) / steps;

    for (let i = 1; i < steps; i++) {
      const testX = fromPos.x + stepX * i;
      const testZ = fromPos.z + stepZ * i;
      if (this.grid) {
        const c = Math.floor(testX / this.cellSize);
        const r = Math.floor(testZ / this.cellSize);
        if (r < 0 || r >= this.grid.length || c < 0 || c >= this.grid[0].length) {
          return false;
        }
        if (this.grid[r][c] === 1 || this.grid[r][c] === 2) {
          return false;
        }
      }
      if (this.checkWallCollision(testX, testZ)) {
        return false;
      }
    }
    return true;
  }

  findPath(startPos, endPos) {
    if (!this.grid) return null;

    const startC = Math.max(0, Math.min(15, Math.floor(startPos.x / this.cellSize)));
    const startR = Math.max(0, Math.min(15, Math.floor(startPos.z / this.cellSize)));
    const endC = Math.max(0, Math.min(15, Math.floor(endPos.x / this.cellSize)));
    const endR = Math.max(0, Math.min(15, Math.floor(endPos.z / this.cellSize)));

    if (startC === endC && startR === endR) return [];

    const queue = [[startR, startC]];
    const visited = Array.from({ length: 16 }, () => Array(16).fill(false));
    const parent = Array.from({ length: 16 }, () => Array(16).fill(null));
    visited[startR][startC] = true;

    const directions = [
      [0, 1], [0, -1], [1, 0], [-1, 0]
    ];

    let reached = false;
    while (queue.length > 0) {
      const [r, c] = queue.shift();
      if (r === endR && c === endC) {
        reached = true;
        break;
      }

      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 16 && nc >= 0 && nc < 16 && !visited[nr][nc]) {
          if (this.grid[nr][nc] === 0 || this.grid[nr][nc] === 9) {
            visited[nr][nc] = true;
            parent[nr][nc] = [r, c];
            queue.push([nr, nc]);
          }
        }
      }
    }

    if (!reached) return null;

    const path = [];
    let curr = [endR, endC];
    while (curr && !(curr[0] === startR && curr[1] === startC)) {
      path.push(curr);
      curr = parent[curr[0]][curr[1]];
    }
    path.reverse();

    return path.map(([r, c]) => new THREE.Vector3(
      c * this.cellSize + this.cellSize / 2,
      0,
      r * this.cellSize + this.cellSize / 2
    ));
  }

  update(delta, playerPos, flashlightActive) {
    this.timer += delta;
    this.animTimer += delta * (this.state === 'chase' ? 14 : 6);
    this.twitchTimer += delta;
    this.pathTimer += delta;

    const myPos = this.group.position;
    // Horizontal 2D distance on XZ floor plane (player camera is at y=1.65 while monster base is at y=0)
    const distToPlayer = Math.hypot(myPos.x - playerPos.x, myPos.z - playerPos.z);
    const hasLoS = this.hasLineOfSight(myPos, playerPos);

    // AI State Machine
    if (this.state === 'patrol') {
      this.currentSpeed = this.patrolSpeed;

      // Detection: Must either have direct Line of Sight within detection range or be very close (< 4.5m)
      const canDetect = (hasLoS && distToPlayer < (flashlightActive ? this.detectRadius * 1.3 : this.detectRadius)) || distToPlayer < 4.5;

      if (canDetect) {
        this.state = 'spotted';
        this.spottedTimer = 1.4; // Freeze and roar before sprinting
        this.lostSightTimer = 0;
        this.currentPath = [];
        if (this.soundManager) {
          this.soundManager.playMonsterShriek(true);
        }
      } else {
        // Move towards current patrol waypoint
        const targetWp = this.waypoints[this.currentWaypointIndex];
        const distToWp = Math.hypot(myPos.x - targetWp.x, myPos.z - targetWp.z);

        if (distToWp < 1.5) {
          this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          this.currentPath = [];
        } else {
          // If direct path is clear, walk directly; otherwise navigate hallway path
          if (this.hasLineOfSight(myPos, targetWp)) {
            const dir = targetWp.clone().sub(myPos);
            dir.y = 0;
            dir.normalize();
            this.moveTowards(dir, this.patrolSpeed * delta);
          } else {
            if (this.pathTimer > 1.0 || this.currentPath.length === 0) {
              this.currentPath = this.findPath(myPos, targetWp) || [];
              this.pathTimer = 0;
            }
            if (this.currentPath.length > 0) {
              const nextNode = this.currentPath[0];
              if (Math.hypot(myPos.x - nextNode.x, myPos.z - nextNode.z) < 1.0) {
                this.currentPath.shift();
              }
              if (this.currentPath.length > 0) {
                const dir = this.currentPath[0].clone().sub(myPos);
                dir.y = 0;
                dir.normalize();
                this.moveTowards(dir, this.patrolSpeed * delta);
              }
            }
          }
        }
      }
    } else if (this.state === 'spotted') {
      // Windup Phase: Turn to face player
      const dirToPlayer = playerPos.clone().sub(myPos);
      dirToPlayer.y = 0;
      dirToPlayer.normalize();
      const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.18);

      this.spottedTimer -= delta;
      if (this.spottedTimer <= 0) {
        this.state = 'chase';
        this.chaseTimer = 8.5;
        this.lostSightTimer = 0;
      }
    } else if (this.state === 'chase') {
      this.currentSpeed = this.chaseSpeed;
      this.chaseTimer -= delta;

      if (!hasLoS) {
        this.lostSightTimer += delta;
      } else {
        this.lostSightTimer = 0;
      }

      // Give up if player broke distance or has been out of sight around corners for > 4.5s
      if (distToPlayer > this.chaseRadius || this.lostSightTimer > 4.5 || this.chaseTimer <= 0) {
        this.state = 'patrol';
        this.currentPath = [];
      } else {
        // Chase navigation:
        if (hasLoS) {
          // Direct pursuit in same hallway with wall sliding
          const dir = playerPos.clone().sub(myPos);
          dir.y = 0;
          dir.normalize();
          this.moveTowards(dir, this.chaseSpeed * delta);
          this.currentPath = [];
        } else {
          // Navigate hallways to reach player
          if (this.pathTimer > 0.4 || this.currentPath.length === 0) {
            this.currentPath = this.findPath(myPos, playerPos) || [];
            this.pathTimer = 0;
          }
          if (this.currentPath.length > 0) {
            const nextNode = this.currentPath[0];
            if (Math.hypot(myPos.x - nextNode.x, myPos.z - nextNode.z) < 1.0) {
              this.currentPath.shift();
            }
            if (this.currentPath.length > 0) {
              const dir = this.currentPath[0].clone().sub(myPos);
              dir.y = 0;
              dir.normalize();
              this.moveTowards(dir, this.chaseSpeed * delta);
            }
          } else {
            // Fallback direct move with wall sliding
            const dir = playerPos.clone().sub(myPos);
            dir.y = 0;
            dir.normalize();
            this.moveTowards(dir, this.chaseSpeed * delta);
          }
        }
      }
    }

    // Procedural animation
    this.animateBody(delta);

    // Catch check: within horizontal reach (1.45m) with LoS, or physical body touch (< 1.15m)
    const isCaught = (distToPlayer <= 1.45 && hasLoS) || (distToPlayer <= 1.15);

    if (this.soundManager) {
      this.soundManager.updateMonsterPosition(
        myPos.x,
        myPos.y + 1.5,
        myPos.z,
        distToPlayer,
        this.state === 'chase'
      );
    }

    return {
      isCaught: isCaught,
      distance: distToPlayer,
      state: this.state
    };
  }

  moveTowards(dir, stepDist) {
    if (dir.lengthSq() === 0) return;

    // Face direction smoothly
    const targetAngle = Math.atan2(dir.x, dir.z);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 0.16);

    const currPos = this.group.position;
    const testX = currPos.x + dir.x * stepDist;
    const testZ = currPos.z + dir.z * stepDist;

    // Both axes
    if (!this.checkWallCollision(testX, testZ)) {
      currPos.x = testX;
      currPos.z = testZ;
      return;
    }

    // Slide along X
    if (!this.checkWallCollision(testX, currPos.z)) {
      currPos.x = testX;
    }
    // Slide along Z
    if (!this.checkWallCollision(currPos.x, testZ)) {
      currPos.z = testZ;
    }
  }

  animateBody(delta) {
    // Spastic torso twitch
    const twitchX = (Math.random() - 0.5) * 0.06 * (this.state === 'chase' ? 2.5 : 1.0);
    const twitchZ = (Math.random() - 0.5) * 0.06;
    this.torso.rotation.x = Math.sin(this.animTimer * 0.5) * 0.15 + twitchX;
    this.torso.rotation.z = Math.cos(this.animTimer * 0.4) * 0.12 + twitchZ;

    // Head erratic twitching
    this.head.rotation.y = Math.sin(this.animTimer * 1.2) * 0.4;
    this.head.rotation.z = (Math.random() - 0.5) * 0.1;

    // Limb flailing
    this.limbs.forEach((limb, idx) => {
      const swing = Math.sin(this.animTimer + limb.phase);
      if (limb.isArm) {
        limb.upper.rotation.x = swing * (this.state === 'chase' ? 1.2 : 0.6);
        limb.lower.rotation.x = Math.abs(swing) * 0.8;
      } else {
        limb.upper.rotation.x = -swing * 0.7;
        limb.lower.rotation.x = Math.max(0, swing) * 0.6;
      }
    });
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
