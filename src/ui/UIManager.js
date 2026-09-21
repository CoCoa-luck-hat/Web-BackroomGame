/**
 * UI Manager - Cinematic Found Footage Edition
 * Minimalist, immersive, authentic camcorder telemetry.
 */

export class UIManager {
  constructor(soundManager) {
    this.soundManager = soundManager;

    // DOM Elements
    this.introScreen = document.getElementById('intro-screen');
    this.camcorderHud = document.getElementById('camcorder-hud');
    this.batteryLevel = document.getElementById('battery-level');
    this.tapeTimecode = document.getElementById('tape-timecode');
    this.tapeDate = document.getElementById('tape-date');
    this.recText = document.querySelector('.rec-text');
    this.recDot = document.querySelector('.rec-dot');
    this.dangerVignette = document.getElementById('danger-vignette');
    this.whiteFlash = document.getElementById('white-flash');

    this.rewindScreen = document.getElementById('rewind-screen');
    this.rewindBar = document.getElementById('rewind-bar');

    this.helpModal = document.getElementById('help-modal');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnResumeGame = document.getElementById('btn-resume-game');

    // Death Screen
    this.deathScreen = document.getElementById('death-screen');
    this.deathTimeSurvived = document.getElementById('death-time-survived');
    this.btnDeathRetry = document.getElementById('btn-death-retry');
    this.btnDeathMenu = document.getElementById('btn-death-menu');

    // Mobile Elements & Touch Detection
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    this.mobileTouchControls = document.getElementById('mobile-touch-controls');
    this.btnTouchMenu = document.getElementById('btn-touch-menu');
    this.mobileRotatePrompt = document.getElementById('mobile-rotate-prompt');

    // Sensitivity sliders
    this.pauseSensSlider = document.getElementById('pause-sens-slider');
    this.pauseSensVal = document.getElementById('pause-sens-val');
    this.modalSensSlider = document.getElementById('modal-sens-slider');
    this.modalSensVal = document.getElementById('modal-sens-val');
    this.controls = null;

    this.timecodeSeconds = 0;
    this.batteryPercent = 95;

    this.onStartGameCallback = null;
    this.onResumeGameCallback = null;
    this.onRestartCallback = null;
    this.onMainMenuCallback = null;

    this.applyMobileAdaptations();
    this.initListeners();
    this.initOrientationListener();
  }

  applyMobileAdaptations() {
    if (!this.isTouchDevice) return;

    const promptText = document.getElementById('intro-prompt-text');
    if (promptText) promptText.textContent = 'TAP ANYWHERE TO ENTER FOOTAGE';

    if (this.btnDeathRetry) {
      this.btnDeathRetry.innerHTML = '<span class="prompt-bracket">[</span> TAP TO REWIND TAPE <span class="prompt-bracket">]</span>';
    }
    if (this.btnDeathMenu) {
      this.btnDeathMenu.innerHTML = '<span class="prompt-bracket">[</span> TAP FOR MAIN MENU <span class="prompt-bracket">]</span>';
    }
    if (this.btnResumeGame) {
      this.btnResumeGame.innerHTML = '<span class="prompt-bracket">[</span> TAP TO RESUME FOOTAGE <span class="prompt-bracket">]</span>';
    }
  }

  initOrientationListener() {
    if (!this.isTouchDevice) return;
    const checkOrientation = () => {
      if (!this.mobileRotatePrompt) return;
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isPortrait && window.innerWidth <= 950) {
        this.mobileRotatePrompt.classList.remove('hidden');
      } else {
        this.mobileRotatePrompt.classList.add('hidden');
      }
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 150));
    checkOrientation();
  }

  setControls(controls) {
    this.controls = controls;
    if (!controls) return;

    // Load saved or default sensitivity
    const currentSens = controls.getSensitivity();
    const displayVal = (currentSens * 1000).toFixed(1);

    if (this.pauseSensSlider) this.pauseSensSlider.value = displayVal;
    if (this.pauseSensVal) this.pauseSensVal.textContent = displayVal;
    if (this.modalSensSlider) this.modalSensSlider.value = displayVal;
    if (this.modalSensVal) this.modalSensVal.textContent = displayVal;

    const handleSensChange = (val) => {
      const num = parseFloat(val);
      const formatted = num.toFixed(1);
      if (this.pauseSensSlider) this.pauseSensSlider.value = formatted;
      if (this.pauseSensVal) this.pauseSensVal.textContent = formatted;
      if (this.modalSensSlider) this.modalSensSlider.value = formatted;
      if (this.modalSensVal) this.modalSensVal.textContent = formatted;

      this.controls.setSensitivity(num / 1000);
    };

    if (this.pauseSensSlider) {
      this.pauseSensSlider.addEventListener('input', (e) => handleSensChange(e.target.value));
    }
    if (this.modalSensSlider) {
      this.modalSensSlider.addEventListener('input', (e) => handleSensChange(e.target.value));
    }
  }

  initListeners() {
    // Click/tap anywhere on intro screen to start
    if (this.introScreen) {
      this.introScreen.addEventListener('click', () => {
        // Auto-request fullscreen on mobile touch devices
        if (this.isTouchDevice && !document.fullscreenElement) {
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen().catch(() => {});
          }
        }
        if (this.onStartGameCallback) {
          this.onStartGameCallback();
        }
      });
    }

    // Pause resume button
    const pauseResumeClick = document.getElementById('pause-resume-click');
    if (pauseResumeClick) {
      pauseResumeClick.addEventListener('click', () => {
        if (this.soundManager?.playVcrButtonClick) this.soundManager.playVcrButtonClick();
        if (this.onResumeGameCallback) {
          this.onResumeGameCallback();
        }
      });
    }

    // Help modal toggles (ESC or H or mobile menu button)
    const openModal = () => {
      if (this.soundManager?.playVcrButtonClick) this.soundManager.playVcrButtonClick();
      this.helpModal.classList.remove('hidden');
      if (this.isTouchDevice && this.mobileTouchControls) {
        this.mobileTouchControls.classList.add('hidden');
      }
      const pauseOverlay = document.getElementById('pause-overlay');
      if (pauseOverlay) pauseOverlay.classList.add('hidden');
      if (!this.isTouchDevice) document.exitPointerLock();
    };

    const closeModal = () => {
      if (this.soundManager?.playVcrButtonClick) this.soundManager.playVcrButtonClick();
      this.helpModal.classList.add('hidden');
      if (this.isTouchDevice && this.mobileTouchControls && !this.camcorderHud.classList.contains('hidden')) {
        this.mobileTouchControls.classList.remove('hidden');
      }
      if (this.onResumeGameCallback) {
        this.onResumeGameCallback();
      }
    };

    if (this.btnCloseModal) this.btnCloseModal.addEventListener('click', closeModal);
    if (this.btnResumeGame) this.btnResumeGame.addEventListener('click', closeModal);

    // Mobile on-screen Menu button
    if (this.btnTouchMenu) {
      this.btnTouchMenu.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.helpModal.classList.contains('hidden')) {
          openModal();
        } else {
          closeModal();
        }
      }, { passive: false });
      this.btnTouchMenu.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.helpModal.classList.contains('hidden')) {
          openModal();
        } else {
          closeModal();
        }
      });
    }

    // Keyboard shortcut [H] or [Escape] for help / [Space] or [Escape] for death screen
    window.addEventListener('keydown', (e) => {
      // If death screen is currently active
      if (this.deathScreen && !this.deathScreen.classList.contains('hidden')) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          if (this.btnDeathRetry) this.btnDeathRetry.click();
          return;
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          if (this.btnDeathMenu) this.btnDeathMenu.click();
          return;
        }
      }

      // If help modal is active or toggled
      if (e.code === 'KeyH') {
        if (this.helpModal.classList.contains('hidden')) {
          openModal();
        } else {
          closeModal();
        }
      } else if (e.code === 'Escape' && !this.helpModal.classList.contains('hidden')) {
        closeModal();
      }
    });

    // Death screen buttons
    if (this.btnDeathRetry) {
      this.btnDeathRetry.addEventListener('click', () => {
        if (this.soundManager?.playVcrButtonClick) this.soundManager.playVcrButtonClick();
        this.hideDeathScreen();
        if (this.onRestartCallback) {
          this.onRestartCallback();
        }
      });
    }

    if (this.btnDeathMenu) {
      this.btnDeathMenu.addEventListener('click', () => {
        if (this.soundManager?.playVcrButtonClick) this.soundManager.playVcrButtonClick();
        this.hideDeathScreen();
        if (this.onMainMenuCallback) {
          this.onMainMenuCallback();
        }
      });
    }
  }

  showHUD() {
    this.introScreen.classList.add('hidden');
    this.camcorderHud.classList.remove('hidden');
    if (this.deathScreen) this.deathScreen.classList.add('hidden');
    if (this.isTouchDevice && this.mobileTouchControls) {
      this.mobileTouchControls.classList.remove('hidden');
    }
  }

  /**
   * Start HUD in vintage playback mode for the cinematic intro
   */
  startCinematicMode() {
    this.introScreen.classList.add('hidden');
    this.camcorderHud.classList.remove('hidden');
    if (this.deathScreen) this.deathScreen.classList.add('hidden');

    if (this.recText) this.recText.textContent = 'PLAY ▶';
    if (this.recDot) this.recDot.style.display = 'none';
    if (this.tapeTimecode) this.tapeTimecode.textContent = '00:00:12';
    if (this.tapeDate) this.tapeDate.textContent = 'JUL 04 1996 - PM 11:42:08';
  }

  /**
   * Scramble timecode with glitching characters during stumble
   */
  glitchTimecode() {
    if (!this.tapeTimecode) return;
    const glitchChars = ['--:--:--', '-0:E4:9B', 'ERR:SYNC', '00:99:99', '00:##:##'];
    this.tapeTimecode.textContent = glitchChars[Math.floor(Math.random() * glitchChars.length)];
  }

  /**
   * Flash Tape Error during freefall
   */
  flashTapeError() {
    if (!this.tapeTimecode) return;
    this.tapeTimecode.textContent = Math.random() > 0.5 ? 'TAPE ERROR' : '--:--:--';
  }

  /**
   * Rapid white flash on carpet impact
   */
  flashWhiteImpact() {
    if (!this.whiteFlash) return;
    this.whiteFlash.classList.remove('fading');
    this.whiteFlash.classList.add('active');
    setTimeout(() => {
      this.whiteFlash.classList.remove('active');
      this.whiteFlash.classList.add('fading');
    }, 75);
  }

  /**
   * Set HUD state while stunned on carpet
   */
  setHUDLandPaused() {
    if (this.recText) this.recText.textContent = 'PAUSE ||';
    if (this.tapeTimecode) this.tapeTimecode.textContent = '00:00:15';
  }

  /**
   * Lock into active recording upon standing up in Level 0
   */
  lockHUDRecording() {
    if (this.recText) this.recText.textContent = 'REC';
    if (this.recDot) this.recDot.style.display = 'inline-block';
    this.resetTimecode();
    if (this.tapeDate) this.tapeDate.textContent = 'JUL 04 1996 - PM 11:42:23';
  }

  hideHUD() {
    this.camcorderHud.classList.add('hidden');
  }

  resetTimecode() {
    this.timecodeSeconds = 0;
    if (this.tapeTimecode) {
      this.tapeTimecode.textContent = '00:00:00';
    }
  }

  getFormattedTimecode() {
    const hours = Math.floor(this.timecodeSeconds / 3600);
    const mins = Math.floor((this.timecodeSeconds % 3600) / 60);
    const secs = Math.floor(this.timecodeSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  updateHUD(delta, isChasing, distanceToMonster) {
    // Timecode ticker
    this.timecodeSeconds += delta;
    if (this.tapeTimecode) {
      this.tapeTimecode.textContent = this.getFormattedTimecode();
    }

    // Battery slow drain
    if (this.batteryLevel) {
      this.batteryPercent = Math.max(15, 95 - (this.timecodeSeconds * 0.02));
      this.batteryLevel.style.width = `${this.batteryPercent}%`;
    }

    // Threat danger vignette
    if (this.dangerVignette) {
      if (isChasing || distanceToMonster < 8) {
        this.dangerVignette.classList.add('active');
      } else {
        this.dangerVignette.classList.remove('active');
      }
    }
  }

  showDeathScreen(survivalTime) {
    document.exitPointerLock();
    if (this.camcorderHud) this.camcorderHud.classList.add('hidden');
    if (this.dangerVignette) this.dangerVignette.classList.remove('active');
    if (this.isTouchDevice && this.mobileTouchControls) {
      this.mobileTouchControls.classList.add('hidden');
    }
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    if (this.helpModal) this.helpModal.classList.add('hidden');

    if (this.deathTimeSurvived) {
      this.deathTimeSurvived.textContent = survivalTime || this.getFormattedTimecode();
    }

    if (this.deathScreen) {
      this.deathScreen.classList.remove('hidden');
    }

    // Start Dead-Air atmospheric hum & tape hiss
    if (this.soundManager?.startDeadAirHum) {
      this.soundManager.startDeadAirHum();
    }
  }

  hideDeathScreen() {
    if (this.deathScreen) {
      this.deathScreen.classList.add('hidden');
    }
    // Stop Dead-Air atmospheric hum
    if (this.soundManager?.stopDeadAirHum) {
      this.soundManager.stopDeadAirHum();
    }
  }

  showIntro() {
    if (this.deathScreen) this.deathScreen.classList.add('hidden');
    if (this.camcorderHud) this.camcorderHud.classList.add('hidden');
    if (this.isTouchDevice && this.mobileTouchControls) {
      this.mobileTouchControls.classList.add('hidden');
    }
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    if (this.helpModal) this.helpModal.classList.add('hidden');
    if (this.introScreen) this.introScreen.classList.remove('hidden');
  }

  triggerGameOver(onRewindComplete) {
    this.rewindScreen.classList.remove('hidden');
    this.rewindBar.style.width = '0%';
    if (this.dangerVignette) this.dangerVignette.classList.remove('active');

    if (this.soundManager) {
      this.soundManager.playTapeRewind();
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      this.rewindBar.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.rewindScreen.classList.add('hidden');
          if (onRewindComplete) onRewindComplete();
        }, 400);
      }
    }, 70);
  }
}
