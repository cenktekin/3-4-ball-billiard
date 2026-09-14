'use strict';
// ============================================================================
// tests/ui-guidance.test.cjs — physics-derived shot guidance contract (Todo 6)
//
// Verifies that the aiming UI exposes a single physics-derived guidance surface
// (UI.getShotGuidance) built on the shared simulation API (Physics.simulateTrajectory)
// rather than hand-drawn approximations. The UI must consume the shared simulation
// output for: predicted distance, first contact, cushion order, cue rest marker,
// and target-ball rest marker — and the spin sign conventions must agree with the
// physics engine (follow/draw and english).
//
// Harness (mirrors tests/physics.test.cjs / tests/ai.test.cjs):
//   - vm sandbox with the real `js/physics.js` and `js/ui.js`.
//   - stub Table (bounded getBounds), I18n (identity t), AI (no suggestion),
//     Mode4Ball/Mode3Ball/GameFlow (unused by getShotGuidance).
//   - deterministic fixtures: fixed 3-ball layout, fixed aim angles.
//
// Coverage:
//   1) UI.getShotGuidance exists and returns the full guidance contract
//   2) predicted distance is finite and positive
//   3) cue rest marker equals the simulated cue endpoint
//   4) target rest marker equals the simulated target endpoint when a ball is hit
//   5) first contact ballId matches the simulation's hitBallId
//   6) cushion order is recorded in path order
//   7) spin sign conventions agree with physics (follow/draw + english)
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const physicsSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');

const BOUNDS = { x: 62, y: 82, width: 776, height: 376 };

const physicsCtx = vm.createContext({ Math, console });
const Physics = vm.runInContext(physicsSrc + '\nPhysics;', physicsCtx);

const uiCtx = vm.createContext({
  Math,
  console,
  Physics,
  Table: { getBounds: () => ({ ...BOUNDS }) },
  I18n: { t: (k) => k },
  AI: { getSuggestedSpinForAngle: () => null },
  Mode4Ball: {},
  Mode3Ball: {},
  GameFlow: {},
  UI: {}
});
const UI = vm.runInContext(uiSrc + '\nUI;', uiCtx);

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

function makeBall(x, y, id) {
  return {
    id, x, y, vx: 0, vy: 0, spinX: 0, spinY: 0,
    radius: Physics.CONFIG.BALL_RADIUS, active: true,
    dirX: 1, dirY: 0, contacted: false, rollAngle: 0
  };
}

// 3-ball layout (mirrors js/mode3ball.js placement on the real bounds)
const white = makeBall(579, 182, 'white');
const yellow = makeBall(579, 358, 'yellow');
const red = makeBall(357, 270, 'red');
const balls = [white, yellow, red];

// aim straight at the red ball from the white cue ball
const angleToRed = Math.atan2(red.y - white.y, red.x - white.x);

console.log('1) UI.getShotGuidance exists and returns the guidance contract');
{
  assert(typeof UI.getShotGuidance === 'function', 'UI.getShotGuidance is a function');
  const g = UI.getShotGuidance(white, angleToRed, 12, 0, 0, balls, BOUNDS);
  assert(!!g, 'guidance returned for a valid aim');
  assert(g && typeof g.distance === 'number', 'guidance.distance is a number');
  assert(g && Array.isArray(g.cushionOrder), 'guidance.cushionOrder is an array');
  assert(g && g.cueRest && typeof g.cueRest.x === 'number', 'guidance.cueRest is a point');
  assert(g && 'targetRest' in g, 'guidance.targetRest key present');
  assert(g && 'firstContact' in g, 'guidance.firstContact key present');
  assert(g && 'hitBallId' in g, 'guidance.hitBallId key present');
}

console.log('2) Predicted distance is finite and positive');
{
  const g = UI.getShotGuidance(white, angleToRed, 12, 0, 0, balls, BOUNDS);
  assert(Number.isFinite(g.distance) && g.distance > 0, 'distance finite and > 0: ' + g.distance.toFixed(1));
  const g2 = UI.getShotGuidance(white, angleToRed, 25, 0, 0, balls, BOUNDS);
  assert(g2.distance > g.distance, 'higher power => longer predicted distance: ' + g.distance.toFixed(0) + ' < ' + g2.distance.toFixed(0));
}

console.log('3) Cue rest marker equals the simulated cue endpoint');
{
  const g = UI.getShotGuidance(white, angleToRed, 12, 0, 0, balls, BOUNDS);
  const sim = Physics.simulateTrajectory(white.x, white.y, angleToRed, 12, 0, 0, BOUNDS, balls);
  const last = sim.cuePoints[sim.cuePoints.length - 1];
  assert(Math.abs(g.cueRest.x - last.x) < 0.001 && Math.abs(g.cueRest.y - last.y) < 0.001,
    'cueRest matches simulation endpoint: (' + g.cueRest.x.toFixed(1) + ',' + g.cueRest.y.toFixed(1) + ')');
}

console.log('4) Target rest marker equals the simulated target endpoint when a ball is hit');
{
  const g = UI.getShotGuidance(white, angleToRed, 12, 0, 0, balls, BOUNDS);
  assert(g.targetRest !== null, 'targetRest present when a ball is hit');
  if (g.targetRest) {
    const sim = Physics.simulateTrajectory(white.x, white.y, angleToRed, 12, 0, 0, BOUNDS, balls);
    const lastHit = sim.hitPoints[sim.hitPoints.length - 1];
    assert(Math.abs(g.targetRest.x - lastHit.x) < 0.001 && Math.abs(g.targetRest.y - lastHit.y) < 0.001,
      'targetRest matches simulation target endpoint: (' + g.targetRest.x.toFixed(1) + ',' + g.targetRest.y.toFixed(1) + ')');
  }
}

console.log('5) First contact ballId matches the simulation hitBallId');
{
  const g = UI.getShotGuidance(white, angleToRed, 12, 0, 0, balls, BOUNDS);
  assert(g.firstContact !== null, 'firstContact present when a ball is hit');
  assert(g.firstContact && g.firstContact.ballId === g.hitBallId,
    'firstContact.ballId (' + (g.firstContact && g.firstContact.ballId) + ') === hitBallId (' + g.hitBallId + ')');
  assert(g.firstContact && g.firstContact.ballId === 'red', 'first contact is the red ball');
}

console.log('6) Cushion order is recorded in path order');
{
  // aim toward the top-left corner so the cue ball hits a cushion before any ball
  const angleToCushion = Math.atan2(BOUNDS.y - white.y, BOUNDS.x - white.x);
  const g = UI.getShotGuidance(white, angleToCushion, 25, 0, 0, balls, BOUNDS);
  assert(g.cushionOrder.length > 0, 'cushion-rich aim records at least one cushion: ' + g.cushionOrder.length);
  const sim = Physics.simulateTrajectory(white.x, white.y, angleToCushion, 25, 0, 0, BOUNDS, balls);
  const simCushions = sim.cuePoints.filter(p => p.type === 'cushion');
  assert(g.cushionOrder.length === simCushions.length,
    'cushionOrder count matches simulation: ' + g.cushionOrder.length + ' === ' + simCushions.length);
  for (let i = 0; i < g.cushionOrder.length; i++) {
    assert(Math.abs(g.cushionOrder[i].x - simCushions[i].x) < 0.001 &&
           Math.abs(g.cushionOrder[i].y - simCushions[i].y) < 0.001,
      'cushion #' + (i + 1) + ' matches simulation point');
  }
}

console.log('7) Spin sign conventions agree with physics (follow/draw + english)');
{
  const plain = UI.getShotGuidance(white, angleToRed, 12, 0, 0, balls, BOUNDS);
  const follow = UI.getShotGuidance(white, angleToRed, 12, 0, -0.7, balls, BOUNDS);
  const draw = UI.getShotGuidance(white, angleToRed, 12, 0, 0.7, balls, BOUNDS);
  // physics: spinY < 0 = follow (cue carries forward past the object ball)
  assert(follow.distance > plain.distance,
    'follow (spinY<0) travels further than plain: ' + plain.distance.toFixed(2) + ' < ' + follow.distance.toFixed(2));
  // physics: spinY > 0 = draw (cue pulls back, shorter net travel)
  assert(draw.distance < plain.distance,
    'draw (spinY>0) travels shorter than plain: ' + draw.distance.toFixed(2) + ' > ' + plain.distance.toFixed(2));

  // physics: spinX > 0 = right english, spinX < 0 = left english -> mirrored swerve
  const right = UI.getShotGuidance(white, angleToRed, 12, 0.7, 0, balls, BOUNDS);
  const left = UI.getShotGuidance(white, angleToRed, 12, -0.7, 0, balls, BOUNDS);
  const rightDx = right.cueRest.x - plain.cueRest.x;
  const leftDx = left.cueRest.x - plain.cueRest.x;
  assert(Math.abs(rightDx) > 0.5 && Math.abs(leftDx) > 0.5,
    'english shifts the cue rest position: right dx=' + rightDx.toFixed(1) + ', left dx=' + leftDx.toFixed(1));
  assert(Math.sign(rightDx) !== Math.sign(leftDx),
    'right vs left english swerve in opposite directions: ' + rightDx.toFixed(1) + ' vs ' + leftDx.toFixed(1));
}

console.log('');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);