/**
 * Custom VHS Found Footage Post-Processing Shader for Three.js
 * Optimized for immersive realism: Zero fishbowl distortion (walls stay straight),
 * fine analog scanlines, tape noise, chromatic aberration, and entity proximity glitch.
 */

export const VHSShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uResolution: { value: [1920, 1080] },
    uGlitchIntensity: { value: 0.0 }, // Dynamic glitch near monster or no-clip
    uCurvature: { value: 0.0 }        // Zero curvature to prevent disorienting warping
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGlitchIntensity;
    uniform float uCurvature;
    varying vec2 vUv;

    // Pseudo-random hash
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // Horizontal subtle tape tracking jitter
      float trackingBar = sin(uv.y * 2.5 - uTime * 3.0);
      float trackingLine = smoothstep(0.97, 1.0, trackingBar);
      float hJitter = (hash(vec2(uTime, uv.y)) - 0.5) * 0.002 * (1.0 + uGlitchIntensity * 4.0);

      // Intense glitch displacement when near monster
      if (uGlitchIntensity > 0.02) {
        float slice = step(0.90, hash(vec2(floor(uv.y * 35.0), floor(uTime * 18.0))));
        hJitter += (hash(vec2(uTime * 3.0, uv.y)) - 0.5) * uGlitchIntensity * 0.07 * slice;
      }

      uv.x += hJitter + trackingLine * 0.004 * (1.0 + uGlitchIntensity * 2.5);

      // Chromatic Aberration (subtle RGB shift, intensifies during glitch)
      vec2 center = uv - 0.5;
      float distSq = dot(center, center);
      float rgbSplit = (0.0018 + distSq * 0.004) + (uGlitchIntensity * 0.012);

      vec4 colorR = texture2D(tDiffuse, vec2(uv.x + rgbSplit, uv.y));
      vec4 colorG = texture2D(tDiffuse, uv);
      vec4 colorB = texture2D(tDiffuse, vec2(uv.x - rgbSplit, uv.y));

      vec3 color = vec3(colorR.r, colorG.g, colorB.b);

      // Fine CRT Scanlines
      float scanline = sin(uv.y * uResolution.y * 1.2) * 0.045;
      color -= scanline;

      // Realistic Film / Analog Noise
      float grain = (hash(uv * 600.0 + uTime * 25.0) - 0.5) * (0.07 + uGlitchIntensity * 0.2);
      color += grain;

      // Static snow noise during high glitch intensity
      if (uGlitchIntensity > 0.15) {
        float snow = hash(uv * 1000.0 + uTime * 35.0);
        float snowMask = step(1.0 - (uGlitchIntensity * 0.3), snow);
        color = mix(color, vec3(snow), snowMask * 0.75);
      }

      // 90s Camcorder color grading (natural phosphors)
      color.r = pow(color.r, 0.96) * 1.01;
      color.g = pow(color.g, 0.94) * 1.02;
      color.b = pow(color.b, 1.03) * 0.96;

      // Soft vignette around edges
      float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
      float vigFactor = clamp(16.0 * vignette, 0.0, 1.0);
      color *= pow(vigFactor, 0.22);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};
