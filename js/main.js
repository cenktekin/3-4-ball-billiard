(() => {
  let canvas, ctx;
  let gameState;
  let lastTime = 0;
  let mouseX = 0, mouseY = 0;
  let messageText = '';
  let messageTimer = 0;
  let selectingCueBall = false;
  let spinDragging = false;
  let menuPhase = 'modeselect';
  let pendingMode = null;
  let aiShotDelay = 0;

  function init() {
    canvas = document.getElementById('gameCanvas');
    const size = Table.getCanvasSize();
    canvas.width = size.width;
    canvas.height = size.height;
    ctx = canvas.getContext('2d');

    gameState = new GameState.GameState();

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(gameLoop);
  }

  function gameLoop(timestamp) {
    const dt = lastTime ? (timestamp - lastTime) / 16.67 : 1;
    lastTime = timestamp;

    if (gameState.phase === 'moving') {
      updatePhysics(dt);
      checkAllStopped();
    }

    if (gameState.phase === 'charging' && gameState.isCharging) {
      gameState.shotPower = Math.min(
        gameState.shotPower + 0.3 * dt,
        Physics.MAX_POWER
      );
    }

    if (AI.isEnabled() && gameState.phase === 'aiming') {
      if (!AI.isThinking()) {
        if (aiShotDelay > 0) {
          aiShotDelay -= dt * 16.67;
        } else {
          AI.startThinking(gameState);
        }
      } else {
        const ready = AI.update(dt * 16.67);
        if (ready) {
          gameState.startShot();
          Physics.applyShot(gameState.cueBall, gameState.aimAngle, gameState.shotPower);
          gameState.shotPower = 0;
          gameState.phase = 'moving';
          aiShotDelay = 600;
        }
      }
    }

    UI.updateChalk(dt * 16.67);
    if (messageTimer > 0) messageTimer -= dt * 16.67;

    render();
    requestAnimationFrame(gameLoop);
  }

  function updatePhysics(dt) {
    const bounds = Table.getBounds();
    const balls = gameState.balls;
    const cueBallId = gameState.selectedBallId || (gameState.mode === '4ball' ? 'white' : 'cue');

    for (const ball of balls) {
      if (!ball.active) continue;
      Physics.applyFriction(ball);
      Physics.applySpinDecay(ball);
      Physics.moveBall(ball, dt);
      const cushionHit = Physics.checkCushionCollision(ball, bounds);
      if (cushionHit) {
        gameState.recordCushionHit();
        if (ball.id === cueBallId) {
          gameState.recordFirstHit('cushion');
        }
      }
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (!balls[i].active || !balls[j].active) continue;
        const collided = Physics.checkBallCollision(balls[i], balls[j]);
        if (collided) {
          if (balls[i].id === cueBallId) {
            gameState.recordBallHit(balls[j].id);
            gameState.recordFirstHit('ball');
          } else if (balls[j].id === cueBallId) {
            gameState.recordBallHit(balls[i].id);
            gameState.recordFirstHit('ball');
          }
        }
      }
    }
  }

  function checkAllStopped() {
    const moving = gameState.balls.some(b => b.active && Physics.isMoving(b));
    if (!moving) {
      gameState.phase = 'scoring';
      evaluateCurrentShot();
    }
  }

  function evaluateCurrentShot() {
    let result;
    if (gameState.mode === '4ball') {
      result = Mode4Ball.evaluateShot(gameState);

      showMessage(result.message, 2000);

      if (Mode4Ball.checkWin(gameState)) {
        gameState.won = true;
        gameState.phase = 'gameover';
        return;
      }

      gameState.shotPower = 0;
      gameState.isCharging = false;
      gameState.spinX = 0;
      gameState.spinY = 0;
      gameState.ballsHitThisShot.clear();
      gameState.cushionHits = 0;
      if (gameState.cueBall) {
        gameState.cueBall.spinX = 0;
        gameState.cueBall.spinY = 0;
      }
      gameState.phase = 'aiming';
      return;
    }

    if (gameState.mode === '3ball') {
      result = Mode3Ball.evaluateShot(gameState, false);
    } else if (gameState.mode === '3cushion') {
      result = Mode3Ball.evaluateShot(gameState, true);
    }

    showMessage(result.message, 2000);

    if (Mode3Ball.checkWin(gameState)) {
      gameState.won = true;
      gameState.phase = 'gameover';
      return;
    }

    gameState.shotPower = 0;
    gameState.isCharging = false;
    gameState.spinX = 0;
    gameState.spinY = 0;
    gameState.ballsHitThisShot.clear();
    gameState.cushionHits = 0;
    if (gameState.cueBall) {
      gameState.cueBall.spinX = 0;
      gameState.cueBall.spinY = 0;
    }
    gameState.phase = 'aiming';
  }

  function resetCueBallOnly() {
    gameState.shotPower = 0;
    gameState.isCharging = false;
    gameState.spinX = 0;
    gameState.spinY = 0;
    gameState.ballsHitThisShot.clear();
    gameState.cushionHits = 0;

    if (gameState.cueBall && gameState.cueBall.active) {
      gameState.cueBall.vx = 0;
      gameState.cueBall.vy = 0;
      gameState.cueBall.spinX = 0;
      gameState.cueBall.spinY = 0;
      if (gameState.cueBall.initialX !== undefined) {
        gameState.cueBall.x = gameState.cueBall.initialX;
        gameState.cueBall.y = gameState.cueBall.initialY;
      }
    }
  }

  function startGame(mode) {
    gameState.reset();
    gameState.mode = mode;
    gameState.phase = 'aiming';

    if (mode === '4ball') {
      const setup = Mode4Ball.setupBalls();
      gameState.balls = setup.balls;
      gameState.cueBall = setup.cueBall;
      gameState.selectedBallId = 'white';
    } else {
      const setup = Mode3Ball.setupBalls();
      gameState.balls = setup.balls;
      if (AI.isEnabled()) {
        Mode3Ball.selectCueBall(gameState, 'white');
        selectingCueBall = false;
        gameState.phase = 'aiming';
      } else {
        selectingCueBall = true;
        gameState.phase = 'selecting';
      }
    }

    for (const ball of gameState.balls) {
      ball.initialX = ball.x;
      ball.initialY = ball.y;
    }
  }

  function showMessage(text, duration) {
    messageText = text;
    messageTimer = duration || 2000;
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (spinDragging) {
      updateSpinFromMouse();
      return;
    }

    updateAim();
  }

  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (gameState.phase === 'menu') {
      if (menuPhase === 'modeselect') {
        const aiBtn = UI.getAIToggleButton();
        if (mouseX >= aiBtn.x && mouseX <= aiBtn.x + aiBtn.w &&
            mouseY >= aiBtn.y && mouseY <= aiBtn.y + aiBtn.h) {
          UI.toggleAI();
          return;
        }

        const buttons = UI.getMenuButtons();
        for (const btn of buttons) {
          if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
            pendingMode = btn.mode;
            menuPhase = 'targetselect';
            return;
          }
        }
      } else if (menuPhase === 'targetselect') {
        const score = UI.getTargetScoreClick(mouseX, mouseY);
        if (score !== null) {
          Mode4Ball.setTargetScore(score);
          Mode3Ball.setTargetScore(score);
          AI.setEnabled(UI.isAIToggled());
          startGame(pendingMode);
          menuPhase = 'modeselect';
          pendingMode = null;
        } else {
          menuPhase = 'modeselect';
          pendingMode = null;
        }
        return;
      }
      return;
    }

    if (gameState.phase === 'gameover') {
      gameState.phase = 'menu';
      menuPhase = 'modeselect';
      pendingMode = null;
      AI.setEnabled(false);
      return;
    }

    if (gameState.phase === 'selecting') {
      for (const ball of gameState.balls) {
        if (!ball.active) continue;
        const dx = mouseX - ball.x;
        const dy = mouseY - ball.y;
        if (dx * dx + dy * dy < 400) {
          if (ball.id === 'white' || ball.id === 'yellow') {
            Mode3Ball.selectCueBall(gameState, ball.id);
            selectingCueBall = false;
            gameState.phase = 'aiming';
            showMessage('Selected: ' + ball.id.toUpperCase(), 1500);
          }
          return;
        }
      }
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
      fireShot();
    }
  }

  function updateSpinFromMouse() {
    if (!gameState.cueBall || !gameState.cueBall.active) return;
    const cb = gameState.cueBall;
    const dx = mouseX - cb.x;
    const dy = mouseY - cb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = cb.radius * 2.5;

    if (dist < maxR) {
      const spinX = Math.max(-1, Math.min(1, dx / maxR));
      const spinY = Math.max(-1, Math.min(1, dy / maxR));
      gameState.spinX = spinX;
      gameState.spinY = spinY;
    } else {
      const spinX = Math.max(-1, Math.min(1, dx / maxR));
      const spinY = Math.max(-1, Math.min(1, dy / maxR));
      gameState.spinX = spinX;
      gameState.spinY = spinY;
    }
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseX = touch.clientX - rect.left;
      mouseY = touch.clientY - rect.top;

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
      const rect = canvas.getBoundingClientRect();
      mouseX = touch.clientX - rect.left;
      mouseY = touch.clientY - rect.top;

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
      }
    }
    if (e.code === 'KeyR' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      gameState.spinX = 0;
      gameState.spinY = 0;
      showMessage('Spin reset', 800);
    }
    if (e.code === 'KeyG' && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      UI.toggleTrajectoryMode();
      showMessage(UI.isTrajectoryMode() ? 'TAHMİN: ACIK — Top yollari gorunur' : 'TAHMİN: KAPALI', 1200);
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

  function fireShot() {
    gameState.isCharging = false;
    gameState.startShot();
    Physics.applyShot(
      gameState.cueBall, gameState.aimAngle, gameState.shotPower,
      gameState.spinX, gameState.spinY
    );
    gameState.shotPower = 0;
    gameState.phase = 'moving';
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState.phase === 'menu') {
      UI.drawMenu(ctx, menuPhase);
      return;
    }

    Table.drawTable(ctx);

    for (const ball of gameState.balls) {
      ball.draw(ctx);
    }

    if (gameState.phase === 'selecting') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select your cue ball (White or Yellow)',
        Table.TABLE_X + Table.TABLE_WIDTH / 2,
        Table.TABLE_Y - 10);

      for (const ball of gameState.balls) {
        if (ball.id === 'white' || ball.id === 'yellow') {
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    if (gameState.phase === 'aiming' || gameState.phase === 'charging') {
      const bounds = Table.getBounds();
      UI.drawAimLine(ctx, gameState.cueBall, gameState.aimAngle, gameState.balls, bounds, gameState.spinX, gameState.spinY);
      if (UI.isTrajectoryMode()) {
        const simPower = gameState.shotPower > 2 ? gameState.shotPower : 12;
        const fullTrajs = Physics.simulateFullShot(
          gameState.cueBall, gameState.aimAngle,
          simPower, gameState.spinX, gameState.spinY,
          gameState.balls, bounds, 400
        );
        UI.drawFullTrajectory(ctx, fullTrajs);
      }
      UI.drawPowerRing(ctx, gameState.cueBall, gameState.shotPower);
      UI.drawStrikeIndicator(ctx, gameState.cueBall, gameState.spinX, gameState.spinY);

      const spinLabel = UI.getSpinLabel(gameState.spinX, gameState.spinY);
      if (spinLabel && gameState.cueBall) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(spinLabel, gameState.cueBall.x, gameState.cueBall.y + gameState.cueBall.radius + 22);
      }
    }

    UI.drawChalk(ctx);
    UI.drawScoreboard(ctx, gameState);

    if (UI.isTrajectoryMode() && (gameState.phase === 'aiming' || gameState.phase === 'charging')) {
      ctx.fillStyle = 'rgba(0,200,100,0.15)';
      ctx.fillRect(0, 0, 900, 580);
      ctx.fillStyle = 'rgba(0,200,100,0.8)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('[G] TAHMİN MODU AKTİF', 890, 20);
    }

    if (gameState.cueBall) {
      const cueId = gameState.selectedBallId || 'cue';
      const target = gameState.balls.find(b =>
        b.active && b.id !== cueId && b.id !== 'white'
      );
      UI.drawPreviewPanel(ctx, gameState.cueBall, target, gameState.mode);
    }

    if (messageTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const canvasW = 900;
      ctx.fillRect(canvasW / 2 - 120, Table.TABLE_Y + Table.TABLE_HEIGHT / 2 - 20, 240, 40);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(messageText, canvasW / 2, Table.TABLE_Y + Table.TABLE_HEIGHT / 2 + 6);
    }

    if (gameState.phase === 'gameover') {
      UI.drawGameOver(ctx, gameState.won, gameState.score, gameState);
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
