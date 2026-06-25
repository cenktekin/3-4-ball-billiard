const Physics = (() => {
  const FRICTION = 0.994;
  const BALL_RADIUS = 12;
  const RESTITUTION = 0.97;
  const WALL_RESTITUTION = 0.90;
  const MIN_VELOCITY = 0.03;
  const MAX_POWER = 30;
  const SPIN_DECAY = 0.97;
  const SPIN_COLLISION_EFFECT = 0.7;
  const SPIN_CUSHION_EFFECT = 0.35;

  function applyFriction(ball) {
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    if (Math.abs(ball.vx) + Math.abs(ball.vy) < MIN_VELOCITY) {
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  function checkBallCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;

      const dvx = a.vx - b.vx;
      const dvy = a.vy - b.vy;
      const dvn = dvx * nx + dvy * ny;

      if (dvn <= 0) return false;

      const impulse = dvn * (1 + RESTITUTION) / 2;

      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;

      if (a.spinX !== undefined && (a.spinX !== 0 || a.spinY !== 0)) {
        const tx = -ny;
        const ty = nx;
        const along = a.spinX * tx + a.spinY * ty;
        a.vx += tx * along * SPIN_COLLISION_EFFECT;
        a.vy += ty * along * SPIN_COLLISION_EFFECT;

        const shotSpeed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        const shotAngle = Math.atan2(a.vy, a.vx);
        const spinForward = -a.spinY;
        const forwardMod = spinForward * SPIN_COLLISION_EFFECT * shotSpeed * 0.6;
        a.vx = Math.cos(shotAngle) * (shotSpeed + forwardMod);
        a.vy = Math.sin(shotAngle) * (shotSpeed + forwardMod);
      }

      if (b.spinX !== undefined) {
        b.spinX = a.spinX * 0.4;
        b.spinY = a.spinY * 0.4;
      }

      const overlap = minDist - dist;
      const separation = overlap / 2;
      a.x -= separation * nx;
      a.y -= separation * ny;
      b.x += separation * nx;
      b.y += separation * ny;

      return true;
    }
    return false;
  }

  function checkCushionCollision(ball, table) {
    let hit = false;
    const left = table.x + ball.radius;
    const right = table.x + table.width - ball.radius;
    const top = table.y + ball.radius;
    const bottom = table.y + table.height - ball.radius;

    if (ball.x < left) {
      ball.x = left;
      ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION;
      if (ball.spinY !== undefined) {
        ball.vy += ball.spinY * SPIN_CUSHION_EFFECT;
      }
      hit = true;
    } else if (ball.x > right) {
      ball.x = right;
      ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION;
      if (ball.spinY !== undefined) {
        ball.vy += ball.spinY * SPIN_CUSHION_EFFECT;
      }
      hit = true;
    }

    if (ball.y < top) {
      ball.y = top;
      ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION;
      if (ball.spinX !== undefined) {
        ball.vx += ball.spinX * SPIN_CUSHION_EFFECT;
      }
      hit = true;
    } else if (ball.y > bottom) {
      ball.y = bottom;
      ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION;
      if (ball.spinX !== undefined) {
        ball.vx += ball.spinX * SPIN_CUSHION_EFFECT;
      }
      hit = true;
    }

    if (hit) {
      ball.vx *= 0.995;
      ball.vy *= 0.995;
    }

    return hit;
  }

  function moveBall(ball, dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }

  function isMoving(ball) {
    return Math.abs(ball.vx) + Math.abs(ball.vy) > MIN_VELOCITY;
  }

  function calculateShotDirection(cueBall, targetX, targetY) {
    return Math.atan2(targetY - cueBall.y, targetX - cueBall.x);
  }

  function applyShot(ball, angle, power, spinX, spinY) {
    const p = Math.min(power, MAX_POWER);
    ball.vx = Math.cos(angle) * p;
    ball.vy = Math.sin(angle) * p;
    ball.spinX = spinX || 0;
    ball.spinY = spinY || 0;
  }

  function applySpinDecay(ball) {
    if (ball.spinX === undefined) return;
    ball.spinX *= SPIN_DECAY;
    ball.spinY *= SPIN_DECAY;
    if (Math.abs(ball.spinX) < 0.001) ball.spinX = 0;
    if (Math.abs(ball.spinY) < 0.001) ball.spinY = 0;
  }

  function simulateTrajectory(startX, startY, angle, power, spinX, spinY, table, balls, maxSteps) {
    const cuePoints = [{ x: startX, y: startY, type: 'start' }];
    const hitPoints = [];
    let hitBallRef = null;
    let postCollision = false;

    const simBalls = balls.filter(b => b.active).map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      vx: 0,
      vy: 0,
      spinX: 0,
      spinY: 0,
      radius: b.radius,
      active: true
    }));

    let simCue = simBalls.find(b => Math.abs(b.x - startX) < 1 && Math.abs(b.y - startY) < 1);
    if (!simCue) {
      simCue = { id: 'cue_temp', x: startX, y: startY, vx: 0, vy: 0, spinX: 0, spinY: 0, radius: BALL_RADIUS, active: true };
      simBalls.push(simCue);
    }

    applyShot(simCue, angle, power, spinX, spinY);

    const DT = 0.5;
    const left = table.x + BALL_RADIUS;
    const right = table.x + table.width - BALL_RADIUS;
    const top = table.y + BALL_RADIUS;
    const bottom = table.y + table.height - BALL_RADIUS;

    let hitBallSim = null;

    for (let step = 0; step < maxSteps; step++) {
      let moved = false;

      for (const ball of simBalls) {
        if (!isMoving(ball)) continue;
        moved = true;

        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        if (ball.spinX !== undefined) {
          ball.spinX *= SPIN_DECAY;
          ball.spinY *= SPIN_DECAY;
        }

        ball.x += ball.vx * DT;
        ball.y += ball.vy * DT;

        if (ball.x < left) { ball.x = left; ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION; }
        else if (ball.x > right) { ball.x = right; ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION; }
        if (ball.y < top) { ball.y = top; ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION; }
        else if (ball.y > bottom) { ball.y = bottom; ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION; }

        if (ball === simCue && step % 2 === 0) {
          cuePoints.push({ x: ball.x, y: ball.y, type: 'path' });
        }
      }

      for (let i = 0; i < simBalls.length; i++) {
        for (let j = i + 1; j < simBalls.length; j++) {
          const a = simBalls[i];
          const b = simBalls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) {
              const impulse = dvn * (1 + RESTITUTION) / 2;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;

              const overlap = minDist - dist;
              a.x -= (overlap / 2) * nx;
              a.y -= (overlap / 2) * ny;
              b.x += (overlap / 2) * nx;
              b.y += (overlap / 2) * ny;

              if ((a === simCue || b === simCue) && !hitBallRef) {
                hitBallSim = a === simCue ? b : a;
                hitBallRef = hitBallSim;
                cuePoints.push({ x: simCue.x, y: simCue.y, type: 'ball_hit', ballId: hitBallSim.id });
                postCollision = true;
              }
            }
          }
        }
      }

      if (!moved) break;
    }

    if (hitBallSim) {
      for (let step = 0; step < 150; step++) {
        if (!isMoving(hitBallSim)) break;

        hitBallSim.vx *= FRICTION;
        hitBallSim.vy *= FRICTION;
        hitBallSim.x += hitBallSim.vx * DT;
        hitBallSim.y += hitBallSim.vy * DT;

        if (hitBallSim.x < left) { hitBallSim.x = left; hitBallSim.vx = Math.abs(hitBallSim.vx) * WALL_RESTITUTION; }
        else if (hitBallSim.x > right) { hitBallSim.x = right; hitBallSim.vx = -Math.abs(hitBallSim.vx) * WALL_RESTITUTION; }
        if (hitBallSim.y < top) { hitBallSim.y = top; hitBallSim.vy = Math.abs(hitBallSim.vy) * WALL_RESTITUTION; }
        else if (hitBallSim.y > bottom) { hitBallSim.y = bottom; hitBallSim.vy = -Math.abs(hitBallSim.vy) * WALL_RESTITUTION; }

        if (step % 2 === 0) {
          hitPoints.push({ x: hitBallSim.x, y: hitBallSim.y, type: 'target' });
        }
      }
    }

    return { cuePoints, hitPoints, hitBallId: hitBallRef ? hitBallRef.id : null };
  }

  function simulateFullShot(cueBall, angle, power, spinX, spinY, balls, table, maxSteps) {
    const trajectories = [];

    const simCue = { x: cueBall.x, y: cueBall.y, vx: 0, vy: 0, spinX: spinX || 0, spinY: spinY || 0, radius: cueBall.radius };
    simCue.vx = Math.cos(angle) * power;
    simCue.vy = Math.sin(angle) * power;

    const simBalls = balls.filter(b => b.active && b !== cueBall).map(b => ({
      x: b.x, y: b.y, vx: 0, vy: 0, spinX: 0, spinY: 0,
      radius: b.radius, id: b.id, active: true
    }));

    const allSimBalls = [simCue, ...simBalls];

    const left = table.x + simCue.radius;
    const right = table.x + table.width - simCue.radius;
    const top = table.y + simCue.radius;
    const bottom = table.y + table.height - simCue.radius;

    const DT = 0.5;

    for (const ball of allSimBalls) {
      ball.traj = [{ x: ball.x, y: ball.y }];
    }

    let step = 0;
    let postCollision = false;

    while (step < maxSteps) {
      step++;

      for (const ball of allSimBalls) {
        if (!ball.active) continue;
        if (Math.abs(ball.vx) + Math.abs(ball.vy) < MIN_VELOCITY) continue;

        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        if (ball.spinX !== undefined) {
          ball.spinX *= SPIN_DECAY;
          ball.spinY *= SPIN_DECAY;
        }

        ball.x += ball.vx * DT;
        ball.y += ball.vy * DT;

        if (ball.x < left) { ball.x = left; ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION; }
        else if (ball.x > right) { ball.x = right; ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION; }
        if (ball.y < top) { ball.y = top; ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION; }
        else if (ball.y > bottom) { ball.y = bottom; ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION; }

        if (step % 2 === 0) {
          ball.traj.push({ x: ball.x, y: ball.y });
        }
      }

      for (let i = 0; i < allSimBalls.length; i++) {
        for (let j = i + 1; j < allSimBalls.length; j++) {
          const a = allSimBalls[i];
          const b = allSimBalls[j];
          if (!a.active || !b.active) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist && dist > 0) {
            if (!postCollision) postCollision = true;
            const nx = dx / dist;
            const ny = dy / dist;

            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;
            if (dvn > 0) {
              const impulse = dvn * (1 + RESTITUTION) / 2;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;

              const overlap = minDist - dist;
              const sep = overlap / 2;
              a.x -= sep * nx; a.y -= sep * ny;
              b.x += sep * nx; b.y += sep * ny;
            }
          }
        }
      }

      const allStopped = allSimBalls.every(b => !b.active || Math.abs(b.vx) + Math.abs(b.vy) < MIN_VELOCITY);
      if (allStopped) break;
    }

    for (const ball of allSimBalls) {
      if (ball.traj && ball.traj.length > 1) {
        trajectories.push({ id: ball.id, points: ball.traj, isCue: ball === simCue });
      }
    }

    return trajectories;
  }

  return {
    FRICTION,
    BALL_RADIUS,
    RESTITUTION,
    WALL_RESTITUTION,
    MIN_VELOCITY,
    MAX_POWER,
    SPIN_DECAY,
    SPIN_COLLISION_EFFECT,
    SPIN_CUSHION_EFFECT,
    applyFriction,
    checkBallCollision,
    checkCushionCollision,
    moveBall,
    isMoving,
    calculateShotDirection,
    applyShot,
    applySpinDecay,
    simulateTrajectory,
    simulateFullShot
  };
})();
