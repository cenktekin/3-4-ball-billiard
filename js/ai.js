const AI = (() => {
  let enabled = false;
  let thinking = false;
  let thinkTimer = 0;
  const THINK_DELAY = 800;

  function setEnabled(val) { enabled = val; }
  function isEnabled() { return enabled; }

  function findBestShot(gameState) {
    const cue = gameState.cueBall;
    if (!cue || !cue.active) return null;

    const cueBallId = gameState.selectedBallId || 'white';
    const targets = gameState.balls.filter(b => b.active && b.id !== cueBallId);
    if (targets.length === 0) return null;

    const mode = gameState.mode;
    let bestShot = null;
    let bestScore = -1;

    const step = 0.02;
    for (let angle = 0; angle < Math.PI * 2; angle += step) {
      const hit = findFirstBallHit(cue, angle, targets);
      if (!hit) continue;

      const deflections = getDeflections(cue, angle, hit, targets);
      const shotScore = rateShot(hit, deflections, mode);

      if (shotScore > bestScore) {
        bestScore = shotScore;
        bestShot = {
          angle: angle,
          power: calcPower(cue, hit.ball, hit.point),
          firstBall: hit.ball,
          deflections: deflections,
          score: shotScore
        };
      }
    }

    if (!bestShot) {
      const closest = findClosestBall(cue, targets);
      if (closest) {
        const angle = Math.atan2(closest.y - cue.y, closest.x - cue.x);
        bestShot = {
          angle: angle,
          power: 10,
          firstBall: closest,
          deflections: [],
          score: 0
        };
      }
    }

    return bestShot;
  }

  function findFirstBallHit(cue, angle, targets) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minT = Infinity;
    let hitBall = null;

    for (const ball of targets) {
      const ocx = ball.x - cue.x;
      const ocy = ball.y - cue.y;
      const rSum = cue.radius + ball.radius;
      const a = dx * dx + dy * dy;
      const b = -2 * (ocx * dx + ocy * dy);
      const c = ocx * ocx + ocy * ocy - rSum * rSum;
      const disc = b * b - 4 * a * c;

      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        if (t > 0.01 && t < minT) {
          minT = t;
          hitBall = ball;
        }
      }
    }

    if (!hitBall) return null;

    const hitX = cue.x + dx * minT;
    const hitY = cue.y + dy * minT;
    const nx = (hitX - hitBall.x) / (cue.radius + hitBall.radius);
    const ny = (hitY - hitBall.y) / (cue.radius + hitBall.radius);

    return {
      ball: hitBall,
      point: { x: hitX, y: hitY },
      normal: { x: nx, y: ny },
      dist: minT
    };
  }

  function getDeflections(cue, angle, hit, targets) {
    const nx = hit.normal.x;
    const ny = hit.normal.y;
    const tx = -ny;
    const ty = nx;

    const deflections = [];

    for (const ball of targets) {
      if (ball === hit.ball) continue;

      const toBall = Math.atan2(ball.y - hit.ball.y, ball.x - hit.ball.x);
      let angleDiff = toBall - Math.atan2(ty, tx);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < Math.PI * 0.4) {
        deflections.push({
          ball: ball,
          angleDiff: angleDiff,
          dist: Math.sqrt((ball.x - hit.ball.x) ** 2 + (ball.y - hit.ball.y) ** 2)
        });
      }

      const oppTx = -tx;
      const oppTy = -ty;
      let angleDiff2 = toBall - Math.atan2(oppTy, oppTx);
      while (angleDiff2 > Math.PI) angleDiff2 -= Math.PI * 2;
      while (angleDiff2 < -Math.PI) angleDiff2 += Math.PI * 2;

      if (Math.abs(angleDiff2) < Math.PI * 0.4) {
        deflections.push({
          ball: ball,
          angleDiff: angleDiff2,
          dist: Math.sqrt((ball.x - hit.ball.x) ** 2 + (ball.y - hit.ball.y) ** 2)
        });
      }
    }

    return deflections;
  }

  function rateShot(hit, deflections, mode) {
    const reachableBalls = new Set();
    reachableBalls.add(hit.ball.id);

    for (const d of deflections) {
      if (Math.abs(d.angleDiff) < Math.PI * 0.25) {
        reachableBalls.add(d.ball.id);
      }
    }

    const count = reachableBalls.size;
    const cushionBonus = canDoCushionFirst(hit) ? 15 : 0;

    if (mode === '3ball') {
      if (count >= 2) return 100 + cushionBonus;
      return 5;
    }

    if (mode === '3cushion') {
      if (count >= 2 && cushionBonus > 0) return 100;
      if (count >= 2) return 40;
      return 5;
    }

    if (count >= 3) return 100 + cushionBonus;
    if (count === 2) {
      const ids = [...reachableBalls];
      const hasRed1 = ids.includes('red1');
      const hasRed2 = ids.includes('red2');
      if (hasRed1 && hasRed2) return 50 + cushionBonus;
      return 20 + cushionBonus;
    }
    return 5;
  }

  function canDoCushionFirst(hit) {
    const bounds = Table.getBounds();
    const margin = 30;
    const hx = hit.ball.x;
    const hy = hit.ball.y;
    return (
      hx < bounds.x + margin ||
      hx > bounds.x + bounds.width - margin ||
      hy < bounds.y + margin ||
      hy > bounds.y + bounds.height - margin
    );
  }

  function calcPower(cue, target, hitPoint) {
    const dist = Math.sqrt((hitPoint.x - cue.x) ** 2 + (hitPoint.y - cue.y) ** 2);
    const base = dist * 0.06;
    return Math.min(Math.max(base, 6), Physics.MAX_POWER * 0.8);
  }

  function findClosestBall(cue, targets) {
    let closest = null;
    let minDist = Infinity;
    for (const ball of targets) {
      const d = Math.sqrt((ball.x - cue.x) ** 2 + (ball.y - cue.y) ** 2);
      if (d < minDist) {
        minDist = d;
        closest = ball;
      }
    }
    return closest;
  }

  function startThinking(gameState) {
    if (!enabled || thinking) return;
    thinking = true;
    thinkTimer = THINK_DELAY;

    const shot = findBestShot(gameState);
    if (shot) {
      gameState.aimAngle = shot.angle;
      gameState.shotPower = shot.power;
      gameState.spinX = 0;
      gameState.spinY = 0;
    }
  }

  function update(dt) {
    if (!thinking) return false;
    thinkTimer -= dt;
    if (thinkTimer <= 0) {
      thinking = false;
      return true;
    }
    return false;
  }

  function isThinking() { return thinking; }

  return {
    setEnabled, isEnabled, findBestShot, startThinking, update, isThinking
  };
})();
