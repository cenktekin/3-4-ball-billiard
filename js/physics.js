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
    let x = startX, y = startY;
    let vx = Math.cos(angle) * power;
    let vy = Math.sin(angle) * power;
    let sx = spinX || 0;
    let sy = spinY || 0;
    let hitBallRef = null;
    let postCollision = false;
    let hx = 0, hy = 0, hvx = 0, hvy = 0;
    const r = BALL_RADIUS;
    const left = table.x + r;
    const right = table.x + table.width - r;
    const top = table.y + r;
    const bottom = table.y + table.height - r;
    const DT = 1.5;
    const MIN_V = MIN_VELOCITY;
    const FRIC = FRICTION;
    const SPIN_DEC = SPIN_DECAY;
    const CUSHION_REST = WALL_RESTITUTION;
    const SPIN_CUSH = SPIN_CUSHION_EFFECT;

    for (let step = 0; step < maxSteps; step++) {
      let ballHit = null;
      let minT = Infinity;
      if (!postCollision) {
        for (const ball of balls) {
          if (!ball.active) continue;
          const ocx = ball.x - x;
          const ocy = ball.y - y;
          const rSum = r + ball.radius;
          const a = vx * vx + vy * vy;
          if (a < 0.001) break;
          const b = -2 * (ocx * vx + ocy * vy);
          const c = ocx * ocx + ocy * ocy - rSum * rSum;
          const disc = b * b - 4 * a * c;
          if (disc >= 0) {
            const t = (-b - Math.sqrt(disc)) / (2 * a);
            if (t > 0.01 && t < minT) {
              minT = t;
              ballHit = ball;
            }
          }
        }
      }

      if (ballHit && minT < Infinity && !postCollision) {
        const tx = x + vx * minT;
        const ty = y + vy * minT;
        cuePoints.push({ x: tx, y: ty, type: 'ball_hit', ballId: ballHit.id });
        hitBallRef = ballHit;

        const nx = (tx - ballHit.x) / (r + ballHit.radius);
        const ny = (ty - ballHit.y) / (r + ballHit.radius);

        const dvn = vx * nx + vy * ny;
        const restitution = 0.97;
        const impulse = dvn * (1 + restitution) / 2;
        vx -= impulse * nx;
        vy -= impulse * ny;

        hvx = impulse * nx;
        hvy = impulse * ny;
        hx = ballHit.x + nx * 2;
        hy = ballHit.y + ny * 2;

        if (sx !== 0 || sy !== 0) {
          const tx2 = -ny; const ty2 = nx;
          const along = sx * tx2 + sy * ty2;
          vx += tx2 * along * 0.7;
          vy += ty2 * along * 0.7;
          hvx += nx * (sx * nx + sy * ny) * 0.3;
          hvy += ny * (sx * nx + sy * ny) * 0.3;
        }

        postCollision = true;
        hitPoints.push({ x: hx, y: hy, type: 'start' });
        continue;
      }

      x += vx * DT;
      y += vy * DT;
      vx *= FRIC;
      vy *= FRIC;
      sx *= SPIN_DEC;
      sy *= SPIN_DEC;
      if (sx !== 0) vx += sx * SPIN_CUSH * 0.05;
      if (sy !== 0) vy += sy * SPIN_CUSH * 0.05;

      let cushHit = false;
      if (x < left) { x = left; vx = Math.abs(vx) * CUSHION_REST; cushHit = true; }
      else if (x > right) { x = right; vx = -Math.abs(vx) * CUSHION_REST; cushHit = true; }
      if (y < top) { y = top; vy = Math.abs(vy) * CUSHION_REST; cushHit = true; }
      else if (y > bottom) { y = bottom; vy = -Math.abs(vy) * CUSHION_REST; cushHit = true; }
      if (cushHit) {
        cuePoints.push({ x, y, type: 'cushion' });
      }

      if (postCollision) {
        hx += hvx * DT;
        hy += hvy * DT;
        hvx *= FRIC;
        hvy *= FRIC;
        if (hx < left) { hx = left; hvx = Math.abs(hvx) * CUSHION_REST; }
        else if (hx > right) { hx = right; hvx = -Math.abs(hvx) * CUSHION_REST; }
        if (hy < top) { hy = top; hvy = Math.abs(hvy) * CUSHION_REST; }
        else if (hy > bottom) { hy = bottom; hvy = -Math.abs(hvy) * CUSHION_REST; }
        hitPoints.push({ x: hx, y: hy, type: 'path' });
      }

      if (Math.abs(vx) + Math.abs(vy) < MIN_V && (!postCollision || Math.abs(hvx) + Math.abs(hvy) < MIN_V)) {
        if (Math.abs(vx) + Math.abs(vy) < MIN_V) {
          cuePoints.push({ x, y, type: 'end' });
        }
        if (postCollision && Math.abs(hvx) + Math.abs(hvy) < MIN_V) {
          hitPoints.push({ x: hx, y: hy, type: 'end' });
        }
        break;
      }
    }

    if (cuePoints[cuePoints.length - 1].type !== 'end' && cuePoints[cuePoints.length - 1].type !== 'ball_hit') {
      cuePoints.push({ x, y, type: 'end' });
    }
    if (postCollision && hitPoints[hitPoints.length - 1].type !== 'end') {
      hitPoints.push({ x: hx, y: hy, type: 'end' });
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

    const DT = 1.0;
    const FRIC = FRICTION;
    const SPIN_DEC = SPIN_DECAY;
    const CUSHION_REST = WALL_RESTITUTION;
    const SPIN_CUSH = SPIN_CUSHION_EFFECT;

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

        ball.x += ball.vx * DT;
        ball.y += ball.vy * DT;
        ball.vx *= FRIC;
        ball.vy *= FRIC;
        if (ball.spinX !== undefined) {
          ball.spinX *= SPIN_DEC;
          ball.spinY *= SPIN_DEC;
          if (ball.spinX !== 0) ball.vx += ball.spinX * SPIN_CUSH * 0.05;
          if (ball.spinY !== 0) ball.vy += ball.spinY * SPIN_CUSH * 0.05;
        }

        if (ball.x < left) { ball.x = left; ball.vx = Math.abs(ball.vx) * CUSHION_REST; }
        else if (ball.x > right) { ball.x = right; ball.vx = -Math.abs(ball.vx) * CUSHION_REST; }
        if (ball.y < top) { ball.y = top; ball.vy = Math.abs(ball.vy) * CUSHION_REST; }
        else if (ball.y > bottom) { ball.y = bottom; ball.vy = -Math.abs(ball.vy) * CUSHION_REST; }

        if (ball === simCue || postCollision) {
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

              if (a.spinX !== undefined && (a.spinX !== 0 || a.spinY !== 0)) {
                const tx = -ny; const ty = nx;
                const along = a.spinX * tx + a.spinY * ty;
                a.vx += tx * along * SPIN_COLLISION_EFFECT;
                a.vy += ty * along * SPIN_COLLISION_EFFECT;
                const perp = a.spinX * nx + a.spinY * ny;
                a.vx += nx * perp * SPIN_COLLISION_EFFECT * 0.5;
                a.vy += ny * perp * SPIN_COLLISION_EFFECT * 0.5;
              }
              if (b.spinX !== undefined) {
                b.spinX = a.spinX * 0.4;
                b.spinY = a.spinY * 0.4;
              }
            }

            const overlap = minDist - dist;
            const sep = overlap / 2;
            a.x -= sep * nx; a.y -= sep * ny;
            b.x += sep * nx; b.y += sep * ny;
          }
        }
      }

      if (postCollision) {
        for (const ball of allSimBalls) {
          if (!ball.active || ball === simCue) continue;
          ball.traj.push({ x: ball.x, y: ball.y });
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
