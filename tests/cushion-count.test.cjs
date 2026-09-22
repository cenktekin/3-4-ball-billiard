'use strict';
// ============================================================================
// tests/cushion-count.test.cjs — 3-bant sayaci regresyon testi
//
// Kural: 3-bant modunda sadece ISTEKA topunun bant temaslari sayilir.
// Rakip toplarin banda carpmasi sayaci artirmamalidir.
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gameSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const mode3ballSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'mode3ball.js'), 'utf8');

const gameCtx = vm.createContext({ Math, console });
const GameState = vm.runInContext(gameSrc + '\nGameState;', gameCtx);

const modeCtx = vm.createContext({
  Math, console,
  Table: { getBounds: () => ({ x: 62, y: 82, width: 776, height: 376 }) },
  Ball: { Ball: function (x, y, color, id) { return { x, y, color, id }; } },
  I18n: { t: (k) => k }
});
const Mode3Ball = vm.runInContext(mode3ballSrc + '\nMode3Ball;', modeCtx);

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS  ' + msg); }
  else { failed++; console.log('  FAIL  ' + msg); }
}

function makeShotState(cushionHits, hitIds) {
  return {
    balls: [{ id: 'white' }, { id: 'yellow' }, { id: 'red' }],
    ballsHitThisShot: new Set(hitIds),
    cushionHits,
    p1Score: 0, p2Score: 0, score: 0, count: 0,
    cueBall: { id: 'white' }, selectedBallId: 'white'
  };
}

console.log('1) recordCushionHit — sadece isteka topu sayilir');
{
  const gs = new GameState.GameState();
  gs.startShot();
  assert(gs.cushionHits === 0, 'vurus basinda sayac sifirlanir');
  gs.recordCushionHit('white', 'white');
  gs.recordCushionHit('white', 'white');
  gs.recordCushionHit('white', 'white');
  assert(gs.cushionHits === 3, 'isteka topunun 3 bandi sayilir (3)');
}
{
  const gs = new GameState.GameState();
  gs.startShot();
  gs.recordCushionHit('yellow', 'white');
  gs.recordCushionHit('red', 'white');
  gs.recordCushionHit('yellow', 'white');
  assert(gs.cushionHits === 0, 'rakip toplarin bantlari sayilmaz (0)');
}
{
  const gs = new GameState.GameState();
  gs.startShot();
  gs.recordCushionHit('white', 'white');
  gs.recordCushionHit('yellow', 'white');
  gs.recordCushionHit('white', 'white');
  gs.recordCushionHit('red', 'white');
  assert(gs.cushionHits === 2, 'karisik sirada sadece isteka sayilir (2)');
}
{
  const gs = new GameState.GameState();
  gs.turnActive = false;
  gs.recordCushionHit('white', 'white');
  assert(gs.cushionHits === 0, 'vurus disi temas sayilmaz');
}

console.log('2) evaluateShot(3bant) — 3 bant + iki top sarti');
{
  const ok = Mode3Ball.evaluateShot(makeShotState(3, ['yellow', 'red']), true);
  assert(ok.scored === true, '3 bant + iki top = sayi');
  const few = Mode3Ball.evaluateShot(makeShotState(2, ['yellow', 'red']), true);
  assert(few.scored === false, '2 bant + iki top = sayi DEGIL');
  const zero = Mode3Ball.evaluateShot(makeShotState(0, ['yellow', 'red']), true);
  assert(zero.scored === false, '0 bant + iki top = sayi DEGIL (eski hata)');
  const oneBall = Mode3Ball.evaluateShot(makeShotState(5, ['yellow']), true);
  assert(oneBall.scored === false, '5 bant + tek top = sayi DEGIL');
}

console.log('');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
