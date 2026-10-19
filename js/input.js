const Input = (() => {
  'use strict';

  let canvas = null;
  let gameState = null;
  let mouseX = 0, mouseY = 0;
  let spinDragging = false;
  let spinOverride = false;
  let spinPressX = 0, spinPressY = 0;
  let selectingCueBall = false;

  function init(canvasEl, gs) {
    canvas = canvasEl;
    gameState = gs;

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', e => onMouseUp(e));
  canvas.addEventListener('mouseup', e => onMouseUp(e));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);
  }

  function getMousePos() { return { x: mouseX, y: mouseY }; }
  function isSpinDragging() { return spinDragging; }
  function isSelectingCueBall() { return selectingCueBall; }
  function setSelectingCueBall(v) { selectingCueBall = v; }

  function updateMousePos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const size = Table.getCanvasSize();
    mouseX = (clientX - rect.left) * (size.width / rect.width);
    mouseY = (clientY - rect.top) * (size.height / rect.height);
  }

  function onMouseMove(e) {
    updateMousePos(e.clientX, e.clientY);
    if (spinDragging) {
      if (!spinOverride) {
        const dx = mouseX - spinPressX;
        const dy = mouseY - spinPressY;
        if (dx * dx + dy * dy < 36) return;
        spinOverride = true;
      }
      updateSpinFromMouse();
      return;
    }
    // sarjdayken: mouse'u cue'ya yaklastirmak gucu dusurur (geri alma)
    if (gameState.phase === 'charging' && gameState.isCharging && gameState.cueBall) {
      const dx = mouseX - gameState.cueBall.x;
      const dy = mouseY - gameState.cueBall.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // 25px icindeyse hizli dusur, uzaksa yavas artis zaten gameloop'ta oluyor
      // burada sadece geri alma: dist < 60 ise gucu orantisal dusur
      if (dist < 70) {
        const targetPower = Math.max(0, (dist - 18) / 180 * Physics.CONFIG.MAX_POWER);
        if (targetPower < gameState.shotPower - 0.4) {
          gameState.shotPower = Math.max(targetPower, gameState.shotPower - 1.2);
        }
      }
    }
    updateAim();
  }

  function onMouseDown(e) {
    Audio.ensureInit();
    updateMousePos(e.clientX, e.clientY);
    handlePress(e.button);
  }

  function handlePress(button) {
    if (gameState.phase === 'menu') {
      handleMenuClick();
      return;
    }

    if (gameState.phase === 'gameover') {
      GameFlow.returnToMenu();
      return;
    }

    if (gameState.phase === 'selecting') {
      handleCueBallSelection();
      return;
    }

    if (button === 2) {
      if (!AI.isEnabled() && gameState.phase === 'aiming') {
        applyBestShot();
        spinDragging = true;
        spinOverride = false;
        spinPressX = mouseX;
        spinPressY = mouseY;
      }
      return;
    }

    if (gameState.phase === 'aiming' && !AI.isEnabled()) {
      gameState.isCharging = true;
      gameState.phase = 'charging';
      if (gameState.shotPower <= 0) updateAim();
    }
  }

  function onMouseUp(e) {
    if (spinDragging) {
      spinDragging = false;
      spinOverride = false;
      return;
    }
    // sag tik ile sarj iptal (contextmenu zaten prevent edildi)
    if (e && e.button === 2 && gameState.phase === 'charging' && gameState.isCharging) {
      GameFlow.cancelCharging();
      return;
    }
    if (gameState.phase === 'charging' && gameState.isCharging) {
      GameFlow.fireShot();
    }
  }

  function updateSpinFromMouse() {
    if (!gameState.cueBall || !gameState.cueBall.active) return;
    const cb = gameState.cueBall;
    const dx = mouseX - cb.x;
    const dy = mouseY - cb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = cb.radius * 3.2;

    // Deadzone: near-center clicks snap to (0,0) to prevent accidental spin.
    if (dist < 3) {
      gameState.spinX = 0;
      gameState.spinY = 0;
      return;
    }

    let spinX = Math.max(-1, Math.min(1, dx / maxR));
    let spinY = Math.max(-1, Math.min(1, dy / maxR));

    // Snap to the 9 zones: 0, ±0.7, ±1.0 per axis.
    const SNAP_THRESHOLD = 0.12;
    const snapTargets = [0, 0.7, 1.0];
    spinX = snapAxis(spinX, snapTargets, SNAP_THRESHOLD);
    spinY = snapAxis(spinY, snapTargets, SNAP_THRESHOLD);

    gameState.spinX = spinX;
    gameState.spinY = spinY;
  }

  function snapAxis(v, targets, threshold) {
    for (const t of targets) {
      if (Math.abs(Math.abs(v) - t) < threshold) {
        return v < 0 ? -t : t;
      }
    }
    return v;
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateMousePos(touch.clientX, touch.clientY);
      Audio.ensureInit();

      if (e.touches.length === 2 && !AI.isEnabled() &&
          (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
        spinDragging = true;
        spinOverride = true;
        updateSpinFromMouse();
        return;
      }

      handlePress(0);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateMousePos(touch.clientX, touch.clientY);

      if (spinDragging) {
        updateSpinFromMouse();
        return;
      }

      updateAim();
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (spinDragging) {
      spinDragging = false;
      return;
    }
    onMouseUp();
  }

  function onKeyDown(e) {
    if (e.code === 'Space' && gameState.phase !== 'menu') {
      e.preventDefault();
      if (gameState.cueBall && gameState.cueBall.active) {
        UI.triggerChalk(gameState.cueBall.x, gameState.cueBall.y);
        Audio.playChalk();
      }
    }
    if ((e.code === 'KeyR' || e.code === 'KeyC' || e.code === 'KeyH' || e.code === 'KeyG' || e.code === 'KeyZ' || e.code === 'KeyS' || e.code === 'Minus' || e.code === 'Equal') && gameState.phase !== 'menu') {
      // Firefox "Search for text when you start typing" engeli — oyun tuşları browser'a gitmesin
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof e.stopImmediatePropagation === 'function') {
      // sadece oyun içindeyken agresif engelle
      if (['KeyC','KeyH','KeyG','KeyR','KeyZ','KeyS'].includes(e.code) && gameState.phase !== 'menu') {
        try { e.stopImmediatePropagation(); } catch (err) { console.warn('stopImmediatePropagation failed', err); }
      }
    }
    if (e.code === 'KeyR' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      if (e.shiftKey) {
        GameFlow.toggleReplay();
      } else if (gameState.isPractice || GameFlow.isChallengeMode()) {
        GameFlow.resetPracticeBalls();
        GameFlow.showMessage(GameFlow.isChallengeMode() ? I18n.t('challengeReset') : I18n.t('ballsReset'), 1000);
      } else {
        gameState.spinX = 0;
        gameState.spinY = 0;
        GameFlow.showMessage(I18n.t('spinReset'), 800);
      }
    }
    if (e.code === 'KeyG' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      UI.toggleTrajectoryMode();
      GameFlow.showMessage(UI.isTrajectoryMode() ? I18n.t('trajectoryOn') : I18n.t('trajectoryOff'), 1200);
    }
    if (e.code === 'Escape' && gameState.phase === 'charging' && gameState.isCharging) {
      e.preventDefault();
      e.stopPropagation();
      GameFlow.cancelCharging();
      return;
    }
    if ((e.code === 'ArrowDown' || e.code === 'ArrowLeft') && gameState.phase === 'charging' && gameState.isCharging) {
      e.preventDefault();
      e.stopPropagation();
      GameFlow.adjustChargingPower(-1.1);
      return;
    }
    if ((e.code === 'ArrowUp' || e.code === 'ArrowRight') && gameState.phase === 'charging' && gameState.isCharging) {
      e.preventDefault();
      e.stopPropagation();
      GameFlow.adjustChargingPower(1.1);
      return;
    }
    if (e.code === 'KeyC' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      UI.toggleTrainingMode();
      GameFlow.showMessage(UI.isTrainingMode() ? I18n.t('trainingOn') : I18n.t('trainingOff'), 1200);
    }
    if (e.code === 'KeyH' && UI.isTrainingMode() &&
        (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      const suggested = AI.getSuggestedSpinForAngle(
        gameState.cueBall, gameState.aimAngle, gameState.balls, gameState.mode
      );
      if (suggested) {
        gameState.spinX = suggested.spinX;
        gameState.spinY = suggested.spinY;
        GameFlow.showMessage(I18n.t('suggestionApplied'), 1200);
      }
    }
    if (e.code === 'KeyZ' && gameState.phase === 'aiming' && !AI.isEnabled()) {
      GameFlow.undoLastShot();
    }
    if (e.code === 'KeyS' && gameState.phase !== 'menu') {
      GameFlow.cycleSpeed();
    }
    if (e.code === 'Minus' && gameState.phase !== 'menu') {
      GameFlow.decreaseSpeed();
    }
    if (e.code === 'Equal' && gameState.phase !== 'menu') {
      GameFlow.increaseSpeed();
    }
  }


  function onWheel(e) {
    if (gameState.phase !== 'charging' || !gameState.isCharging) return;
    e.preventDefault();
    // wheel up = guc azalt, wheel down = arttir (dogal); deltaY pozitif = asagi scroll
    // firefox vs chrome deltaMode farkini normalize et
    const step = Math.sign(e.deltaY) * 0.9;
    GameFlow.adjustChargingPower(step);
  }

  function applyBestShot() {
    const shot = AI.getBestShotHint(gameState);
    if (!shot) return;
    gameState.aimAngle = shot.angle;
    gameState.spinX = shot.spinX || 0;
    gameState.spinY = shot.spinY || 0;
    gameState.shotPower = shot.power;
    GameFlow.showMessage(I18n.t('bestShotApplied'), 1200);
  }

  function updateAim() {
    if (AI.isEnabled()) return;
    if (gameState.phase !== 'aiming' && gameState.phase !== 'charging') return;
    if (!gameState.cueBall || !gameState.cueBall.active) return;
    gameState.aimAngle = Physics.calculateShotDirection(
      gameState.cueBall, mouseX, mouseY
    );
  }

  function handleMenuClick() {
    const menuPhase = GameFlow.getMenuPhase();

    if (menuPhase === 'modeselect') {
      const aiBtn = UI.getAIToggleButton();
      if (isClickInButton(aiBtn)) {
        UI.toggleAI();
        return;
      }

      if (UI.isAIToggled()) {
        const diffKey = UI.getDiffClick(mouseX, mouseY);
        if (diffKey) {
          AI.setDifficulty(diffKey);
          return;
        }
      }

      const practiceBtn = UI.getPracticeButton();
      if (isClickInButton(practiceBtn)) {
        UI.togglePractice();
        return;
      }

      const timeAttackBtn = UI.getTimeAttackButton();
      if (isClickInButton(timeAttackBtn)) {
        UI.toggleTimeAttack();
        return;
      }

      const challengeClick = UI.getChallengeClick(mouseX, mouseY);
      if (challengeClick === 'open') {
        GameFlow.setMenuPhase('challenge');
        return;
      }

      const statsBtn = UI.getStatsButton();
      if (isClickInButton(statsBtn)) {
        GameFlow.setMenuPhase('stats');
        return;
      }

      const themeBtn = UI.getThemeButton();
      if (isClickInButton(themeBtn)) {
        const themes = Table.getThemes();
        const current = Table.getTheme();
        const idx = themes.findIndex(t => t.key === current);
        const next = themes[(idx + 1) % themes.length].key;
        Table.setTheme(next);
        return;
      }

      const soundBtn = UI.getSoundButton();
      if (isClickInButton(soundBtn)) {
        Audio.toggle();
        return;
      }

      const langBtn = UI.getLanguageButton();
      if (isClickInButton(langBtn)) {
        I18n.toggleLanguage();
        return;
      }

      const buttons = UI.getMenuButtons();
      for (const btn of buttons) {
        if (isClickInButton(btn)) {
          GameFlow.setPendingMode(btn.mode);
          if (UI.isTimeAttackToggled()) {
            GameFlow.setMenuPhase('timeselect');
          } else {
            GameFlow.setMenuPhase('targetselect');
          }
          return;
        }
      }
    } else if (menuPhase === 'targetselect') {
      const score = UI.getTargetScoreClick(mouseX, mouseY);
      if (score !== null) {
        Mode4Ball.setTargetScore(score);
        Mode3Ball.setTargetScore(score);
        AI.setEnabled(UI.isAIToggled());
        GameFlow.startGame(GameFlow.getPendingMode());
        GameFlow.setMenuPhase('modeselect');
        GameFlow.setPendingMode(null);
      } else {
        GameFlow.setMenuPhase('modeselect');
        GameFlow.setPendingMode(null);
      }
    } else if (menuPhase === 'timeselect') {
      const time = UI.getTimeSelectClick(mouseX, mouseY);
      if (time !== null) {
        GameFlow.setTimeAttackDuration(time);
        AI.setEnabled(UI.isAIToggled());
        GameFlow.startGame(GameFlow.getPendingMode());
        GameFlow.setMenuPhase('modeselect');
        GameFlow.setPendingMode(null);
      } else {
        GameFlow.setMenuPhase('modeselect');
        GameFlow.setPendingMode(null);
      }
    } else if (menuPhase === 'stats') {
      if (UI.getStatsButtonClick(mouseX, mouseY)) {
        GameFlow.setMenuPhase('modeselect');
      }
    } else if (menuPhase === 'challenge') {
      const navClick = UI.getChallengeNavClick(mouseX, mouseY);
      if (navClick === 'prev') {
        Challenge.prevChallenge();
        return;
      }
      if (navClick === 'next') {
        Challenge.nextChallenge();
        return;
      }
      if (navClick === 'play') {
        GameFlow.startChallenge();
        return;
      }
      if (UI.getStatsButtonClick(mouseX, mouseY)) {
        GameFlow.setMenuPhase('modeselect');
      }
    }
  }

  function handleCueBallSelection() {
    for (const ball of gameState.balls) {
      if (!ball.active) continue;
      const dx = mouseX - ball.x;
      const dy = mouseY - ball.y;
      if (dx * dx + dy * dy < 400) {
        if (ball.id === 'white' || ball.id === 'yellow') {
          Mode3Ball.selectCueBall(gameState, ball.id);
          selectingCueBall = false;
          gameState.phase = 'aiming';
          GameFlow.showMessage(I18n.t('selected', { b: ball.id.toUpperCase() }), 1500);
        }
        return;
      }
    }
  }

  function isClickInButton(btn) {
    return mouseX >= btn.x && mouseX <= btn.x + btn.w &&
           mouseY >= btn.y && mouseY <= btn.y + btn.h;
  }

  return {
    init, getMousePos, isSpinDragging,
    isSelectingCueBall, setSelectingCueBall
  };
})();
