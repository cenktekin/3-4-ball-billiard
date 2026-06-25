const Challenge = (() => {
  'use strict';

  const CHALLENGES = [
    {
      id: 'double',
      name: { tr: 'Cift Top', en: 'Double Hit' },
      desc: { tr: 'Tek vurusla iki topa da deg', en: 'Hit both balls with one shot' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 150, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width / 2, cy - 30, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width / 2, cy + 30, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'bank1',
      name: { tr: 'Ilk Bant', en: 'First Cushion' },
      desc: { tr: 'Topa carpmadan once bir banttan sektir', en: 'Hit a cushion before hitting the ball' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 200, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 200, cy - 80, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 200, cy + 80, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.firstHitType === 'cushion' && gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'longshot',
      name: { tr: 'Uzun Vurus', en: 'Long Shot' },
      desc: { tr: 'Masanin bir ucundan digerine', en: 'From one end to the other' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 60, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 60, cy - 20, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 60, cy + 20, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'threeband',
      name: { tr: '3 Bant', en: '3 Cushions' },
      desc: { tr: '3 bant + iki topa degis', en: '3 cushions + hit both balls' },
      mode: '3cushion',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 100, cy + 100, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 100, cy - 100, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 150, cy + 50, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.cushionHits >= 3 && gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'corner',
      name: { tr: 'Kose Atisi', en: 'Corner Shot' },
      desc: { tr: 'Koseye nişan al, hedef topa deg', en: 'Aim at corner, hit target' },
      mode: '4ball',
      setup: (bounds) => {
        const white = new Ball.Ball(bounds.x + 60, bounds.y + 60, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 60, bounds.y + bounds.height - 60, '#FFD700', 'yellow');
        const red1 = new Ball.Ball(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, '#CC0000', 'red1');
        const red2 = new Ball.Ball(bounds.x + bounds.width / 2 + 50, bounds.y + bounds.height / 2 + 30, '#CC0000', 'red2');
        return { balls: [white, yellow, red1, red2], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'spinbank',
      name: { tr: 'Spin + Bant', en: 'Spin + Cushion' },
      desc: { tr: 'Spin kullanarak banttan sektir', en: 'Use spin to bounce off cushion' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + bounds.width / 2, cy + 120, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 80, cy, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 80, cy - 60, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.cushionHits >= 1 && gs.ballsHitThisShot.size >= 2
    }
  ];

  let currentChallenge = CHALLENGES[0];
  let challengeIndex = 0;

  function getChallenges() { return CHALLENGES; }
  function getCurrentChallenge() { return currentChallenge; }
  function getChallengeIndex() { return challengeIndex; }

  function selectChallenge(index) {
    if (index >= 0 && index < CHALLENGES.length) {
      challengeIndex = index;
      currentChallenge = CHALLENGES[index];
      return true;
    }
    return false;
  }

  function setupChallenge() {
    if (!currentChallenge) {
      currentChallenge = CHALLENGES[0];
      challengeIndex = 0;
    }
    const bounds = Table.getBounds();
    return currentChallenge.setup(bounds);
  }

  function validateChallenge(gameState) {
    if (!currentChallenge) return false;
    return currentChallenge.validate(gameState);
  }

  function nextChallenge() {
    challengeIndex = (challengeIndex + 1) % CHALLENGES.length;
    currentChallenge = CHALLENGES[challengeIndex];
    return currentChallenge;
  }

  function prevChallenge() {
    challengeIndex = (challengeIndex - 1 + CHALLENGES.length) % CHALLENGES.length;
    currentChallenge = CHALLENGES[challengeIndex];
    return currentChallenge;
  }

  return {
    getChallenges, getCurrentChallenge, getChallengeIndex,
    selectChallenge, setupChallenge, validateChallenge,
    nextChallenge, prevChallenge
  };
})();
