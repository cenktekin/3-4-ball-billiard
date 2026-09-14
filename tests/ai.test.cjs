'use strict';
// ============================================================================
// tests/ai.test.cjs — deterministic AI legality & behavior verification
//
// Verifies the analytic AI (js/ai.js) against the shared physics engine after
// the physics/simulation refactor, WITHOUT rewriting the analytic model.
//
// Harness (mirrors tests/physics.test.cjs):
//   - vm sandbox with the real `js/physics.js` (for Physics.CONFIG.MAX_POWER and
//     the authoritative stepWorld/simulateTrajectory path) and `js/ai.js`.
//   - deterministic Math: `random()` pinned to 0.5 so difficulty noise is
//     removed and the analytic shot is fully reproducible. The production
//     noise code inside ai.js is NOT modified — only the injected Math is.
//   - bounded Table.getBounds() stub returning the real playable bounds.
//
// Coverage:
//   1) finite in-bounds shots for 3-ball / 3-cushion / 4-ball × easy/medium/hard
//   2) legal contact geometry (AI analytic aim resolves to a real physics contact)
//   3) no-target / blocked fallback (null returns, no NaN, no stuck thinking)
//   4) calcSpin sign parity against the shared physics simulation
//   5) determinism (repeated evaluation yields identical output)
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- deterministic Math: constant random() removes difficulty noise ---------
// All transcendental functions inherit from the real Math via the prototype
// chain; only random() is overridden so the analytic model is fully
// reproducible and idempotent (no RNG state to advance).
const deterministicMath = Object.assign(Object.create(Math), { random: () => 0.5 });

// --- bounded Table stub + real playable bounds (matches js/table.js) ---------
const BOUNDS = { x: 62, y: 82, width: 776, height: 376 };

// --- load the real physics engine and the AI into the vm sandbox -------------
const physicsSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8');
const aiSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'ai.js'), 'utf8');

const physicsCtx = vm.createContext({ Math: deterministicMath, console });
const Physics = vm.runInContext(physicsSrc + '\nPhysics;', physicsCtx);

const aiCtx = vm.createContext({
  Math: deterministicMath,
  console,
  Physics,
  Table: { getBounds: () => ({ ...BOUNDS }) }
});
const AI = vm.runInContext(aiSrc + '\nAI;', aiCtx);

// --- assert harness (same shape as physics.test.cjs) --------------------------
let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  PASS  ' + msg);
  } else {
    failed++;
    console.log('  FAIL  ' + msg);
  }
}

// --- ball factory (matches physics.test.cjs makeBall) -------------------------
function makeBall(x, y, id) {
  return {
    id, x, y, vx: 0, vy: 0, spinX: 0, spinY: 0,
    radius: Physics.CONFIG.BALL_RADIUS, active: true,
    dirX: 1, dirY: 0, contacted: false, rollAngle: 0
  };
}

// --- deterministic game-state fixtures (mirror js/mode3ball.js / mode4ball.js)
function make3ball() {
  const white = makeBall(579, 182, 'white');
  const yellow = makeBall(579, 358, 'yellow');
  const red = makeBall(357, 270, 'red');
  return { cueBall: white, balls: [white, yellow, red], selectedBallId: 'white', mode: '3ball' };
}
function make3cushion() {
  const gs = make3ball();
  gs.mode = '3cushion';
  return gs;
}
function make4ball() {
  const red1 = makeBall(271, 270, 'red1');
  const red2 = makeBall(343, 270, 'red2');
  const white = makeBall(579, 182, 'white');
  const yellow = makeBall(579, 358, 'yellow');
  return { cueBall: white, balls: [white, red1, red2, yellow], selectedBallId: 'white', mode: '4ball' };
}

// --- simulate the AI's chosen shot through the shared physics path ------------
function simulate(gs, shot) {
  const simBalls = gs.balls.map(b => ({
    id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, spinX: 0, spinY: 0,
    radius: b.radius, active: true, dirX: 1, dirY: 0, contacted: false, rollAngle: 0
  }));
  return Physics.simulateTrajectory(
    gs.cueBall.x, gs.cueBall.y, shot.angle, shot.power, shot.spinX, shot.spinY,
    BOUNDS, simBalls
  );
}

function runUntilStopped(balls, bounds, dt) {
  let steps = 0;
  while (steps++ < 40000) {
    Physics.stepWorld(balls, bounds, dt);
    if (!balls.some(b => b.active && Physics.isMoving(b))) break;
  }
}

const MODES = [
  { name: '3ball', make: make3ball },
  { name: '3cushion', make: make3cushion },
  { name: '4ball', make: make4ball }
];
const DIFFS = ['easy', 'medium', 'hard'];

// Collect a shot + simulated trajectory for every mode/difficulty combination.
const shots = [];
for (const diff of DIFFS) {
  AI.setDifficulty(diff);
  for (const m of MODES) {
    const gs = m.make();
    const shot = AI.findBestShot(gs);
    const traj = shot ? simulate(gs, shot) : null;
    shots.push({ diff, mode: m.name, shot, traj });
  }
}

console.log('1) Finite in-bounds shots — 3-ball / 3-cushion / 4-ball × easy/medium/hard');
for (const s of shots) {
  const label = s.mode + '/' + s.diff;
  assert(s.shot !== null, label + ' selects a shot');
  if (!s.shot) continue;
  const finite = isFinite(s.shot.angle) && isFinite(s.shot.power) &&
                 isFinite(s.shot.spinX) && isFinite(s.shot.spinY);
  assert(finite, label + ' shot is finite (angle=' + s.shot.angle.toFixed(3) +
    ', power=' + s.shot.power + ', spin=(' + s.shot.spinX.toFixed(2) + ',' + s.shot.spinY.toFixed(2) + '))');
  assert(s.shot.power >= 4 && s.shot.power <= Physics.CONFIG.MAX_POWER * 0.85 + 1e-9,
    label + ' power within [4, MAX_POWER*0.85]: ' + s.shot.power);
  assert(Math.abs(s.shot.spinX) <= 1 && Math.abs(s.shot.spinY) <= 1,
    label + ' spin within [-1,1]');
  if (s.traj) {
    const pts = s.traj.cuePoints;
    const finitePath = pts.every(p => isFinite(p.x) && isFinite(p.y));
    const inBounds = pts.every(p =>
      p.x >= BOUNDS.x - 0.01 && p.x <= BOUNDS.x + BOUNDS.width + 0.01 &&
      p.y >= BOUNDS.y - 0.01 && p.y <= BOUNDS.y + BOUNDS.height + 0.01);
    assert(finitePath, label + ' simulated cue path is finite (' + pts.length + ' points)');
    assert(inBounds, label + ' simulated cue path stays in bounds');
    assert(pts.length >= 2, label + ' cue path reaches a rest point');
  }
}

console.log('2) Legal contact geometry — analytic aim resolves to a real physics contact');
for (const s of shots) {
  const label = s.mode + '/' + s.diff;
  if (!s.shot || !s.traj) { assert(false, label + ' has a simulated trajectory'); continue; }
  assert(s.traj.hitBallId !== null, label + ' trajectory preview reports a ball hit: ' + s.traj.hitBallId);
  assert(s.traj.hitBallId === s.shot.firstBall.id,
    label + ' physics first-contact matches AI firstBall (' + s.traj.hitBallId + ' == ' + s.shot.firstBall.id + ')');
}

console.log('3) No-target / blocked fallback — null without NaN or stuck thinking');
{
  const cue = makeBall(100, 100, 'white');
  const gs = { cueBall: cue, balls: [cue], selectedBallId: 'white', mode: '3ball' };
  assert(AI.findBestShot(gs) === null, 'no target balls → findBestShot returns null');
}
{
  const cue = makeBall(100, 100, 'white');
  cue.active = false;
  const target = makeBall(300, 300, 'red');
  const gs = { cueBall: cue, balls: [cue, target], selectedBallId: 'white', mode: '3ball' };
  assert(AI.findBestShot(gs) === null, 'inactive cue ball → findBestShot returns null');
}
{
  const gs = make3ball();
  const empty = AI.getSuggestedSpinForAngle(gs.cueBall, 0.0, gs.balls, '3ball'); // +x, no ball that way
  assert(empty === null, 'empty aim direction → getSuggestedSpinForAngle returns null');
}
{
  const gs = make3ball();
  const cue = gs.cueBall;
  const ang = Math.atan2(270 - 182, 357 - 579); // aim directly at red
  const s = AI.getSuggestedSpinForAngle(cue, ang, gs.balls, '3ball');
  assert(s !== null && isFinite(s.spinX) && isFinite(s.spinY), 'aim at red → getSuggestedSpinForAngle returns finite spin');
  if (s) {
    assert(Math.abs(s.spinX) <= 1 && Math.abs(s.spinY) <= 1, 'suggested spin within [-1,1]');
  }
}
{
  const cue = makeBall(100, 100, 'white');
  const gs = { cueBall: cue, balls: [cue], selectedBallId: 'white', mode: '3ball', aimAngle: 0.5, shotPower: 0, spinX: 0, spinY: 0 };
  AI.setEnabled(true);
  AI.startThinking(gs);
  assert(isFinite(gs.aimAngle) && gs.aimAngle === 0.5, 'no-target startThinking leaves aimAngle unchanged (no NaN)');
  let ready = false;
  for (let i = 0; i < 5000 && !ready; i++) ready = AI.update(1);
  assert(ready === true, 'thinking resolves deterministically (no stuck state)');
  assert(AI.isThinking() === false, 'AI not left in a stuck thinking state');
  AI.setEnabled(false);
}

console.log('4) calcSpin sign parity against the shared physics simulation');
{
  // (a) follow/draw spinY convention: AI emits spinY<0 for "follow", >0 for "draw".
  //     Physics must interpret those signs the same way (negative = forward,
  //     positive = backward) so the AI's spin is not inverted when played.
  const cue = makeBall(300, 200, 'white');
  const A = makeBall(300, 320, 'A');   // object ball ahead (+y)
  const B = makeBall(300, 150, 'B');   // next ball behind the cue
  const ang = Math.atan2(320 - 200, 0);
  const s = AI.getSuggestedSpinForAngle(cue, ang, [cue, A, B], '3ball');
  assert(s !== null && s.spinY < 0, 'follow fixture: AI emits follow spinY < 0 (got ' + (s && s.spinY) + ')');

  function cueFinalY(spinY) {
    const c = makeBall(300, 200, 'white');
    const a = makeBall(300, 320, 'A');
    Physics.applyShot(c, Math.PI / 2, 12, 0, spinY);
    runUntilStopped([c, a], { x: 0, y: 0, width: 8000, height: 1000 }, 0.25);
    return c.y;
  }
  const yFollow = cueFinalY(-0.6);
  const yPlain = cueFinalY(0);
  const yDraw = cueFinalY(0.6);
  assert(yFollow > yPlain, 'physics: follow (spinY<0) carries cue forward (y=' + yFollow.toFixed(1) + ' > plain ' + yPlain.toFixed(1) + ')');
  assert(yDraw < yPlain, 'physics: draw (spinY>0) pulls cue back (y=' + yDraw.toFixed(1) + ' < plain ' + yPlain.toFixed(1) + ')');
}
{
  // (b) the analytic 4-ball head-on shot emits positive spinY (draw); physics
  //     must treat positive spinY as backward, matching the AI's intent.
  AI.setDifficulty('hard');
  const gs = make4ball();
  const shot = AI.findBestShot(gs);
  assert(shot !== null && shot.spinY > 0, '4-ball head-on: AI emits draw spinY > 0 (got ' + (shot && shot.spinY) + ')');
  if (shot) {
    function cueFinalY(spinY) {
      const c = makeBall(579, 182, 'white');
      const y = makeBall(579, 358, 'yellow');
      Physics.applyShot(c, Math.PI / 2, shot.power, 0, spinY);
      runUntilStopped([c, y], { x: 0, y: 0, width: 8000, height: 1000 }, 0.25);
      return c.y;
    }
    const yDraw = cueFinalY(shot.spinY);
    const yPlain = cueFinalY(0);
    assert(yDraw < yPlain, 'physics: AI draw spinY>0 pulls cue back (y=' + yDraw.toFixed(1) + ' < plain ' + yPlain.toFixed(1) + ')');
  }
}
{
  // (c) english (spinX) cushion sign: the AI emits positive spinX = right
  //     english, consumed by physics with the same convention. Physics must
  //     rebound a left-cushion hit with +vy for +spinX (right english) and -vy
  //     for -spinX (left english).
  const bounds = { x: 0, y: 0, width: 2000, height: 1000 };
  function cushionVy(spinX) {
    const b = makeBall(bounds.x + Physics.CONFIG.BALL_RADIUS + 2, 500, 'cue');
    b.vx = -8;
    b.spinX = spinX;
    for (let step = 0; step < 200; step++) {
      const ev = Physics.stepWorld([b], bounds, 0.25);
      if (ev.cushionHits.length) return b.vy;
    }
    return null;
  }
  const vyRight = cushionVy(0.4);
  const vyLeft = cushionVy(-0.4);
  assert(vyRight > 0, 'physics: right english (spinX>0) on left cushion → +vy (' + vyRight.toFixed(3) + ')');
  assert(vyLeft < 0, 'physics: left english (spinX<0) on left cushion → -vy (' + vyLeft.toFixed(3) + ')');
}

console.log('5) Determinism — repeated evaluation yields identical analytic shot');
AI.setDifficulty('medium');
for (const m of MODES) {
  function snapshot() {
    const gs = m.make();
    const shot = AI.findBestShot(gs);
    return JSON.stringify({
      angle: shot.angle, power: shot.power, spinX: shot.spinX, spinY: shot.spinY,
      firstBall: shot.firstBall.id, score: shot.score
    });
  }
  const a = snapshot();
  const b = snapshot();
  assert(a === b, m.name + ' findBestShot is deterministic across repeated calls');
}

console.log('');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
