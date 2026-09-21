import * as THREE from 'three';

/**
 * Procedural Texture Generator
 * Creates authentic Backrooms materials (Damp Yellow Wallpaper, Moldy Carpet,
 * Ceiling Tiles, and Clean White Pool Tiles) directly using HTML5 Canvas.
 */
export class TextureGenerator {
  /**
   * Iconic Level 0 Mono-Yellow Wallpaper with moisture stains and fine vertical stripes
   */
  static createWallpaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base yellow-amber backrooms color
    ctx.fillStyle = '#caa348';
    ctx.fillRect(0, 0, 512, 512);

    // Fine vertical wallpaper pinstripes
    ctx.fillStyle = '#be963b';
    for (let x = 0; x < 512; x += 8) {
      ctx.fillRect(x, 0, 3, 512);
    }

    // Damp moisture stains and aging dark blotches
    for (let i = 0; i < 40; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rRad = 20 + Math.random() * 60;
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rRad);
      grad.addColorStop(0, 'rgba(85, 70, 25, 0.22)');
      grad.addColorStop(0.6, 'rgba(120, 95, 35, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, rRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grain & mold speckles
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Damp, Moldy Greenish-Brown Carpet
   */
  static createCarpetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base damp greenish-brown
    ctx.fillStyle = '#4a442e';
    ctx.fillRect(0, 0, 512, 512);

    // Fine carpet pile noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45;
      d[i] = Math.min(255, Math.max(0, 80 + noise));
      d[i + 1] = Math.min(255, Math.max(0, 75 + noise * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, 50 + noise * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    // Mold patches / water leaks on floor
    for (let i = 0; i < 25; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rRad = 25 + Math.random() * 50;
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rRad);
      grad.addColorStop(0, 'rgba(20, 25, 15, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, rRad, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Drop Ceiling Office Tiles (Acoustic panels with grid frame)
   */
  static createCeilingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Off-white grayish office panel
    ctx.fillStyle = '#b8b4a8';
    ctx.fillRect(0, 0, 512, 512);

    // Acoustic panel dot perforation pattern
    ctx.fillStyle = '#8a8578';
    for (let y = 8; y < 512; y += 16) {
      for (let x = 8; x < 512; x += 16) {
        ctx.beginPath();
        ctx.arc(x + (y % 32 === 0 ? 8 : 0), y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Grid metal frame
    ctx.strokeStyle = '#5a564c';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);

    // Subtle water leak ring
    const leakGrad = ctx.createRadialGradient(256, 256, 0, 256, 256, 120);
    leakGrad.addColorStop(0, 'rgba(140, 110, 50, 0.25)');
    leakGrad.addColorStop(0.8, 'rgba(100, 80, 40, 0.1)');
    leakGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = leakGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 120, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Pristine White Grid Tiles for The Poolrooms (Level 37)
   */
  static createPoolTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Soft clean porcelain tile
    ctx.fillStyle = '#eef3f7';
    ctx.fillRect(0, 0, 512, 512);

    // Grout lines (2x2 tiles per unit)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeRect(256, 0, 256, 256);
    ctx.strokeRect(0, 256, 256, 256);
    ctx.strokeRect(256, 256, 256, 256);

    // Subtle gloss highlights on each tile
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(10, 10, 236, 40);
    ctx.fillRect(266, 10, 236, 40);
    ctx.fillRect(10, 266, 236, 40);
    ctx.fillRect(266, 266, 236, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Real-World Clean Hallway Wall with Baseboard
   */
  static createRealWorldWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Clean neutral drywall paint
    ctx.fillStyle = '#dcdfe4';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle paint roller stipple noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Wood baseboard at the bottom
    ctx.fillStyle = '#2c2219';
    ctx.fillRect(0, 440, 512, 72);
    ctx.fillStyle = '#4a3b2c';
    ctx.fillRect(0, 436, 512, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Real-World Commercial Vinyl / Linoleum Floor Tiles
   */
  static createRealWorldTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base vinyl tile tone
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle vinyl speckle
    for (let i = 0; i < 200; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#cbd5e1' : '#64748b';
      ctx.fillRect(rx, ry, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }

    // Grout grid (4x4 tiles)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Real-World Office Wooden Door
   */
  static createDoorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Woodgrain brown
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, 256, 512);

    // Vertical woodgrain streaks
    for (let x = 0; x < 256; x += 4) {
      ctx.fillStyle = Math.random() > 0.5 ? '#4a3328' : '#6e4d3d';
      ctx.fillRect(x, 0, 2, 512);
    }

    // Door frame & inset panels
    ctx.strokeStyle = '#32221b';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 492);

    // Top inset panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(25, 25, 206, 200);
    ctx.strokeStyle = '#261a14';
    ctx.lineWidth = 4;
    ctx.strokeRect(25, 25, 206, 200);

    // Bottom inset panel
    ctx.fillRect(25, 255, 206, 230);
    ctx.strokeRect(25, 255, 206, 230);

    // Brass door handle
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(215, 260, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(180, 256, 35, 8);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
