'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8');
const ctx = vm.createContext({ Math, console });
const Physics = vm.runInContext(src + '\nPhysics;', ctx);

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

const WIDE = { x: 0, y: 0, width: 8000, height: 1000 };
const TABLE = { x: 62, y: 82, width: 776, height: 376 };

function runUntilStopped(balls, bounds, dt, maxSteps) {
  const allEvents = { ballHits: [], cushionHits: [] };
  let steps = 0;
  while (steps++ < (maxSteps || 40000)) {
    const ev = Physics.stepWorld(balls, bounds, dt);
    allEvents.ballHits.push(...ev.ballHits);
    allEvents.cushionHits.push(...ev.cushionHits);
    if (!balls.some(b => b.active && Physics.isMoving(b))) break;
  }
  return allEvents;
}

console.log('1) Rolling friction — constant deceleration, clean stop');
{
  const b = makeBall(100, 500, 'cue');
  Physics.applyShot(b, 0, 12, 0, 0);
  let lastSpeed = Infinity;
  let monotonic = true;
  let steps = 0;
  while (Physics.isMoving(b) && steps++ < 40000) {
    Physics.stepWorld([b], WIDE, 0.25);
    const s = Physics.speedOf(b);
    if (s > lastSpeed + 1e-9) monotonic = false;
    lastSpeed = s;
  }
  const dist = b.x - 100;
  assert(steps < 40000, 'ball comes to a full stop (' + steps + ' substeps)');
  assert(monotonic, 'deceleration is monotonic (no exponential tail)');
  assert(dist > 1200 && dist < 1700, 'roll distance plausible for power 12: ' + dist.toFixed(0) + 'px (theory ~1440)');
}

console.log('2) Framerate independence — same shot, different dt');
{
  function rollDistance(dt) {
    const b = makeBall(100, 500, 'cue');
    Physics.applyShot(b, 0, 15, 0, 0);
    runUntilStopped([b], WIDE, dt);
    return b.x;
  }
  const x1 = rollDistance(0.25);
  const x2 = rollDistance(0.5);
  const x3 = rollDistance(1);
  assert(Math.abs(x1 - x2) < 25, 'dt 0.25 vs 0.5 differ < 25px: ' + Math.abs(x1 - x2).toFixed(1));
  assert(Math.abs(x1 - x3) < 60, 'dt 0.25 vs 1.0 differ < 60px: ' + Math.abs(x1 - x3).toFixed(1));
}

console.log('3) Head-on collision — momentum, restitution, no pass-through');
{
  const cue = makeBall(100, 500, 'cue');
  const obj = makeBall(300, 500, 'red');
  Physics.applyShot(cue, 0, 15, 0, 0);
  let vBefore = 0;
  let momentumOk = false;
  let hitEvent = null;
  let steps = 0;
  while (steps++ < 40000 && (Physics.isMoving(cue) || Physics.isMoving(obj))) {
    vBefore = Physics.speedOf(cue);
    const ev = Physics.stepWorld([cue, obj], WIDE, 0.25);
    if (!hitEvent && ev.ballHits.length) {
      hitEvent = ev.ballHits[0];
      const sum = cue.vx + obj.vx;
      momentumOk = Math.abs(sum - vBefore) < 1.5;
    }
  }
  assert(!!hitEvent, 'collision registered');
  assert(momentumOk, 'momentum conserved through impact');
  assert(hitEvent && hitEvent.speed > 10, 'impact speed recorded: ' + (hitEvent ? hitEvent.speed.toFixed(1) : '-'));
  assert(obj.x > 600, 'object ball carried forward: ' + obj.x.toFixed(0));
  assert(cue.x < obj.x - 20, 'cue stays behind object (no pass-through): cue=' + cue.x.toFixed(0));
}

console.log('4) Throw effect — side spin alters object ball path');
{
  function cutShot(spinX) {
    const cue = makeBall(100, 500, 'cue');
    const obj = makeBall(300, 490, 'red');
    Physics.applyShot(cue, 0, 14, spinX, 0);
    runUntilStopped([cue, obj], WIDE, 0.25);
    return { x: obj.x, y: obj.y };
  }
  const noSpin = cutShot(0);
  const rightSpin = cutShot(1);
  const dy = Math.abs(rightSpin.y - noSpin.y) + Math.abs(rightSpin.x - noSpin.x);
  assert(dy > 1, 'side spin changes object ball endpoint by ' + dy.toFixed(1) + 'px');
  assert(noSpin.x > 300, 'cut shot moves object ball');
}

console.log('5) Cushion rebound — spin sign convention + tangential loss');
{
  function cushionVy(spinX) {
    const bounds = { x: 0, y: 0, width: 2000, height: 1000 };
    const b = makeBall(bounds.x + Physics.CONFIG.BALL_RADIUS + 2, 500, 'cue');
    b.vx = -8;
    b.spinX = spinX;
    let steps = 0;
    while (steps++ < 200) {
      const ev = Physics.stepWorld([b], bounds, 0.25);
      if (ev.cushionHits.length) return b.vy;
    }
    return null;
  }
  const vyRight = cushionVy(1);
  const vyLeft = cushionVy(-1);
  const vyNone = cushionVy(0);
  assert(vyRight > 0.2, 'right english on left cushion → +vy (' + vyRight.toFixed(2) + ')');
  assert(vyLeft < -0.2, 'left english on left cushion → -vy (' + vyLeft.toFixed(2) + ')');
  assert(Math.abs(vyNone) < 0.05, 'no spin → straight rebound (' + vyNone.toFixed(3) + ')');

  const bounds = { x: 0, y: 0, width: 2000, height: 1000 };
  const b = makeBall(bounds.x + Physics.CONFIG.BALL_RADIUS + 2, 500, 'cue');
  b.vx = -8;
  b.vy = 5;
  let steps = 0;
  while (steps++ < 200) {
    const ev = Physics.stepWorld([b], bounds, 0.25);
    if (ev.cushionHits.length) break;
  }
  assert(Math.abs(b.vy) < 5 && Math.abs(b.vy) > 3, 'tangential velocity reduced on cushion: 5 → ' + b.vy.toFixed(2));
}

console.log('6) Follow / draw — cue ball behaviour after contact');
{
  function cueFinalX(spinY) {
    const cue = makeBall(100, 500, 'cue');
    const obj = makeBall(250, 500, 'red');
    Physics.applyShot(cue, 0, 12, 0, spinY);
    runUntilStopped([cue, obj], WIDE, 0.25);
    return cue.x;
  }
  const xFollow = cueFinalX(-1);
  const xDraw = cueFinalX(1);
  const xPlain = cueFinalX(0);
  assert(xFollow > xPlain, 'follow carries cue past plain-shot rest: ' + xFollow.toFixed(0) + ' > ' + xPlain.toFixed(0));
  assert(xDraw < xPlain, 'draw pulls cue back vs plain shot: ' + xDraw.toFixed(0) + ' < ' + xPlain.toFixed(0));
  assert(xFollow - xDraw > 20, 'follow/draw spread is meaningful: ' + (xFollow - xDraw).toFixed(0) + 'px');
}

console.log('7) Tunneling — max power still collides');
{
  const cue = makeBall(100, 500, 'cue');
  const obj = makeBall(400, 500, 'red');
  Physics.applyShot(cue, 0, Physics.CONFIG.MAX_POWER, 0, 0);
  const ev = runUntilStopped([cue, obj], WIDE, 0.25);
  assert(ev.ballHits.length > 0, 'max-power shot registers ball hit');
  assert(obj.x > 400, 'object ball displaced: ' + obj.x.toFixed(0));
}

console.log('8) Simulation parity — simulateFullShot matches live engine');
{
  const angle = Math.atan2(260 - 200, 500 - 200);
  const power = 14;
  const spinX = 0.3;
  const spinY = -0.4;

  const cue0 = makeBall(200, 200, 'white');
  const red0 = makeBall(500, 260, 'red');
  const trajs = Physics.simulateFullShot(cue0, angle, power, spinX, spinY, [cue0, red0], TABLE, 800);
  const simCueTraj = trajs.find(t => t.isCue);
  const simEnd = simCueTraj.points[simCueTraj.points.length - 1];

  const cueLive = makeBall(200, 200, 'white');
  const redLive = makeBall(500, 260, 'red');
  Physics.applyShot(cueLive, angle, power, spinX, spinY);
  runUntilStopped([cueLive, redLive], TABLE, 0.25);

  const d = Math.hypot(cueLive.x - simEnd.x, cueLive.y - simEnd.y);
  assert(d < 10, 'live vs simulated cue rest position within 10px: ' + d.toFixed(1) + 'px');

  const traj2 = Physics.simulateTrajectory(200, 200, angle, power, spinX, spinY, TABLE, [cue0, red0], 600);
  assert(traj2.hitBallId === 'red', 'trajectory preview reports first ball hit: ' + traj2.hitBallId);
  const last = traj2.cuePoints[traj2.cuePoints.length - 1];
  const d2 = Math.hypot(cueLive.x - last.x, cueLive.y - last.y);
  assert(d2 < 12, 'trajectory preview endpoint matches live engine: ' + d2.toFixed(1) + 'px');
}

console.log('9) Physics.CONFIG — every motion/collision constant exposed');
{
  const EXPECTED = {
    BALL_RADIUS: 12, MAX_POWER: 30, MIN_VELOCITY: 0.04,
    ROLL_DECEL: 0.05, SLIDE_DECEL: 0.13, SLIDE_SPIN_THRESHOLD: 0.05,
    FOLLOW_ACCEL: 0.48, IN_FLIGHT_SPIN_SCALE: 0.38,
    SPIN_Y_DECAY_AIR: 0.992, SPIN_Y_DECAY_CONTACT: 0.90,
    SPIN_X_DECAY: 0.986, SWERVE: 0.075,
    REST_LOW: 0.95, REST_HIGH: 0.87, REST_VREF: 22,
    BALL_FRICTION: 0.08, SPIN_SURFACE: 6,
    CUSHION_REST_LOW: 0.82, CUSHION_REST_HIGH: 0.70, CUSHION_REST_VREF: 20,
    CUSHION_T_KEEP: 0.88, CUSHION_SPIN_EFFECT: 0.90, CUSHION_SPIN_VREF: 12,
    CUSHION_SPIN_KEEP: 0.72
  };
  const cfg = Physics.CONFIG;
  const keys = Object.keys(EXPECTED);
  const missing = keys.filter(k => !(k in (cfg || {})));
  const changed = keys.filter(k => (cfg || {})[k] !== EXPECTED[k]);
  assert(!!cfg && typeof cfg === 'object', 'Physics.CONFIG exists and is an object');
  assert(missing.length === 0, 'all ' + keys.length + ' constants exposed via CONFIG' + (missing.length ? ' (missing ' + missing.join(',') + ')' : ''));
  assert(changed.length === 0, 'all ' + keys.length + ' constant values unchanged' + (changed.length ? ' (changed ' + changed.join(',') + ')' : ''));
  assert(Physics.BALL_RADIUS === undefined && Physics.MAX_POWER === undefined && Physics.ROLL_DECEL === undefined, 'legacy top-level constant exports removed (single CONFIG surface)');
}

console.log('10) Deterministic benchmarks — roll, stop, rebound, spin, follow/draw');
{
  // roll distance (power 12, straight, no spin)
  {
    const b = makeBall(100, 500, 'cue');
    Physics.applyShot(b, 0, 12, 0, 0);
    runUntilStopped([b], WIDE, 0.25);
    const dist = b.x - 100;
    assert(Math.abs(dist - 1438.48125) < 0.5, 'BENCHMARK roll_distance = ' + dist.toFixed(4) + ' px (pin 1438.4813 ± 0.5)');
  }

  // stop time (substeps to rest)
  {
    const b = makeBall(100, 500, 'cue');
    Physics.applyShot(b, 0, 12, 0, 0);
    let steps = 0;
    while (steps++ < 40000) {
      Physics.stepWorld([b], WIDE, 0.25);
      if (!Physics.isMoving(b)) break;
    }
    assert(steps === 957, 'BENCHMARK stop_time = ' + steps + ' substeps (pin 957)');
  }

  // rebound ratio (cushion restitution coefficient at impact speed)
  {
    const bounds = { x: 0, y: 0, width: 2000, height: 1000 };
    const b = makeBall(bounds.x + Physics.CONFIG.BALL_RADIUS + 2, 500, 'cue');
    b.vx = -8;
    let ratio = null;
    for (let s = 0; s < 200; s++) {
      const ev = Physics.stepWorld([b], bounds, 0.25);
      if (ev.cushionHits.length) { ratio = b.vx / ev.cushionHits[0].speed; break; }
    }
    assert(ratio !== null && Math.abs(ratio - 0.77215) < 0.0005, 'BENCHMARK rebound_ratio = ' + (ratio || 0).toFixed(6) + ' (pin 0.772150 ± 0.0005)');
  }

  // side-spin lateral displacement (spinX=1, power 10)
  {
    const b = makeBall(100, 500, 'cue');
    Physics.applyShot(b, 0, 10, 1, 0);
    runUntilStopped([b], WIDE, 0.25);
    const disp = b.y - 500;
    assert(Math.abs(disp - 281.047055) < 0.5, 'BENCHMARK side_spin_displacement = ' + disp.toFixed(4) + ' px (pin 281.0471 ± 0.5)');
  }

  // follow/draw spread (spinY -1 vs +1)
  {
    function cueFinalX(spinY) {
      const cue = makeBall(100, 500, 'cue');
      const obj = makeBall(250, 500, 'red');
      Physics.applyShot(cue, 0, 12, 0, spinY);
      runUntilStopped([cue, obj], WIDE, 0.25);
      return cue.x;
    }
    const spread = cueFinalX(-1) - cueFinalX(1);
    assert(Math.abs(spread - 60.104667) < 0.5, 'BENCHMARK follow_draw_spread = ' + spread.toFixed(4) + ' px (pin 60.1047 ± 0.5)');
  }
}

console.log('11) Corner cushion — diagonal hit resolves both axes, no NaN');
{
  const bounds = { x: 0, y: 0, width: 1000, height: 1000 };
  const b = makeBall(Physics.CONFIG.BALL_RADIUS + 2, Physics.CONFIG.BALL_RADIUS + 2, 'cue');
  b.vx = -8; b.vy = -8;
  let hits = 0, nan = false, steps = 0;
  while (steps++ < 50 && hits === 0) {
    hits = Physics.stepWorld([b], bounds, 0.25).cushionHits.length;
    if (!isFinite(b.vx) || !isFinite(b.vy)) nan = true;
  }
  assert(hits === 2, 'corner hit resolves exactly 2 cushion events (one per axis): ' + hits);
  assert(!nan, 'no NaN/Infinity in corner rebound');
  assert(b.x >= bounds.x - 1e-9 && b.y >= bounds.y - 1e-9, 'ball clamped inside bounds after corner rebound');
  assert(b.vx > 0 && b.vy > 0, 'both axes rebound away from corner (vx=' + b.vx.toFixed(2) + ', vy=' + b.vy.toFixed(2) + ')');
}

console.log('12) Near-overlap separation — no ball stays overlapped');
{
  const a = makeBall(100, 500, 'a');
  const b = makeBall(115, 500, 'b'); // 15px apart -> 9px overlap
  Physics.stepWorld([a, b], WIDE, 0.25);
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  assert(d >= 24 - 1e-9, 'small overlap separated to minDist: ' + d.toFixed(4));

  const c = makeBall(300, 500, 'c');
  const d2 = makeBall(300, 500, 'd'); // coincident centres
  Physics.stepWorld([c, d2], WIDE, 0.25);
  const d3 = Math.hypot(c.x - d2.x, c.y - d2.y);
  assert(d3 >= 24 - 1e-9, 'coincident balls separated to minDist: ' + d3.toFixed(4));
  assert(isFinite(c.x) && isFinite(c.y) && isFinite(d2.x) && isFinite(d2.y), 'no NaN from coincident separation');
}

console.log('13) Simultaneous & ordered (chained) contacts');
{
  function doubleHit() {
    const cue = makeBall(100, 500, 'cue');
    const o1 = makeBall(250, 494, 'o1');
    const o2 = makeBall(250, 506, 'o2');
    Physics.applyShot(cue, 0, 14, 0, 0);
    let hits = 0, steps = 0;
    while (steps++ < 40000 && [cue, o1, o2].some(x => Physics.isMoving(x))) {
      hits += Physics.stepWorld([cue, o1, o2], WIDE, 0.25).ballHits.length;
    }
    return { o1x: o1.x, o1y: o1.y, o2x: o2.x, o2y: o2.y, hits, d: Math.hypot(o1.x - o2.x, o1.y - o2.y) };
  }
  const r1 = doubleHit(); const r2 = doubleHit();
  assert(r1.hits >= 2, 'double hit registers >= 2 contacts: ' + r1.hits);
  assert(r1.o1x === r2.o1x && r1.o1y === r2.o1y && r1.o2x === r2.o2x && r1.o2y === r2.o2y, 'simultaneous contact is deterministic across runs');
  assert(r1.o1x > 250 && r1.o2x > 250, 'both object balls displaced forward');
  assert(r1.d >= 24 - 1e-9, 'no object overlap after simultaneous contact: ' + r1.d.toFixed(2));

  function chain() {
    const cue = makeBall(100, 500, 'cue');
    const A = makeBall(250, 500, 'A');
    const B = makeBall(400, 500, 'B');
    Physics.applyShot(cue, 0, 14, 0, 0);
    const order = [];
    let steps = 0;
    while (steps++ < 40000 && [cue, A, B].some(x => Physics.isMoving(x))) {
      for (const h of Physics.stepWorld([cue, A, B], WIDE, 0.25).ballHits) order.push(h.aId + '>' + h.bId);
    }
    return { order, Bx: B.x, Ax: A.x };
  }
  const ch = chain();
  assert(ch.order.length >= 2, 'chained contact resolves both links: ' + ch.order.join(','));
  assert(ch.order.indexOf('A>B') >= 0, 'second link (A>B) propagated after first contact');
  assert(ch.Bx > ch.Ax, 'third ball carried forward by chain: B=' + ch.Bx.toFixed(0) + ' > A=' + ch.Ax.toFixed(0));
}

console.log('14) High-speed tunneling — max power + follow still collides');
{
  const cue = makeBall(100, 500, 'cue');
  const obj = makeBall(130, 500, 'red'); // 6px clear gap
  Physics.applyShot(cue, 0, Physics.CONFIG.MAX_POWER, 0, -1); // follow caps speed at 36 px/frame
  let hits = 0, nan = false;
  for (let s = 0; s < 40; s++) {
    hits += Physics.stepWorld([cue, obj], WIDE, 0.25).ballHits.length;
    if (!isFinite(cue.x) || !isFinite(obj.x)) { nan = true; break; }
    if (!Physics.isMoving(cue) && !Physics.isMoving(obj)) break;
  }
  assert(hits > 0, 'max-speed follow shot registers ball hit (no tunneling)');
  assert(!nan, 'no NaN/Infinity in high-speed collision');
  assert(obj.x > 130, 'object ball displaced: ' + obj.x.toFixed(0));
}

console.log('15) Tangential throw — deterministic object deflection');
{
  function cutEndY(spinX) {
    const cue = makeBall(100, 500, 'cue');
    const obj = makeBall(300, 490, 'red');
    Physics.applyShot(cue, 0, 14, spinX, 0);
    runUntilStopped([cue, obj], WIDE, 0.25);
    return obj.y;
  }
  const y0 = cutEndY(0), yR = cutEndY(1), yL = cutEndY(-1);
  assert(Math.abs(y0 - 16.110229) < 0.5, 'BENCHMARK throw_no_spin = ' + y0.toFixed(4) + ' (pin 16.1102 ± 0.5)');
  assert(Math.abs(yR - 28.566826) < 0.5, 'BENCHMARK throw_right = ' + yR.toFixed(4) + ' (pin 28.5668 ± 0.5)');
  assert(Math.abs(yL - 62.424693) < 0.5, 'BENCHMARK throw_left = ' + yL.toFixed(4) + ' (pin 62.4247 ± 0.5)');
  assert(yR !== y0 && yL !== y0 && yR !== yL, 'right/left english produce distinct throw deflections');
}

console.log('16) Side-spin rebound signs — all four cushions');
{
  function hitOnce(b, bounds) {
    for (let s = 0; s < 200; s++) { const ev = Physics.stepWorld([b], bounds, 0.25); if (ev.cushionHits.length) return b; }
    return null;
  }
  function rightCushion(spinX) {
    const bounds = { x: 0, y: 0, width: 2000, height: 1000 };
    const b = makeBall(bounds.width - Physics.CONFIG.BALL_RADIUS - 2, 500, 'cue'); b.vx = 8; b.spinX = spinX;
    return hitOnce(b, bounds);
  }
  function topCushion(spinX) {
    const bounds = { x: 0, y: 0, width: 1000, height: 2000 };
    const b = makeBall(500, Physics.CONFIG.BALL_RADIUS + 2, 'cue'); b.vy = -8; b.spinX = spinX;
    return hitOnce(b, bounds);
  }
  function bottomCushion(spinX) {
    const bounds = { x: 0, y: 0, width: 1000, height: 2000 };
    const b = makeBall(500, bounds.height - Physics.CONFIG.BALL_RADIUS - 2, 'cue'); b.vy = 8; b.spinX = spinX;
    return hitOnce(b, bounds);
  }
  const rR = rightCushion(1), rL = rightCushion(-1);
  const tR = topCushion(1), tL = topCushion(-1);
  const bR = bottomCushion(1), bL = bottomCushion(-1);
  assert(rR.vy < -0.2 && rL.vy > 0.2, 'right cushion: +spin -> -vy (' + rR.vy.toFixed(2) + '), -spin -> +vy (' + rL.vy.toFixed(2) + ')');
  assert(tR.vx > 0.2 && tL.vx < -0.2, 'top cushion: +spin -> +vx (' + tR.vx.toFixed(2) + '), -spin -> -vx (' + tL.vx.toFixed(2) + ')');
  assert(bR.vx < -0.2 && bL.vx > 0.2, 'bottom cushion: +spin -> -vx (' + bR.vx.toFixed(2) + '), -spin -> +vx (' + bL.vx.toFixed(2) + ')');
}

console.log('17) Follow / draw after contact — spinY stays with cue');
{
  const cue = makeBall(100, 500, 'cue');
  const obj = makeBall(250, 500, 'red');
  Physics.applyShot(cue, 0, 12, 0, -1); // follow
  runUntilStopped([cue, obj], WIDE, 0.25);
  assert(obj.x > 250, 'object ball carried forward after follow contact: ' + obj.x.toFixed(0));
  assert(obj.spinY === 0, 'object ball receives no spinY transfer (follow)');

  const cue2 = makeBall(100, 500, 'cue2');
  const obj2 = makeBall(250, 500, 'red2');
  Physics.applyShot(cue2, 0, 12, 0, 1); // draw
  runUntilStopped([cue2, obj2], WIDE, 0.25);
  assert(cue2.x < obj2.x - 20, 'draw cue stays behind object (no pass-through): cue=' + cue2.x.toFixed(0));
  assert(obj2.spinY === 0, 'object ball receives no spinY transfer (draw)');
}

console.log('18) Stopping with residual spin — clean rest, no creep');
{
  const cue = makeBall(100, 500, 'cue');
  const obj = makeBall(250, 500, 'red');
  Physics.applyShot(cue, 0, 12, 0, 1); // draw leaves residual spinY
  runUntilStopped([cue, obj], WIDE, 0.25);
  const restX = cue.x;
  for (let s = 0; s < 20; s++) Physics.stepWorld([cue, obj], WIDE, 0.25);
  assert(Math.abs(cue.x - restX) < 1e-6, 'no post-rest creep (drift 0)');
  assert(cue.spinY === 0, 'residual spin fully decayed at rest');
  assert(!Physics.isMoving(cue), 'ball reported stopped at rest');
}

console.log('19) Contact invariants — no NaN, no overlap, no duplicate cushions');
{
  const bounds = { x: 0, y: 0, width: 2000, height: 1000 };
  const b = makeBall(bounds.x + Physics.CONFIG.BALL_RADIUS + 2, 500, 'cue');
  b.vx = -8;
  let total = 0;
  for (let s = 0; s < 10; s++) total += Physics.stepWorld([b], bounds, 0.25).cushionHits.length;
  assert(total === 1, 'straight cushion hit produces exactly 1 event over 10 substeps (no duplicate): ' + total);
  assert(b.vx > 0, 'ball rebounds away and does not re-trigger the same cushion');

  const cue = makeBall(100, 500, 'cue');
  const obj = makeBall(300, 500, 'red');
  Physics.applyShot(cue, 0, 15, 0, 0);
  runUntilStopped([cue, obj], WIDE, 0.25);
  const d = Math.hypot(cue.x - obj.x, cue.y - obj.y);
  assert(d >= 24 - 1e-9, 'no residual overlap after resolved collision: ' + d.toFixed(2));
  assert(isFinite(cue.x) && isFinite(obj.x), 'no NaN/Infinity after full collision sequence');
}

console.log('20) Shared simulation horizon — derived horizon reaches stable rest');
{
  const angle = Math.PI * 0.25 + 0.13;
  const power = Physics.CONFIG.MAX_POWER;
  const startX = 200, startY = 300;

  // (a) live reference: substeps to full rest + rest position
  const live = makeBall(startX, startY, 'white');
  Physics.applyShot(live, angle, power, 0, 0);
  let liveSteps = 0;
  while (liveSteps++ < 40000) {
    Physics.stepWorld([live], TABLE, 0.25);
    if (!Physics.isMoving(live)) break;
  }
  const rest = { x: live.x, y: live.y };
  assert(liveSteps === 926, 'BENCHMARK long_shot_stop_steps = ' + liveSteps + ' substeps (pin 926)');

  // (b) old fixed horizon (400 substeps = the replay cap) truncates the shot
  const probe = makeBall(startX, startY, 'white');
  Physics.applyShot(probe, angle, power, 0, 0);
  for (let s = 0; s < 400; s++) Physics.stepWorld([probe], TABLE, 0.25);
  assert(liveSteps > 400, 'live shot needs more than the old 400-step cap: ' + liveSteps + ' substeps');
  assert(Physics.isMoving(probe), 'old 400-step horizon stops while the ball is still moving (bug demonstrated)');

  // (c) derived horizon (no maxSteps) reaches stable rest — full-shot parity
  const cue = makeBall(startX, startY, 'white');
  const trajs = Physics.simulateFullShot(cue, angle, power, 0, 0, [cue], TABLE);
  const cueTraj = trajs.find(t => t.isCue);
  assert(!!cueTraj, 'derived-horizon full shot returns a cue trajectory');
  if (cueTraj) {
    const end = cueTraj.points[cueTraj.points.length - 1];
    const d = Math.hypot(rest.x - end.x, rest.y - end.y);
    assert(d < 12, 'full-shot endpoint reaches live rest within 12px: ' + d.toFixed(1) + 'px');
  }

  // (d) derived horizon (no maxSteps) reaches stable rest — trajectory parity
  const traj = Physics.simulateTrajectory(startX, startY, angle, power, 0, 0, TABLE, [cue]);
  const last = traj.cuePoints[traj.cuePoints.length - 1];
  const d2 = Math.hypot(rest.x - last.x, rest.y - last.y);
  assert(d2 < 12, 'trajectory endpoint reaches live rest within 12px: ' + d2.toFixed(1) + 'px');

  // (e) horizon is a deterministic function of the inputs and covers the shot
  const h = Physics.computeSimulationHorizon(power, 0, 0, TABLE);
  assert(h === 4808, 'BENCHMARK long_shot_horizon = ' + h + ' substeps (pin 4808)');
  assert(typeof h === 'number' && h >= liveSteps, 'derived horizon ' + h + ' covers live stop ' + liveSteps);
  const hLow = Physics.computeSimulationHorizon(5, 0, 0, TABLE);
  const hHigh = Physics.computeSimulationHorizon(30, 0, 0, TABLE);
  assert(hLow < hHigh, 'horizon grows with power: ' + hLow + ' < ' + hHigh);

  // (f) shared-simulation constants are exposed through CONFIG
  assert(Physics.CONFIG.SIM_STEP === 0.25, 'CONFIG.SIM_STEP === 0.25');
  assert(Physics.CONFIG.MAX_SIM_STEPS > 0, 'CONFIG.MAX_SIM_STEPS is a positive safety cap');
}

console.log('');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
