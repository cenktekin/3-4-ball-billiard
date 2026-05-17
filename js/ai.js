const AI = (() => {
  let enabled = false;
  let thinking = false;
  let thinkTimer = 0;
  let difficulty = 'medium';
  let aiCushionDelay = 0;

  const DIFFICULTY = {
    easy:   { thinkDelay: 1200, noise: 0.15, powerNoise: 0.2, useSpin: false, cushionBonus: 0 },
    medium: { thinkDelay: 800,  noise: 0.06, powerNoise: 0.1, useSpin: true,  cushionBonus: 0.5 },
    hard:   { thinkDelay: 500,  noise: 0.02, powerNoise: 0.04, useSpin: true,  cushionBonus: 1 }
  };

  function setEnabled(val) { enabled = val; }
  function isEnabled() { return enabled; }

  function setDifficulty(d) {
    if (DIFFICULTY[d]) difficulty = d;
  }
  function getDifficulty() { return difficulty; }
  function getDifficultyLabel() {
    const labels = { easy: 'KOLAY', medium: 'ORTA', hard: 'ZOR' };
    return labels[difficulty] || 'ORTA';
  }

  function findBestShot(gameState) {
    const cue = gameState.cueBall;
    if (!cue || !cue.active) return null;

    const cueBallId = gameState.selectedBallId || 'white';
    const targets = gameState.balls.filter(b => b.active && b.id !== cueBallId);
    if (targets.length === 0) return null;

    const mode = gameState.mode;
    const diff = DIFFICULTY[difficulty];
    let bestShot = null;
    let bestScore = -Infinity;

    const step = 0.02;
    for (let angle = 0; angle < Math.PI * 2; angle += step) {
      const hit = findFirstBallHit(cue, angle, targets);
      if (!hit) continue;

      const deflections = getDeflections(cue, angle, hit, targets);
      const baseScore = rateShot(hit, deflections, mode, diff);

      let cushionFirst = mode === '3cushion' && canDoCushionFirst(hit) ? 10 : 0;

      if (mode === '3cushion' && !cushionFirst) {
        const cfShot = findCushionFirstShot(cue, targets);
        if (cfShot && cfShot.score > bestScore) {
          bestScore = cfShot.score;
          bestShot = cfShot;
        }
      }

      const distPenalty = Math.min(hit.dist / 800, 1) * 5;
      const totalScore = baseScore + cushionFirst - distPenalty;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        const spin = diff.useSpin ? calcSpin(cue, hit, targets, mode) : { spinX: 0, spinY: 0 };
        bestShot = {
          angle: angle,
          power: calcPower(cue, hit.ball, hit.point, diff),
          firstBall: hit.ball,
          deflections: deflections,
          score: totalScore,
          spinX: spin.spinX,
          spinY: spin.spinY
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
          score: 0,
          spinX: 0, spinY: 0
        };
      }
    }

    return bestShot;
  }

  function calcSpin(cue, hit, targets, mode) {
    const nx = hit.normal.x;
    const ny = hit.normal.y;
    const tx = -ny;
    const ty = nx;

    const cueAfterX = cue.x + nx * 30;
    const cueAfterY = cue.y + ny * 30;

    let spinX = 0, spinY = 0;

    const otherBalls = targets.filter(b => b !== hit.ball);
    if (otherBalls.length === 0) return { spinX: 0, spinY: 0 };

    let closestDist = Infinity;
    let closestBall = null;
    for (const b of otherBalls) {
      const d = Math.sqrt((b.x - cueAfterX) ** 2 + (b.y - cueAfterY) ** 2);
      if (d < closestDist) { closestDist = d; closestBall = b; }
    }

    if (closestBall && closestDist < 200) {
      const angleToTarget = Math.atan2(closestBall.y - cueAfterY, closestBall.x - cueAfterX);
      const angleAfter = Math.atan2(ny, nx);
      let diff = angleToTarget - angleAfter;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) < Math.PI / 2) {
        spinY = -0.6;
        spinX = Math.max(-0.4, Math.min(0.4, diff * 0.5));
      } else {
        spinY = 0.6;
        spinX = Math.max(-0.4, Math.min(0.4, diff * 0.5));
      }
    } else if (closestBall && closestDist > 300) {
      spinY = 0.4;
    }

    if (mode === '4ball') {
      if (Math.abs(nx) > Math.abs(ny)) {
        spinX = nx * 0.5;
      } else {
        spinY = -ny * 0.3;
      }
    }

    return {
      spinX: Math.max(-1, Math.min(1, spinX)),
      spinY: Math.max(-1, Math.min(1, spinY))
    };
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

  function rateShot(hit, deflections, mode, diff) {
    const reachableBalls = new Set();
    reachableBalls.add(hit.ball.id);

    for (const d of deflections) {
      if (Math.abs(d.angleDiff) < Math.PI * 0.25) {
        reachableBalls.add(d.ball.id);
      }
    }

    const count = reachableBalls.size;
    const cushionBonus = canDoCushionFirst(hit) ? 15 * diff.cushionBonus : 0;

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
    const margin = 40;
    const hx = hit.ball.x;
    const hy = hit.ball.y;
    return (
      hx < bounds.x + margin ||
      hx > bounds.x + bounds.width - margin ||
      hy < bounds.y + margin ||
      hy > bounds.y + bounds.height - margin
    );
  }

  // 3-cushion: find shot that can reach a cushion first, then target ball, then another cushion
  function findCushionFirstShot(cue, targets) {
    const bounds = Table.getBounds();
    let best = null;
    let bestScore = -Infinity;
    const step = 0.015;

    for (let angle = 0; angle < Math.PI * 2; angle += step) {
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let cushionHit = null;
      let minCushT = Infinity;

      if (dx > 0) {
        const t = (bounds.x + bounds.width - cue.x) / dx;
        if (t > 0.01 && t < minCushT) {
          minCushT = t;
          cushionHit = { x: bounds.x + bounds.width, y: cue.y + dy * t, nx: -1, ny: 0, t };
        }
      }
      if (dx < 0) {
        const t = (bounds.x - cue.x) / dx;
        if (t > 0.01 && t < minCushT) {
          minCushT = t;
          cushionHit = { x: bounds.x, y: cue.y + dy * t, nx: 1, ny: 0, t };
        }
      }
      if (dy > 0) {
        const t = (bounds.y + bounds.height - cue.y) / dy;
        if (t > 0.01 && t < minCushT) {
          minCushT = t;
          cushionHit = { x: cue.x + dx * t, y: bounds.y + bounds.height, nx: 0, ny: -1, t };
        }
      }
      if (dy < 0) {
        const t = (bounds.y - cue.y) / dy;
        if (t > 0.01 && t < minCushT) {
          minCushT = t;
          cushionHit = { x: cue.x + dx * t, y: bounds.y, nx: 0, ny: 1, t };
        }
      }

      if (!cushionHit || minCushT > 300) continue;

      const reflectAngle = (cushionHit.nx !== 0) ? Math.PI - angle : -angle;

      const rdx = Math.cos(reflectAngle);
      const rdy = Math.sin(reflectAngle);
      let hitBall = null;
      let minBallT = Infinity;

      for (const ball of targets) {
        const ocx = ball.x - cushionHit.x;
        const ocy = ball.y - cushionHit.y;
        const rSum = 24;
        const a = rdx * rdx + rdy * rdy;
        const b = -2 * (ocx * rdx + ocy * rdy);
        const c = ocx * ocx + ocy * ocy - rSum * rSum;
        const disc = b * b - 4 * a * c;

        if (disc >= 0) {
          const t = (-b - Math.sqrt(disc)) / (2 * a);
          if (t > 0.01 && t < minBallT) {
            minBallT = t;
            hitBall = ball;
          }
        }
      }

      if (!hitBall || minBallT > 200) continue;

      const hitPoint = { x: cushionHit.x + rdx * minBallT, y: cushionHit.y + rdy * minBallT };
      const totalDist = minCushT + minBallT;
      let score = 100 - totalDist * 0.05;

      const reachableBalls = targets.filter(b => {
        if (b === hitBall) return true;
        return Math.sqrt((b.x - hitPoint.x) ** 2 + (b.y - hitPoint.y) ** 2) < 150;
      });
      score += reachableBalls.length * 15;

      const midY = (bounds.y + bounds.height / 2);
      const midX = (bounds.x + bounds.width / 2);
      if (cushionHit.nx !== 0) {
        if (Math.abs(cushionHit.y - midY) < bounds.height * 0.35) score += 10;
      } else {
        if (Math.abs(cushionHit.x - midX) < bounds.width * 0.35) score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        const spin = calcSpin(cue, { ball: hitBall, point: hitPoint, normal: { x: rdx, y: rdy } }, targets, '3cushion');
        best = {
          angle: angle,
          power: Math.min(25, 8 + minBallT * 0.06),
          firstBall: hitBall,
          spinX: spin.spinX,
          spinY: spin.spinY,
          cushionFirst: true,
          cushionHit: cushionHit
        };
      }
    }

    return best;
  }

  function calcPower(cue, target, hitPoint, diff) {
    const dist = Math.sqrt((hitPoint.x - cue.x) ** 2 + (hitPoint.y - cue.y) ** 2);
    const base = dist * 0.07;
    const noise = 1 + (Math.random() - 0.5) * 2 * diff.powerNoise;
    return Math.min(Math.max(Math.round(base * noise), 4), Physics.MAX_POWER * 0.85);
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
    const diff = DIFFICULTY[difficulty];
    thinking = true;
    thinkTimer = diff.thinkDelay + Math.random() * 200;

    const shot = findBestShot(gameState);
    if (shot) {
      const diff2 = DIFFICULTY[difficulty];
      const noise = (Math.random() - 0.5) * 2 * diff2.noise;
      gameState.aimAngle = shot.angle + noise;
      gameState.shotPower = shot.power;
      gameState.spinX = shot.spinX || 0;
      gameState.spinY = shot.spinY || 0;

      if (difficulty === 'medium') {
        gameState.spinX += (Math.random() - 0.5) * 0.2;
        gameState.spinY += (Math.random() - 0.5) * 0.2;
      }
      if (difficulty === 'easy') {
        gameState.spinX = 0;
        gameState.spinY = 0;
      }
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
    setEnabled, isEnabled, setDifficulty, getDifficulty, getDifficultyLabel,
    findBestShot, startThinking, update, isThinking
  };
})();
