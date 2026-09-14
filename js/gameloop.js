const GameFlow = (() => {
  'use strict';

  let gameState = null;
  let menuPhase = 'modeselect';
  let pendingMode = null;
  let aiShotDelay = 0;
  let screenShake = 0;
  let impactFlash = 0;
  let lastShotSnapshot = null;
  let isReplaying = false;
  let replayTrajectory = null;
  let replayTrajectories = null;
  let simSpeed = 1;
  const SPEED_LEVELS = [0.25, 0.5, 1, 1.5, 2];
  let speedIndex = 2;
  let undoState = null;
  let isChallengeMode = false;
  let challengeResultTimer = 0;
  let messageText = '';
  let messageTimer = 0;
  let lastTime = 0;
  let timeAttackDuration = 120;
  let accumulator = 0;
  let shotAnimTime = 0;
  let lastChallengeResult = false;
  // Fixed physics timestep (in 60fps-frame units): 0.25 = 240 Hz substeps.
  // Max travel per substep = MAX_POWER * 0.25 = 7.5px < ball radius → no tunneling.
  const PHYSICS_STEP = 0.25;
  const MAX_ACCUMULATOR = 4;

  function init(gs) {
    gameState = gs;
  }

  function getMenuPhase() { return menuPhase; }
  function setMenuPhase(phase) { menuPhase = phase; }
  function getPendingMode() { return pendingMode; }
  function setPendingMode(mode) { pendingMode = mode; }
  function isChallengeModeActive() { return isChallengeMode; }
  function getSimSpeed() { return simSpeed; }
  function getScreenShake() { return screenShake; }
  function getImpactFlash() { return impactFlash; }
  function getMessageText() { return messageText; }
  function getMessageTimer() { return messageTimer; }
  function getIsReplaying() { return isReplaying; }
  function getReplayTrajectories() { return replayTrajectories; }
  function getChallengeResultTimer() { return challengeResultTimer; }
  function getShotAnimTime() { return shotAnimTime; }
  function getLastChallengeResult() { return lastChallengeResult; }

  function setTimeAttackDuration(seconds) {
    timeAttackDuration = seconds;
  }

  function showMessage(text, duration) {
    messageText = text;
    messageTimer = duration || 2000;
  }

  function startGame(mode) {
    gameState.reset();
    gameState.mode = mode;
    gameState.phase = 'aiming';
    gameState.isPractice = UI.isPracticeToggled();
    gameState.isTimeAttack = UI.isTimeAttackToggled();

    if (gameState.isTimeAttack) {
      gameState.timeAttackDuration = timeAttackDuration;
      gameState.timeAttackRemaining = timeAttackDuration;
      gameState.timeAttackScore = 0;
    }

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
        Input.setSelectingCueBall(false);
        gameState.phase = 'aiming';
      } else {
        Input.setSelectingCueBall(true);
        gameState.phase = 'selecting';
      }
    }

    for (const ball of gameState.balls) {
      ball.initialX = ball.x;
      ball.initialY = ball.y;
    }
  }

  function startChallenge() {
    gameState.reset();
    isChallengeMode = true;
    challengeResultTimer = 0;

    const challenge = Challenge.getCurrentChallenge();
    if (!challenge) {
      Challenge.selectChallenge(0);
    }

    const setup = Challenge.setupChallenge();
    if (!setup) return;

    gameState.balls = setup.balls;
    gameState.cueBall = setup.cueBall;
    gameState.selectedBallId = setup.cueBall.id;
    gameState.mode = Challenge.getCurrentChallenge().mode;
    gameState.phase = 'aiming';

    for (const ball of gameState.balls) {
      ball.initialX = ball.x;
      ball.initialY = ball.y;
    }

    menuPhase = 'modeselect';
    showMessage(challenge.name[I18n.getLanguage()] || challenge.name.en, 2000);
  }

  function returnToMenu() {
    gameState.phase = 'menu';
    menuPhase = 'modeselect';
    pendingMode = null;
    AI.setEnabled(false);
    isChallengeMode = false;
  }

  function fireShot() {
    saveUndoState();
    saveShotSnapshot();
    Audio.playShot(gameState.shotPower);
    triggerImpactFlash(gameState.shotPower);
    gameState.isCharging = false;
    gameState.startShot();
    Physics.applyShot(
      gameState.cueBall, gameState.aimAngle, gameState.shotPower,
      gameState.spinX, gameState.spinY
    );
    gameState.shotPower = 0;
    shotAnimTime = 0;
    gameState.phase = 'moving';
  }

  function saveUndoState() {
    undoState = {
      balls: gameState.balls.map(b => ({
        id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy,
        spinX: b.spinX, spinY: b.spinY, active: b.active,
        dirX: b.dirX, dirY: b.dirY, contacted: b.contacted
      })),
      p1Score: gameState.p1Score,
      p2Score: gameState.p2Score,
      score: gameState.score,
      count: gameState.count,
      selectedBallId: gameState.selectedBallId,
      currentPlayer: gameState.mode === '4ball' ? Mode4Ball.getCurrentPlayer() : Mode3Ball.getCurrentPlayer()
    };
  }

  function undoLastShot() {
    if (!undoState) {
      showMessage(I18n.t('noUndo'), 1000);
      return;
    }
    if (gameState.phase !== 'aiming') return;

    for (const savedBall of undoState.balls) {
      const ball = gameState.balls.find(b => b.id === savedBall.id);
      if (ball) {
        ball.x = savedBall.x;
        ball.y = savedBall.y;
        ball.vx = savedBall.vx;
        ball.vy = savedBall.vy;
        ball.spinX = savedBall.spinX;
        ball.spinY = savedBall.spinY;
        ball.active = savedBall.active;
        ball.dirX = savedBall.dirX !== undefined ? savedBall.dirX : 1;
        ball.dirY = savedBall.dirY !== undefined ? savedBall.dirY : 0;
        ball.contacted = !!savedBall.contacted;
      }
    }

    gameState.p1Score = undoState.p1Score;
    gameState.p2Score = undoState.p2Score;
    gameState.score = undoState.score;
    gameState.count = undoState.count;
    gameState.selectedBallId = undoState.selectedBallId;
    gameState.cueBall = gameState.balls.find(b => b.id === undoState.selectedBallId);

    if (gameState.mode === '4ball') {
      Mode4Ball.switchTurn(gameState);
    } else {
      Mode3Ball.switchTurn(gameState);
    }

    gameState.shotPower = 0;
    gameState.isCharging = false;
    gameState.spinX = 0;
    gameState.spinY = 0;
    gameState.ballsHitThisShot.clear();
    gameState.cushionHits = 0;

    undoState = null;
    showMessage(I18n.t('undoDone'), 1500);
    Audio.playTurnSwitch();
  }

  function saveShotSnapshot() {
    if (!gameState.cueBall) return;
    const simResult = Physics.simulateFullShot(
      gameState.cueBall,
      gameState.aimAngle,
      gameState.shotPower || 12,
      gameState.spinX || 0,
      gameState.spinY || 0,
      gameState.balls,
      Table.getBounds()
    );
    if (simResult && simResult.length > 0) {
      lastShotSnapshot = {
        angle: gameState.aimAngle,
        power: gameState.shotPower || 12,
        spinX: gameState.spinX || 0,
        spinY: gameState.spinY || 0,
        trajectories: simResult
      };
    }
  }

  function toggleReplay() {
    if (!lastShotSnapshot || gameState.phase !== 'aiming') return;
    isReplaying = !isReplaying;
    if (isReplaying) {
      replayTrajectory = lastShotSnapshot.trajectories[0];
      replayTrajectories = lastShotSnapshot.trajectories;
    } else {
      replayTrajectory = null;
      replayTrajectories = null;
    }
    showMessage(isReplaying ? I18n.t('replayToggleOn') : I18n.t('replayToggleOff'), 1200);
  }

  function triggerImpactFlash(power) {
    const intensity = Math.min(power / Physics.CONFIG.MAX_POWER, 1);
    impactFlash = intensity * 0.4;
    if (power > 20) screenShake = Math.min(intensity * 4, 3);
  }

  function triggerCollisionShake(velocity) {
    const intensity = Math.min((velocity || 1) / 15, 1);
    screenShake = Math.max(screenShake, intensity * 1.5);
  }

  function resetPracticeBalls() {
    for (const ball of gameState.balls) {
      if (ball.active && ball.initialX !== undefined) {
        ball.x = ball.initialX;
        ball.y = ball.initialY;
        ball.vx = 0;
        ball.vy = 0;
        ball.spinX = 0;
        ball.spinY = 0;
      }
    }
    gameState.shotPower = 0;
    gameState.isCharging = false;
    gameState.spinX = 0;
    gameState.spinY = 0;
    gameState.ballsHitThisShot.clear();
    gameState.cushionHits = 0;
    gameState.phase = 'aiming';
  }

  function adjustChargingPower(delta) {
    if (gameState.phase !== 'charging' || !gameState.isCharging) return false;
    gameState.shotPower = Math.max(0, Math.min(Physics.CONFIG.MAX_POWER, gameState.shotPower + delta));
    return true;
  }
  function cancelCharging() {
    if (gameState.phase !== 'charging' || !gameState.isCharging) return false;
    gameState.isCharging = false;
    gameState.shotPower = 0;
    gameState.phase = 'aiming';
    showMessage(I18n.t('shotCancelled'), 1000);
    return true;
  }
  function cycleSpeed() {
    speedIndex = (speedIndex + 1) % SPEED_LEVELS.length;
    simSpeed = SPEED_LEVELS[speedIndex];
    showMessage(I18n.t('simSpeed', { n: simSpeed }), 1000);
  }

  function decreaseSpeed() {
    speedIndex = Math.max(0, speedIndex - 1);
    simSpeed = SPEED_LEVELS[speedIndex];
    showMessage(I18n.t('simSpeed', { n: simSpeed }), 1000);
  }

  function increaseSpeed() {
    speedIndex = Math.min(SPEED_LEVELS.length - 1, speedIndex + 1);
    simSpeed = SPEED_LEVELS[speedIndex];
    showMessage(I18n.t('simSpeed', { n: simSpeed }), 1000);
  }

  function update(timestamp) {
    const rawDt = lastTime ? Math.min((timestamp - lastTime) / 16.67, 3) : 1;
    lastTime = timestamp;
    const dt = rawDt * simSpeed;

    if (gameState.phase === 'moving') {
      shotAnimTime += dt * 16.67;
      accumulator = Math.min(accumulator + dt, MAX_ACCUMULATOR);
      const bounds = Table.getBounds();
      while (accumulator >= PHYSICS_STEP) {
        const events = Physics.stepWorld(gameState.balls, bounds, PHYSICS_STEP);
        processPhysicsEvents(events);
        accumulator -= PHYSICS_STEP;
      }
      checkAllStopped();
    } else {
      accumulator = 0;
    }

    if (gameState.phase === 'charging' && gameState.isCharging) {
      // yavas sarj: 0.14 => full guc ~3.5sn (onceki 0.3 => ~1.6sn), rota daha kontrollu degisir
      gameState.shotPower = Math.min(
        gameState.shotPower + 0.14 * dt,
        Physics.CONFIG.MAX_POWER
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
          saveUndoState();
          saveShotSnapshot();
          Audio.playShot(gameState.shotPower);
          triggerImpactFlash(gameState.shotPower);
          gameState.startShot();
          Physics.applyShot(
            gameState.cueBall, gameState.aimAngle, gameState.shotPower,
            gameState.spinX, gameState.spinY
          );
          gameState.shotPower = 0;
          shotAnimTime = 0;
          gameState.phase = 'moving';
          aiShotDelay = 600;
        }
      }
    }

    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 16.67 * 0.008);
    if (impactFlash > 0) impactFlash = Math.max(0, impactFlash - dt * 16.67 * 0.006);

    if (gameState.isTimeAttack && gameState.phase !== 'menu' && gameState.phase !== 'gameover') {
      gameState.timeAttackRemaining -= dt * 16.67 / 1000;
      if (gameState.timeAttackRemaining <= 0) {
        gameState.timeAttackRemaining = 0;
        gameState.won = gameState.timeAttackScore > 0;
        gameState.phase = 'gameover';
        Audio.playWin();
        Stats.recordGame(gameState.mode, gameState.won, gameState.timeAttackScore, gameState.timeAttackScore, 0);
        showMessage(I18n.t('timeUp'), 3000);
      }
    }

    UI.updateChalk(dt * 16.67);
    if (UI.updateConfetti) UI.updateConfetti(dt);
    if (messageTimer > 0) messageTimer -= dt * 16.67;
    if (challengeResultTimer > 0) challengeResultTimer -= dt * 16.67;
  }

  function processPhysicsEvents(events) {
    const cueBallId = gameState.selectedBallId || (gameState.mode === '4ball' ? 'white' : 'cue');

    for (const hit of events.cushionHits) {
      Audio.playCushionHit();
      gameState.recordCushionHit();
      if (gameState.mode === '3cushion') {
        Audio.playCushionCount(gameState.cushionHits);
      }
      if (hit.id === cueBallId) {
        gameState.recordFirstHit('cushion');
      }
    }

    for (const hit of events.ballHits) {
      if (gameState.trySoundPair(hit.aId, hit.bId)) {
        Audio.playBallHit(hit.speed);
        triggerCollisionShake(hit.speed);
      }
      if (hit.aId === cueBallId) {
        gameState.recordBallHit(hit.bId);
        gameState.recordFirstHit('ball');
      } else if (hit.bId === cueBallId) {
        gameState.recordBallHit(hit.aId);
        gameState.recordFirstHit('ball');
      }
    }
  }

  function checkAllStopped() {
    const moving = gameState.balls.some(b => b.active && Physics.isMoving(b));
    if (!moving) {
      if (isChallengeMode) {
        const success = Challenge.validateChallenge(gameState);
        lastChallengeResult = success;
        
        gameState.shotPower = 0;
        gameState.isCharging = false;
        gameState.spinX = 0;
        gameState.spinY = 0;
        if (gameState.cueBall) {
          gameState.cueBall.spinX = 0;
          gameState.cueBall.spinY = 0;
        }
        
        if (success) {
          showMessage(I18n.t('challengeComplete'), 3000);
          Audio.playWin();
          challengeResultTimer = 3000;
          respawnChallenge(true);
        } else {
          showMessage(I18n.t('challengeFailed'), 2000);
          challengeResultTimer = 2000;
          respawnChallenge(false);
        }
        
        gameState.ballsHitThisShot.clear();
        gameState.cushionHits = 0;
        gameState.phase = 'aiming';
      } else if (gameState.isPractice) {
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
      } else {
        gameState.phase = 'scoring';
        evaluateCurrentShot();
      }
    }
  }

  function respawnChallenge(success) {
    const setup = success ? Challenge.setupChallengeVariant() : Challenge.repeatLastSetup();
    if (!setup) return;
    gameState.balls = setup.balls;
    gameState.cueBall = setup.cueBall;
    gameState.selectedBallId = setup.cueBall.id;
    for (const ball of gameState.balls) {
      ball.initialX = ball.x;
      ball.initialY = ball.y;
    }
  }

  function evaluateCurrentShot() {
    let result;
    if (gameState.mode === '4ball') {
      result = Mode4Ball.evaluateShot(gameState);

      Stats.recordShot(result.scored);
      if (result.scored) {
        Audio.playScore(result.points);
        if (gameState.isTimeAttack) {
          gameState.timeAttackScore += result.points;
        }
      } else {
        Audio.playMiss();
      }
      showMessage(result.message, 2000);

      if (!result.scored) {
        Audio.playTurnSwitch();
      }

      if (!gameState.isTimeAttack && Mode4Ball.checkWin(gameState)) {
        gameState.won = true;
        gameState.phase = 'gameover';
        Audio.playWin();
        Stats.recordGame('4ball', gameState.winner === 1, gameState.score, gameState.p1Score, gameState.p2Score);
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

    Stats.recordShot(result.scored);
    if (result.scored) {
      Audio.playScore(1);
      if (gameState.isTimeAttack) {
        gameState.timeAttackScore += 1;
      }
    } else {
      Audio.playMiss();
      Audio.playTurnSwitch();
    }
    showMessage(result.message, 2000);

    if (!gameState.isTimeAttack && Mode3Ball.checkWin(gameState)) {
      gameState.won = true;
      gameState.phase = 'gameover';
      Audio.playWin();
      Stats.recordGame(gameState.mode, gameState.winner === 1, gameState.score, gameState.p1Score, gameState.p2Score);
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

  return {
    init, getMenuPhase, setMenuPhase, getPendingMode, setPendingMode,
    isChallengeMode: isChallengeModeActive, getSimSpeed,
    getScreenShake, getImpactFlash, getMessageText, getMessageTimer,
    getIsReplaying, getReplayTrajectories, getChallengeResultTimer,
    getShotAnimTime, getLastChallengeResult,
    setTimeAttackDuration,
    showMessage, startGame, startChallenge, returnToMenu,
    fireShot, undoLastShot, toggleReplay,
    adjustChargingPower, cancelCharging,
    resetPracticeBalls, cycleSpeed, decreaseSpeed, increaseSpeed,
    update, triggerImpactFlash, triggerCollisionShake
  };
})();
