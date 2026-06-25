const Input = (() => {
  'use strict';

  let canvas = null;
  let gameState = null;
  let mouseX = 0, mouseY = 0;
  let spinDragging = false;
  let selectingCueBall = false;

  function init(canvasEl, gs) {
    canvas = canvasEl;
    gameState = gs;

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
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
      updateSpinFromMouse();
      return;
    }
    updateAim();
  }

  function onMouseDown(e) {
    Audio.ensureInit();
    updateMousePos(e.clientX, e.clientY);

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

    if (e.button === 2) {
      e.preventDefault();
      if (!AI.isEnabled() && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
        spinDragging = true;
        updateSpinFromMouse();
      }
      return;
    }

    if (gameState.phase === 'aiming' && !AI.isEnabled()) {
      gameState.isCharging = true;
      gameState.shotPower = 0;
      gameState.phase = 'charging';
      updateAim();
    }
  }

  function onMouseUp(e) {
    if (spinDragging) {
      spinDragging = false;
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
    const maxR = cb.radius * 2.5;

    const spinX = Math.max(-1, Math.min(1, dx / maxR));
    const spinY = Math.max(-1, Math.min(1, dy / maxR));
    gameState.spinX = spinX;
    gameState.spinY = spinY;
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateMousePos(touch.clientX, touch.clientY);

      if (e.touches.length === 2 && !AI.isEnabled() &&
          (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
        spinDragging = true;
        updateSpinFromMouse();
        return;
      }

      onMouseDown(e);
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
    onMouseUp(e);
  }

  function onKeyDown(e) {
    if (e.code === 'Space' && gameState.phase !== 'menu') {
      e.preventDefault();
      if (gameState.cueBall && gameState.cueBall.active) {
        UI.triggerChalk(gameState.cueBall.x, gameState.cueBall.y);
        Audio.playChalk();
      }
    }
    if (e.code === 'KeyR' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      if (e.shiftKey) {
        GameFlow.toggleReplay();
      } else if (gameState.isPractice || GameFlow.isChallengeMode()) {
        GameFlow.resetPracticeBalls();
        GameFlow.showMessage(GameFlow.isChallengeMode() ? I18n.t('challengeReset') : 'Toplar sifirlandi', 1000);
      } else {
        gameState.spinX = 0;
        gameState.spinY = 0;
        GameFlow.showMessage('Spin reset', 800);
      }
    }
    if (e.code === 'KeyG' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      UI.toggleTrajectoryMode();
      GameFlow.showMessage(UI.isTrajectoryMode() ? '[G] ROTA ACIK' : '[G] ROTA KAPALI', 1200);
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
          GameFlow.showMessage('Selected: ' + ball.id.toUpperCase(), 1500);
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
