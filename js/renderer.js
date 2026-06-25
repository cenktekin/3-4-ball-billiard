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
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = size.width + 'px';
    canvas.style.height = size.height + 'px';
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

    if (gameState.phase === 'selecting') {
      renderCueBallSelection(gameState);
    }

    if (gameState.phase === 'aiming' || gameState.phase === 'charging') {
      renderAiming(gameState);
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
      UI.drawPreviewPanel(ctx, gameState.cueBall, target, gameState.mode);
    }

    if (messageTimer > 0) {
      renderMessage(messageText);
    }

    if (gameState.phase === 'gameover') {
      UI.drawGameOver(ctx, gameState.won, gameState.score, gameState);
      UI.drawConfetti(ctx);
    }

    if (isChallengeMode && challengeResultTimer > 0) {
      UI.drawChallengeResult(ctx, Challenge.validateChallenge(gameState));
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

  function renderAiming(gameState) {
    const bounds = Table.getBounds();
    UI.drawAimLine(ctx, gameState.cueBall, gameState.aimAngle, gameState.balls, bounds, gameState.spinX, gameState.spinY);
    if (UI.isTrajectoryMode()) {
      const simPower = gameState.shotPower > 2 ? gameState.shotPower : 12;
      UI.drawTrajectoryPreview(ctx, gameState.cueBall, gameState.aimAngle,
        simPower, gameState.spinX, gameState.spinY,
        gameState.balls, bounds);
    }
    UI.drawPowerRing(ctx, gameState.cueBall, gameState.shotPower);
    UI.drawPowerBar(ctx, gameState.shotPower, gameState.isCharging);
    UI.drawCueStick(ctx, gameState.cueBall, gameState.aimAngle, gameState.shotPower, gameState.isCharging);
    UI.drawStrikeIndicator(ctx, gameState.cueBall, gameState.spinX, gameState.spinY);

    const spinLabel = UI.getSpinLabel(gameState.spinX, gameState.spinY);
    if (spinLabel && gameState.cueBall) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spinLabel, gameState.cueBall.x, gameState.cueBall.y + gameState.cueBall.radius + 22);
    }
  }

  function renderReplay(gameState, replayTrajectories) {
    const canvasH = 620;
    ctx.fillStyle = 'rgba(0,200,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('[SHIFT+R] REPLAY AKTIF', 890, canvasH - 40);
    UI.drawFullTrajectory(ctx, replayTrajectories, gameState.cueBall,
      gameState.aimAngle, gameState.spinX, gameState.spinY);
  }

  function renderControlsHint(gameState, isReplaying) {
    const canvasH = 620;
    if (isReplaying) {
      ctx.fillStyle = 'rgba(0,200,255,0.8)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('[SHIFT+R] REPLAY AKTIF', 890, canvasH - 40);
    } else if (gameState.phase === 'aiming' || gameState.phase === 'charging') {
      if (UI.isTrajectoryMode()) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('[G] ROTA ACIK', 890, canvasH - 55);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px sans-serif';
        ctx.fillText('Beyaz topun rotasi', 890, canvasH - 41);
        ctx.fillText('Yesil nokta = carpma', 890, canvasH - 27);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('[G] ROTA KAPALI', 890, canvasH - 40);
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
