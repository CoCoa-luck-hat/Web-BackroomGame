import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class NoClipWall {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position.clone();
    this.group = new THREE.Group();

    this.mesh = null;
    this.particles = null;
    this.anomalyLight = null;
    this.timer = 0;

    this.triggerDistance = 2.85; // Instantly triggers as soon as player touches threshold
    this.detectDistance = 10.0;  // Meters where glitch begins to show

    this.init();
  }

  init() {
    // Wall geometry matching maze wall block
    const geo = new THREE.BoxGeometry(4.0, 3.0, 4.0);

    // Custom shader material for vibrating anomalous wall
    const wallpaperTex = TextureGenerator.createWallpaperTexture();
    wallpaperTex.repeat.set(1.5, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: wallpaperTex },
        uTime: { value: 0.0 },
        uProximity: { value: 0.0 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProximity;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vNormal = normal;
          vec3 pos = position;

          // Vibrating anomalous surface displacement
          float displacement = sin(pos.y * 10.0 + uTime * 15.0) * cos(pos.x * 10.0 + uTime * 12.0);
          pos += normal * displacement * (0.04 + uProximity * 0.12);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uProximity;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec2 uv = vUv;
          
          // Glitch UV jitter
          if (uProximity > 0.05) {
            float jitter = sin(uv.y * 50.0 + uTime * 20.0) * 0.02 * uProximity;
            uv.x += jitter;
          }

          vec4 texColor = texture2D(tDiffuse, uv);

          // Anomaly shimmer glow (cyan/white reality tear fissure)
          float glowWave = sin(uv.y * 12.0 - uTime * 8.0) * 0.5 + 0.5;
          vec3 anomalyColor = vec3(0.1, 0.9, 1.0) * glowWave * (0.3 + uProximity * 0.9);

          // Subtle pulse flash
          float pulse = sin(uTime * 5.0) * 0.5 + 0.5;
          anomalyColor += vec3(pulse * 0.2);

          vec3 finalColor = mix(texColor.rgb, texColor.rgb + anomalyColor, 0.45 + uProximity * 0.5);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.copy(this.position);
    this.group.add(this.mesh);

    // Glowing PointLight inside anomaly
    this.anomalyLight = new THREE.PointLight(0x00f2fe, 1.5, 12, 1.8);
    this.anomalyLight.position.copy(this.position);
    this.group.add(this.anomalyLight);

    // Reality tear floating particles
    this.createFloatingParticles();

    this.scene.add(this.group);
  }

  createFloatingParticles() {
    const pCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x88ffff,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(pGeo, pMat);
    this.particles.position.copy(this.position);
    this.group.add(this.particles);
  }

  update(delta, playerPos) {
    this.timer += delta;

    if (this.material && this.material.uniforms) {
      this.material.uniforms.uTime.value = this.timer;
    }

    // Measure distance to player
    const dist = this.mesh.position.distanceTo(playerPos);
    let proximityFactor = 0;

    if (dist < this.detectDistance) {
      proximityFactor = Math.max(0, (this.detectDistance - dist) / this.detectDistance);
      if (this.material && this.material.uniforms) {
        this.material.uniforms.uProximity.value = proximityFactor;
      }
      this.anomalyLight.intensity = 1.2 + proximityFactor * 3.5;
    } else {
      if (this.material && this.material.uniforms) {
        this.material.uniforms.uProximity.value = 0;
      }
      this.anomalyLight.intensity = 1.2;
    }

    // Rotate and drift floating particles
    if (this.particles) {
      this.particles.rotation.y += delta * 0.4;
      this.particles.rotation.x = Math.sin(this.timer * 0.8) * 0.15;
    }

    // Check if player walked inside the No-clip trigger zone!
    const isTriggered = dist <= this.triggerDistance;
    return {
      isTriggered: isTriggered,
      proximityFactor: proximityFactor,
      distance: dist
    };
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
