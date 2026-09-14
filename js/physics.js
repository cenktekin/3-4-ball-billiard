// ============================================================================
// physics.js — Carom billiards physics engine
//
// Units: px for distance, "frame" (1/60s) for time. Velocities are px/frame.
// The game loop drives this engine with a FIXED timestep accumulator
// (see gameloop.js) so behaviour is framerate- and sim-speed-independent.
//
// Realism model:
//   - Rolling resistance  : constant deceleration (balls stop cleanly)
//   - Sliding friction    : stronger deceleration while vertical spin remains
//   - Follow / draw       : spinY converts to linear velocity over time
//                           (weak in flight, strong after first ball contact)
//   - Side spin (english) : swerve while rolling + cushion rebound alteration
//   - Ball-ball collision : velocity-dependent restitution + Coulomb
//                           tangential friction (throw effect)
//   - Cushions            : velocity-dependent restitution, tangential
//                           velocity loss, spin-dependent rebound angle
// ============================================================================
const Physics = (() => {
  'use strict';

  // --- calibrated constants — single source of truth (Physics.CONFIG) --------
  // Units: px for distance, "frame" (1/60s) for time. Velocities are px/frame.
  // Exposed as one surface so the fixed pixel/frame contract is test-visible.
  const CONFIG = {
    // core
    BALL_RADIUS: 12,
    MAX_POWER: 30,            // px/frame at full charge
    MIN_VELOCITY: 0.04,       // stop threshold (px/frame)

    // friction
    ROLL_DECEL: 0.05,         // px/frame^2 — rolling resistance
    SLIDE_DECEL: 0.13,        // px/frame^2 — while spin is still sliding
    SLIDE_SPIN_THRESHOLD: 0.05,

    // follow / draw (spinY: negative = follow/top, positive = draw/back)
    FOLLOW_ACCEL: 0.48,       // px/frame^2 per unit spinY (post-contact)
    IN_FLIGHT_SPIN_SCALE: 0.38, // spin acts weakly before first contact
    SPIN_Y_DECAY_AIR: 0.992,  // per-frame decay before first contact
    SPIN_Y_DECAY_CONTACT: 0.90, // per-frame decay after contact

    // side spin (spinX: positive = right english)
    SPIN_X_DECAY: 0.986,      // per-frame — spin persists
    SWERVE: 0.075,            // px/frame^2 lateral accel at spinX=1, v~0

    // ball-ball collisions
    REST_LOW: 0.95,           // restitution at low impact speed
    REST_HIGH: 0.87,          // restitution at >= REST_VREF
    REST_VREF: 22,            // px/frame
    BALL_FRICTION: 0.08,      // Coulomb ratio (tangential/normal impulse)
    SPIN_SURFACE: 6,          // contact surface speed per unit spinX

    // cushions
    CUSHION_REST_LOW: 0.82,
    CUSHION_REST_HIGH: 0.70,
    CUSHION_REST_VREF: 20,
    CUSHION_T_KEEP: 0.88,     // tangential velocity retained on rebound
    CUSHION_SPIN_EFFECT: 0.90,
    CUSHION_SPIN_VREF: 12,
    CUSHION_SPIN_KEEP: 0.72,  // side spin retained after cushion hit

    // shared shot simulation (single authoritative path — see below)
    SIM_STEP: 0.25,            // substep fraction of a frame (matches live step)
    MAX_SIM_STEPS: 20000,      // hard termination safety cap (substeps)
    FOLLOW_SPEED_CAP: 1.2,     // speed cap multiplier applied during follow/draw
    SPIN_STOP_THRESHOLD: 0.02, // |spinY| below which isMoving reports stopped
    HORIZON_MARGIN_STEPS: 8    // safety margin on the derived horizon (substeps)
  };

  // Read the calibrated surface into local names so the engine body below stays
  // untouched while CONFIG remains the single authoritative, exported source.
  const {
    BALL_RADIUS, MAX_POWER, MIN_VELOCITY,
    ROLL_DECEL, SLIDE_DECEL, SLIDE_SPIN_THRESHOLD,
    FOLLOW_ACCEL, IN_FLIGHT_SPIN_SCALE, SPIN_Y_DECAY_AIR, SPIN_Y_DECAY_CONTACT,
    SPIN_X_DECAY, SWERVE,
    REST_LOW, REST_HIGH, REST_VREF, BALL_FRICTION, SPIN_SURFACE,
    CUSHION_REST_LOW, CUSHION_REST_HIGH, CUSHION_REST_VREF,
    CUSHION_T_KEEP, CUSHION_SPIN_EFFECT, CUSHION_SPIN_VREF, CUSHION_SPIN_KEEP,
    SIM_STEP, MAX_SIM_STEPS, FOLLOW_SPEED_CAP, SPIN_STOP_THRESHOLD, HORIZON_MARGIN_STEPS
  } = CONFIG;

  // --- helpers ----------------------------------------------------------------
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function ballRestitution(vn) {
    return REST_LOW - (REST_LOW - REST_HIGH) * Math.min(vn / REST_VREF, 1);
  }

  function cushionRestitution(vn) {
    return CUSHION_REST_LOW - (CUSHION_REST_LOW - CUSHION_REST_HIGH) * Math.min(vn / CUSHION_REST_VREF, 1);
  }

  function speedOf(ball) {
    return Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  }

  function isMoving(ball) {
    return speedOf(ball) > MIN_VELOCITY || Math.abs(ball.spinY || 0) > SPIN_STOP_THRESHOLD;
  }

  function ensureBallFields(ball) {
    if (ball.spinX === undefined) ball.spinX = 0;
    if (ball.spinY === undefined) ball.spinY = 0;
    if (ball.dirX === undefined) { ball.dirX = 1; ball.dirY = 0; }
    if (ball.contacted === undefined) ball.contacted = false;
    if (ball.rollAngle === undefined) ball.rollAngle = 0;
  }

  // --- shot -------------------------------------------------------------------
  function calculateShotDirection(cueBall, targetX, targetY) {
    return Math.atan2(targetY - cueBall.y, targetX - cueBall.x);
  }

  function applyShot(ball, angle, power, spinX, spinY) {
    const p = Math.min(power, MAX_POWER);
    ball.vx = Math.cos(angle) * p;
    ball.vy = Math.sin(angle) * p;
    ball.spinX = spinX || 0;
    ball.spinY = spinY || 0;
    ball.contacted = false;
    ball.dirX = Math.cos(angle);
    ball.dirY = Math.sin(angle);
    ensureBallFields(ball);
  }

  // --- per-ball integration (friction, spin, movement, cushions) --------------
  function integrateBall(ball, dt, bounds, events) {
    ensureBallFields(ball);

    let speed = speedOf(ball);
    const hasSpinY = Math.abs(ball.spinY) > 0.003;

    // A ball at rest with no pending spin effect does nothing.
    if (speed <= MIN_VELOCITY && !hasSpinY) {
      ball.vx = 0;
      ball.vy = 0;
      return;
    }

    // 1) travel direction (kept for draw-back when speed hits zero)
    if (speed > MIN_VELOCITY) {
      ball.dirX = ball.vx / speed;
      ball.dirY = ball.vy / speed;
    }

    // 2) follow / draw — spinY converts into linear velocity along travel dir.
    //    Weak before first contact (ball is transitioning to natural roll),
    //    strong after contact (this is what makes the cue follow or draw back).
    if (hasSpinY) {
      const scale = ball.contacted ? 1 : IN_FLIGHT_SPIN_SCALE;
      const accel = -ball.spinY * FOLLOW_ACCEL * scale;
      ball.vx += ball.dirX * accel * dt;
      ball.vy += ball.dirY * accel * dt;
      const decay = ball.contacted ? SPIN_Y_DECAY_CONTACT : SPIN_Y_DECAY_AIR;
      ball.spinY *= Math.pow(decay, dt);
      if (Math.abs(ball.spinY) < 0.003) ball.spinY = 0;
      speed = speedOf(ball);
      const cap = MAX_POWER * 1.2;
      if (speed > cap) {
        ball.vx *= cap / speed;
        ball.vy *= cap / speed;
        speed = cap;
      }
    }

    // 3) friction — constant deceleration (sliding > rolling)
    if (speed > 0) {
      const sliding = Math.abs(ball.spinY) > SLIDE_SPIN_THRESHOLD;
      const decel = sliding ? SLIDE_DECEL : ROLL_DECEL;
      const newSpeed = Math.max(0, speed - decel * dt);
      if (newSpeed <= MIN_VELOCITY) {
        ball.vx = 0;
        ball.vy = 0;
        speed = 0;
      } else {
        const k = newSpeed / speed;
        ball.vx *= k;
        ball.vy *= k;
        speed = newSpeed;
      }
    }

    // 4) side spin swerve — curves the path, stronger at low speed
    if (Math.abs(ball.spinX) > 0.003 && speed > MIN_VELOCITY) {
      const slowFactor = clamp(1 - speed / MAX_POWER, 0, 1);
      const accel = ball.spinX * SWERVE * (0.3 + 0.7 * slowFactor);
      // right of travel direction (canvas y-down): (-dirY, dirX)
      ball.vx += -ball.dirY * accel * dt;
      ball.vy += ball.dirX * accel * dt;
      ball.spinX *= Math.pow(SPIN_X_DECAY, dt);
      if (Math.abs(ball.spinX) < 0.003) ball.spinX = 0;
    }

    // 5) move + visual roll
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (speed > MIN_VELOCITY) {
      ball.rollAngle += (speed * dt) / ball.radius;
    }

    // 6) cushions — both axes independently (handles corner hits correctly)
    const left = bounds.x + ball.radius;
    const right = bounds.x + bounds.width - ball.radius;
    const top = bounds.y + ball.radius;
    const bottom = bounds.y + bounds.height - ball.radius;

    if (ball.x < left && ball.vx < 0) {
      const vn = -ball.vx;
      ball.x = left;
      ball.vx = vn * cushionRestitution(vn);
      const eff = CUSHION_SPIN_EFFECT * clamp(vn / CUSHION_SPIN_VREF, 0.25, 1.5);
      // validated sign convention: left cushion, right english pushes up-screen (+vy)
      ball.vy = ball.vy * CUSHION_T_KEEP + ball.spinX * eff;
      ball.spinX *= CUSHION_SPIN_KEEP;
      events.cushionHits.push({ id: ball.id, speed: vn });
      ball.contacted = true;
    } else if (ball.x > right && ball.vx > 0) {
      const vn = ball.vx;
      ball.x = right;
      ball.vx = -vn * cushionRestitution(vn);
      const eff = CUSHION_SPIN_EFFECT * clamp(vn / CUSHION_SPIN_VREF, 0.25, 1.5);
      ball.vy = ball.vy * CUSHION_T_KEEP - ball.spinX * eff;
      ball.spinX *= CUSHION_SPIN_KEEP;
      events.cushionHits.push({ id: ball.id, speed: vn });
      ball.contacted = true;
    }

    if (ball.y < top && ball.vy < 0) {
      const vn = -ball.vy;
      ball.y = top;
      ball.vy = vn * cushionRestitution(vn);
      const eff = CUSHION_SPIN_EFFECT * clamp(vn / CUSHION_SPIN_VREF, 0.25, 1.5);
      ball.vx = ball.vx * CUSHION_T_KEEP + ball.spinX * eff;
      ball.spinX *= CUSHION_SPIN_KEEP;
      events.cushionHits.push({ id: ball.id, speed: vn });
      ball.contacted = true;
    } else if (ball.y > bottom && ball.vy > 0) {
      const vn = ball.vy;
      ball.y = bottom;
      ball.vy = -vn * cushionRestitution(vn);
      const eff = CUSHION_SPIN_EFFECT * clamp(vn / CUSHION_SPIN_VREF, 0.25, 1.5);
      ball.vx = ball.vx * CUSHION_T_KEEP - ball.spinX * eff;
      ball.spinX *= CUSHION_SPIN_KEEP;
      events.cushionHits.push({ id: ball.id, speed: vn });
      ball.contacted = true;
    }
  }

  // --- ball-ball collision with restitution + Coulomb throw --------------------
  function resolveBallCollision(a, b, events) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist >= minDist) return false;

    // Coincident centres (dist === 0) would divide by zero. Fall back to a
    // deterministic normal so the overlap is still separated rather than leaving
    // the two balls stuck together.
    const nx = dist === 0 ? 1 : dx / dist;
    const ny = dist === 0 ? 0 : dy / dist;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dvn = dvx * nx + dvy * ny;

    // positional separation (always resolve overlap)
    const overlap = minDist - dist;
    const sep = overlap / 2;
    a.x -= sep * nx;
    a.y -= sep * ny;
    b.x += sep * nx;
    b.y += sep * ny;

    if (dvn <= 0) return false; // already separating

    // normal impulse with velocity-dependent restitution
    const e = ballRestitution(dvn);
    const j = dvn * (1 + e) / 2;
    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;

    // tangential (Coulomb) friction at the contact point -> throw effect.
    // Slip includes the surface velocity contributed by side spin.
    const tx = -ny;
    const ty = nx;
    const dvt = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty;
    const slip = dvt + (a.spinX + b.spinX) * SPIN_SURFACE;
    const jtMax = BALL_FRICTION * dvn;
    const jt = clamp(slip / 2, -jtMax, jtMax);
    a.vx -= jt * tx;
    a.vy -= jt * ty;
    b.vx += jt * tx;
    b.vy += jt * ty;

    // friction torque bleeds a little side spin
    const spinBleed = (jt / SPIN_SURFACE) * 0.5;
    a.spinX = clamp(a.spinX - spinBleed, -1, 1);
    b.spinX = clamp(b.spinX + spinBleed, -1, 1);

    // follow/draw stays with the ball that carries it (no spinY transfer —
    // this is what lets the cue ball follow through or draw back after contact)
    a.contacted = true;
    b.contacted = true;

    events.ballHits.push({ aId: a.id, bId: b.id, speed: dvn });
    return true;
  }

  // --- one fixed substep of the whole world ------------------------------------
  function stepWorld(balls, bounds, dt) {
    const events = { ballHits: [], cushionHits: [] };

    for (const ball of balls) {
      if (!ball.active) continue;
      integrateBall(ball, dt, bounds, events);
    }

    for (let i = 0; i < balls.length; i++) {
      if (!balls[i].active) continue;
      for (let k = i + 1; k < balls.length; k++) {
        if (!balls[k].active) continue;
        resolveBallCollision(balls[i], balls[k], events);
      }
    }

    return events;
  }

  // --- simulation helpers (used by aim preview, AI replay, shot snapshot) ------
  function cloneBall(b) {
    return {
      id: b.id,
      x: b.x,
      y: b.y,
      vx: b.vx || 0,
      vy: b.vy || 0,
      spinX: 0,
      spinY: 0,
      radius: b.radius,
      active: true,
      dirX: 1,
      dirY: 0,
      contacted: false,
      rollAngle: 0
    };
  }

  function cloneBalls(balls) {
    return balls.filter(b => b.active).map(cloneBall);
  }

  // Deterministic upper bound on the number of SIM_STEP substeps a shot needs to
  // reach a stable rest state (every ball !isMoving). It is derived from the
  // shot's power and spin, the table bounds, cushion restitution, and the
  // MIN_VELOCITY / isMoving stop rule, so it replaces the old fixed 200/300/400
  // caps with a horizon that never truncates a still-moving ball. The absolute
  // ceiling is MAX_SIM_STEPS (a hard termination safety cap).
  function computeSimulationHorizon(power, spinX, spinY, bounds) {
    const dt = SIM_STEP;
    const p = clamp(power || 0, 0, MAX_POWER);
    const hasSpin = Math.abs(spinY || 0) > SPIN_STOP_THRESHOLD ||
                    Math.abs(spinX || 0) > SPIN_STOP_THRESHOLD;

    // follow/draw is capped at MAX_POWER * FOLLOW_SPEED_CAP by integrateBall,
    // so that cap is the ceiling whenever spin is present; otherwise the shot
    // speed is bounded by min(power, MAX_POWER).
    const vMax = hasSpin ? MAX_POWER * FOLLOW_SPEED_CAP : Math.max(p, MIN_VELOCITY);

    // friction is the only force that removes speed, so coasting from vMax to
    // MIN_VELOCITY at the slowest decel bounds the whole motion duration.
    const coastFrames = vMax / ROLL_DECEL;

    // spinY keeps isMoving true until it decays below SPIN_STOP_THRESHOLD at the
    // slowest (in-air) rate.
    const spinMag = Math.max(Math.abs(spinY || 0), SPIN_STOP_THRESHOLD);
    const spinFrames = hasSpin
      ? Math.log(SPIN_STOP_THRESHOLD / spinMag) / Math.log(SPIN_Y_DECAY_AIR)
      : 0;

    // restitution (< 1) caps how many times a ball can bounce off `bounds` before
    // dropping below MIN_VELOCITY; each bounce adds at most one table diagonal of
    // travel. Clamped to coastFrames because cushion losses only shorten motion.
    const diagonal = Math.hypot(bounds.width || 0, bounds.height || 0) || 1;
    const maxBounces = Math.max(1, Math.ceil(
      Math.log(MIN_VELOCITY / vMax) / Math.log(CUSHION_REST_LOW)
    ));
    const cushionFrames = Math.min(maxBounces * (diagonal / vMax), coastFrames);

    const totalFrames = coastFrames + Math.max(0, spinFrames) + cushionFrames;
    const steps = Math.ceil(totalFrames / dt) + HORIZON_MARGIN_STEPS;
    return Math.min(steps, MAX_SIM_STEPS);
  }

  // Shared, authoritative simulation loop: steps `balls` via stepWorld at `dt`
  // until every ball is at rest (or the horizon is exhausted), invoking
  // `onStep(events, step)` after each substep so callers record markers without
  // duplicating the integrator or the stop rule.
  function runWorldToRest(balls, bounds, dt, horizonSteps, onStep) {
    let steps = 0;
    for (; steps < horizonSteps; steps++) {
      const events = stepWorld(balls, bounds, dt);
      if (onStep) onStep(events, steps);
      if (!balls.some(b => b.active && isMoving(b))) break;
    }
    return steps;
  }

  function simulateTrajectory(startX, startY, angle, power, spinX, spinY, table, balls, maxSteps) {
    const cuePoints = [{ x: startX, y: startY, type: 'start' }];
    const hitPoints = [];
    let hitBallId = null;

    const simBalls = cloneBalls(balls);
    let simCue = simBalls.find(b => Math.abs(b.x - startX) < 1 && Math.abs(b.y - startY) < 1);
    if (!simCue) {
      simCue = {
        id: 'cue_temp', x: startX, y: startY, vx: 0, vy: 0,
        spinX: 0, spinY: 0, radius: BALL_RADIUS, active: true,
        dirX: 1, dirY: 0, contacted: false, rollAngle: 0
      };
      simBalls.push(simCue);
    }
    applyShot(simCue, angle, power, spinX, spinY);

    const horizon = maxSteps != null
      ? maxSteps
      : computeSimulationHorizon(power, spinX, spinY, table);
    let hitBall = null;

    runWorldToRest(simBalls, table, SIM_STEP, horizon, (events, step) => {
      if (!hitBall && events.ballHits.length > 0) {
        const hit = events.ballHits.find(h => h.aId === simCue.id || h.bId === simCue.id);
        if (hit) {
          hitBallId = hit.aId === simCue.id ? hit.bId : hit.aId;
          hitBall = simBalls.find(b => b.id === hitBallId) || null;
          cuePoints.push({ x: simCue.x, y: simCue.y, type: 'ball_hit', ballId: hitBallId });
        }
      }

      for (const c of events.cushionHits) {
        const ball = simBalls.find(b => b.id === c.id);
        if (!ball) continue;
        if (ball === simCue) cuePoints.push({ x: ball.x, y: ball.y, type: 'cushion' });
        else if (hitBall && ball === hitBall) hitPoints.push({ x: ball.x, y: ball.y, type: 'cushion' });
      }

      if (step % 2 === 0) {
        cuePoints.push({ x: simCue.x, y: simCue.y, type: 'path' });
        if (hitBall) {
          hitPoints.push({ x: hitBall.x, y: hitBall.y, type: 'target' });
        }
      }
    });

    return { cuePoints, hitPoints, hitBallId };
  }

  function simulateFullShot(cueBall, angle, power, spinX, spinY, balls, table, maxSteps) {
    const simCue = {
      id: cueBall.id, x: cueBall.x, y: cueBall.y, vx: 0, vy: 0,
      spinX: 0, spinY: 0, radius: cueBall.radius, active: true,
      dirX: 1, dirY: 0, contacted: false, rollAngle: 0
    };
    const others = balls
      .filter(b => b.active && b !== cueBall)
      .map(cloneBall);
    const all = [simCue, ...others];
    applyShot(simCue, angle, power, spinX, spinY);

    for (const ball of all) ball.traj = [{ x: ball.x, y: ball.y }];

    const horizon = maxSteps != null
      ? maxSteps
      : computeSimulationHorizon(power, spinX, spinY, table);

    runWorldToRest(all, table, SIM_STEP, horizon, (events, step) => {
      if (step % 2 === 0) {
        for (const ball of all) ball.traj.push({ x: ball.x, y: ball.y });
      }
    });

    const trajectories = [];
    for (const ball of all) {
      if (ball.traj.length > 1) {
        trajectories.push({ id: ball.id, points: ball.traj, isCue: ball === simCue });
      }
    }
    return trajectories;
  }

  return {
    // constants — one calibrated surface (the single source of truth)
    CONFIG,
    // api
    applyShot,
    calculateShotDirection,
    stepWorld,
    isMoving,
    speedOf,
    computeSimulationHorizon,
    simulateTrajectory,
    simulateFullShot
  };
})();
