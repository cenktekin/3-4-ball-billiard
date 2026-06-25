const Mode4Ball = (() => {
  let currentPlayer = 1;
  let targetScore = 20;

  function setTargetScore(score) {
    targetScore = score;
  }

  function getTargetScore() {
    return targetScore;
  }

  function setupBalls() {
    const bounds = Table.getBounds();
    const cy = bounds.y + bounds.height / 2;
    const thirdW = bounds.width / 3;

    currentPlayer = 1;

    const red1X = Math.round(bounds.x + thirdW) - 50;
    const red2X = red1X + 72;

    const whiteX = Math.round(bounds.x + bounds.width - thirdW);
    const whiteY = bounds.y + 100;
    const yellowY = bounds.y + bounds.height - 100;

    const red1 = new Ball.Ball(red1X, cy, '#CC0000', 'red1');
    const red2 = new Ball.Ball(red2X, cy, '#CC0000', 'red2');
    const white = new Ball.Ball(whiteX, whiteY, '#FFFFFF', 'white');
    const yellow = new Ball.Ball(whiteX, yellowY, '#FFD700', 'yellow');

    return {
      cueBall: white,
      balls: [white, red1, red2, yellow]
    };
  }

  function evaluateShot(gameState) {
    const hit = gameState.ballsHitThisShot;
    const cueBallId = getCurrentCueId();
    const opponentBallId = cueBallId === 'white' ? 'yellow' : 'white';

    const red1Hit = hit.has('red1');
    const red2Hit = hit.has('red2');
    const opponentHit = hit.has(opponentBallId);

    let objectBallsHit = 0;
    if (red1Hit) objectBallsHit++;
    if (red2Hit) objectBallsHit++;
    if (opponentHit) objectBallsHit++;

    if (objectBallsHit <= 1) {
      switchTurn(gameState);
      return {
        scored: false, points: 0, cushionBonus: false,
        message: objectBallsHit === 0 ? 'MISS! Sira → Player ' + currentPlayer : 'TEK TOP — puan yok! Sira → Player ' + currentPlayer
      };
    }

    let points = 0;
    if (objectBallsHit === 3) {
      points = 20;
    } else if (objectBallsHit === 2) {
      if (red1Hit && red2Hit) points = 4;
      else points = 1;
    }

    const cushionFirst = gameState.firstHitType === 'cushion';
    if (cushionFirst) points *= 2;

    if (currentPlayer === 1) {
      gameState.p1Score += points;
    } else {
      gameState.p2Score += points;
    }
    gameState.score = Math.max(gameState.p1Score, gameState.p2Score);
    gameState.count++;

    let detail = '';
    if (objectBallsHit === 3) detail = 'UC TOP!';
    else if (red1Hit && red2Hit) detail = 'IKI KIRMIZI';
    else detail = 'KIRMIZI + RAKIP';

    if (cushionFirst) detail += ' + BANT x2!';

    return {
      scored: true, points: points, cushionBonus: cushionFirst,
      message: detail + '  +' + points + ' puan'
    };
  }

  function switchTurn(gameState) {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    const newCueId = getCurrentCueId();
    gameState.cueBall = gameState.balls.find(b => b.id === newCueId);
    gameState.selectedBallId = newCueId;
  }

  function getCurrentPlayer() {
    return currentPlayer;
  }

  function getCurrentCueId() {
    return currentPlayer === 1 ? 'white' : 'yellow';
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
    setupBalls, evaluateShot, switchTurn, getCurrentPlayer,
    getCurrentCueId, checkWin, setTargetScore, getTargetScore
  };
})();
