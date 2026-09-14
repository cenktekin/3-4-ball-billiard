const Renderer = (() => {
  'use strict';

  let canvas = null;
  let ctx = null;
  let dpr = 1;

  function init(canvasEl) {
    canvas = canvasEl;
    resize();
    window.addEventListener('resize', handleResize);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const size = Table.getCanvasSize();
    // Backing store stays at logical size * dpr; the CSS layer (max-width:100%)
    // scales the element to the viewport while preserving the 900x620 aspect
    // ratio. Input mapping (Input.updateMousePos) is already rect-relative, so
    // logical coordinates remain stable under any CSS scaling.
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function handleResize() {
    const newDpr = window.devicePixelRatio || 1;
    if (newDpr !== dpr) {
      resize();
    }
  }

  function getCtx() { return ctx; }

  function render(gameState, screenShake, impactFlash, messageText, messageTimer,
    isReplaying, replayTrajectories, simSpeed, isChallengeMode, challengeResultTimer) {

    ctx.save();
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (impactFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${impactFlash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (gameState.phase === 'menu') {
      renderMenu(gameState);
      ctx.restore();
      return;
    }

    Table.drawTable(ctx);

    for (const ball of gameState.balls) {
      ball.draw(ctx);
    }

    if (gameState.phase === 'moving' && GameFlow.getShotAnimTime() < 120 && gameState.cueBall) {
      UI.drawCueStickFollowthrough(ctx, gameState.cueBall, gameState.aimAngle, GameFlow.getShotAnimTime());
    }

    if (gameState.phase === 'selecting') {
      renderCueBallSelection(gameState);
    }

    let aimGuidance = null;
    if ((gameState.phase === 'aiming' || gameState.phase === 'charging') &&
        gameState.cueBall && gameState.cueBall.active) {
      aimGuidance = UI.getShotGuidance(
        gameState.cueBall, gameState.aimAngle,
        gameState.shotPower > 2 ? gameState.shotPower : 12,
        gameState.spinX, gameState.spinY, gameState.balls, Table.getBounds()
      );
    }

    if (gameState.phase === 'aiming' || gameState.phase === 'charging') {
      renderAiming(gameState, aimGuidance);
    }

    if (isReplaying && replayTrajectories) {
      renderReplay(gameState, replayTrajectories);
    }

    UI.drawChalk(ctx);
    UI.drawScoreboard(ctx, gameState);

    if (gameState.isTimeAttack && gameState.phase !== 'menu' && gameState.phase !== 'gameover') {
      UI.drawTimeAttackTimer(ctx, gameState.timeAttackRemaining, gameState.timeAttackDuration);
      UI.drawTimeAttackScore(ctx, gameState.timeAttackScore);
    }

    if (isChallengeMode && gameState.phase !== 'menu' && gameState.phase !== 'gameover') {
      const challenge = Challenge.getCurrentChallenge();
      if (challenge) {
        ctx.fillStyle = '#9C27B0';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 ' + (challenge.name[I18n.getLanguage()] || challenge.name.en), 450, 25);
      }
    }

    if (simSpeed !== 1) {
      ctx.fillStyle = simSpeed < 1 ? 'rgba(0,200,255,0.8)' : 'rgba(255,200,0,0.8)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ ' + simSpeed + 'x', 15, 20);
    }

    renderControlsHint(gameState, isReplaying);

    if (gameState.cueBall) {
      const cueId = gameState.selectedBallId || 'cue';
      const target = gameState.balls.find(b =>
        b.active && b.id !== cueId && b.id !== 'white'
      );
      UI.drawPreviewPanel(ctx, gameState.cueBall, target, gameState.mode, aimGuidance);
    }

    if (messageTimer > 0) {
      renderMessage(messageText);
    }

    if (gameState.phase === 'gameover') {
      UI.drawGameOver(ctx, gameState.won, gameState.score, gameState);
      UI.drawConfetti(ctx);
    }

    if (isChallengeMode && challengeResultTimer > 0) {
      UI.drawChallengeResult(ctx, GameFlow.getLastChallengeResult());
    }

    ctx.restore();
  }

  function renderMenu(gameState) {
    const menuPhase = GameFlow.getMenuPhase();
    if (menuPhase === 'stats') {
      UI.drawStatsMenu(ctx);
    } else if (menuPhase === 'challenge') {
      UI.drawChallengeMenu(ctx);
    } else {
      UI.drawMenu(ctx, menuPhase);
    }
  }

  function renderCueBallSelection(gameState) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(I18n.t('selectCueBall'),
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

  function renderAiming(gameState, guidance) {
    const bounds = Table.getBounds();
    UI.drawAimLine(ctx, gameState.cueBall, gameState.aimAngle, gameState.balls, bounds, gameState.spinX, gameState.spinY, guidance);
    if (UI.isTrajectoryMode()) {
      const simPower = gameState.shotPower > 2 ? gameState.shotPower : 12;
      UI.drawTrajectoryPreview(ctx, gameState.cueBall, gameState.aimAngle,
        simPower, gameState.spinX, gameState.spinY,
        gameState.balls, bounds, guidance);
    }
    UI.drawRestMarkers(ctx, guidance);
    UI.drawPowerRing(ctx, gameState.cueBall, gameState.shotPower);
    UI.drawPowerBar(ctx, gameState.shotPower, gameState.isCharging);
    UI.drawCueStick(ctx, gameState.cueBall, gameState.aimAngle, gameState.shotPower, gameState.isCharging);
    UI.drawStrikeIndicator(ctx, gameState.cueBall, gameState.spinX, gameState.spinY, gameState);

    const spinLabel = UI.getSpinLabel(gameState.spinX, gameState.spinY);
    if (spinLabel && gameState.cueBall) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spinLabel, gameState.cueBall.x, gameState.cueBall.y + gameState.cueBall.radius + 22);
    }

    const mag = Math.max(Math.abs(gameState.spinX), Math.abs(gameState.spinY));
    if (mag > 0.01 && gameState.cueBall) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(I18n.t('spinMag', { pct: Math.round(mag * 100) }), gameState.cueBall.x, gameState.cueBall.y + gameState.cueBall.radius + 34);
    }
  }

  function renderReplay(gameState, replayTrajectories) {
    const canvasH = 620;
    ctx.fillStyle = 'rgba(0,200,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(I18n.t('replayOn'), 890, canvasH - 40);
    UI.drawFullTrajectory(ctx, replayTrajectories, gameState.cueBall,
      gameState.aimAngle, gameState.spinX, gameState.spinY);
  }

  function renderControlsHint(gameState, isReplaying) {
    const canvasH = 620;
    if (isReplaying) {
      ctx.fillStyle = 'rgba(0,200,255,0.8)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(I18n.t('replayOn'), 890, canvasH - 40);
    } else if (gameState.phase === 'aiming' || gameState.phase === 'charging') {
      if (UI.isTrajectoryMode()) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(I18n.t('trajectoryOn'), 890, canvasH - 55);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px sans-serif';
        ctx.fillText(I18n.t('cueTrajectory'), 890, canvasH - 41);
        ctx.fillText(I18n.t('hitPoint'), 890, canvasH - 27);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(I18n.t('trajectoryOff'), 890, canvasH - 40);
      }
    }
  }

  function renderMessage(messageText) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const canvasW = 900;
    ctx.fillRect(canvasW / 2 - 120, Table.TABLE_Y + Table.TABLE_HEIGHT / 2 - 20, 240, 40);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(messageText, canvasW / 2, Table.TABLE_Y + Table.TABLE_HEIGHT / 2 + 6);
  }

  return { init, render, getCtx };
})();
