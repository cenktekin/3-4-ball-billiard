const Mode3Ball = (() => {
  let currentPlayer = 1;
  let targetScore = 20;
  let player1Ball = 'white';
  let player2Ball = 'yellow';

  function setTargetScore(score) { targetScore = score; }
  function getTargetScore() { return targetScore; }

  function setupBalls() {
    const bounds = Table.getBounds();
    const cy = bounds.y + bounds.height / 2;
    const thirdW = bounds.width / 3;

    const redX = Math.round(bounds.x + thirdW + 36);
    const whiteX = Math.round(bounds.x + bounds.width - thirdW);
    const whiteY = bounds.y + 100;
    const yellowY = bounds.y + bounds.height - 100;

    currentPlayer = 1;

    const white = new Ball.Ball(whiteX, whiteY, '#FFFFFF', 'white');
    const yellow = new Ball.Ball(whiteX, yellowY, '#FFD700', 'yellow');
    const red = new Ball.Ball(redX, cy, '#CC0000', 'red');

    return {
      cueBall: white,
      balls: [white, yellow, red],
      selectables: ['white', 'yellow']
    };
  }

  function selectCueBall(gameState, ballId) {
    if (currentPlayer === 1) {
      player1Ball = ballId;
      player2Ball = ballId === 'white' ? 'yellow' : 'white';
    } else {
      player2Ball = ballId;
      player1Ball = ballId === 'white' ? 'yellow' : 'white';
    }
    gameState.selectedBallId = ballId;
    gameState.cueBall = gameState.balls.find(b => b.id === ballId);
  }

  function evaluateShot(gameState, isThreeCushion) {
    const hit = gameState.ballsHitThisShot;
    const cueBallId = getCurrentCueId();
    const otherBallIds = gameState.balls
      .filter(b => b.id !== cueBallId)
      .map(b => b.id);

    const allHit = otherBallIds.every(id => hit.has(id));

    if (isThreeCushion) {
      if (allHit && gameState.cushionHits >= 3) {
        addScore(gameState);
        return { scored: true, keepTurn: true, message: 'SAYI! 3-band + both hit!' };
      }
      let msg = 'MISS!';
      if (!allHit) msg = 'Iki topa da degmedi!';
      else if (gameState.cushionHits < 3) msg = 'Yalnizca ' + gameState.cushionHits + '/3 bant!';
      switchTurn(gameState);
      return { scored: false, keepTurn: false, message: msg + ' Sira → Player ' + currentPlayer };
    } else {
      if (allHit) {
        addScore(gameState);
        return { scored: true, keepTurn: true, message: 'SAYI! Iki topa da degdi!' };
      }
      let msg = 'MISS!';
      if (!hit.has(otherBallIds[0]) && !hit.has(otherBallIds[1])) msg = 'Hic topa degmedi!';
      else msg = 'Yalnizca bir topa degdi!';
      switchTurn(gameState);
      return { scored: false, keepTurn: false, message: msg + ' Sira → Player ' + currentPlayer };
    }
  }

  function addScore(gameState) {
    if (currentPlayer === 1) gameState.p1Score++;
    else gameState.p2Score++;
    gameState.score = Math.max(gameState.p1Score, gameState.p2Score);
    gameState.count++;
  }

  function switchTurn(gameState) {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    const newCueId = getCurrentCueId();
    gameState.cueBall = gameState.balls.find(b => b.id === newCueId);
    gameState.selectedBallId = newCueId;
  }

  function getCurrentPlayer() { return currentPlayer; }
  function getCurrentCueId() {
    return currentPlayer === 1 ? player1Ball : player2Ball;
  }

  function checkWin(gameState) {
    if (gameState.p1Score >= targetScore) {
      gameState.winner = 1;
      return true;
    }
    if (gameState.p2Score >= targetScore) {
      gameState.winner = 2;
      return true;
    }
    return false;
  }

  return {
    setupBalls, selectCueBall, evaluateShot, switchTurn,
    getCurrentPlayer, getCurrentCueId, checkWin,
    setTargetScore, getTargetScore
  };
})();
