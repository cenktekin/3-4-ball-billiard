const Challenge = (() => {
  'use strict';

  // All challenges use standard table bounds (Table.getBounds() = 776x376 playable).
  // No custom small bounds are introduced — every setup derives positions from
  // bounds.x / bounds.y / bounds.width / bounds.height so the preview and the
  // in-game table are always the same standard size as normal mode.

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
    },
    {
      id: 'thin_cut',
      name: { tr: 'Ince Kesme', en: 'Thin Cut' },
      desc: { tr: 'Toplar neredeyse temas halinde, ince kenar vurusuyla puanla', en: 'Balls almost touching, score with a precise thin edge hit' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 120, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 140, cy - 8, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 115, cy + 8, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'kiss_avoid',
      name: { tr: 'Opucukten Kacis', en: 'Kiss Escape' },
      desc: { tr: 'Sari top yolda, opucukten kacinarak kirmiziya ulas', en: 'Yellow blocks the path, reach red while avoiding a kiss' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 150, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + 380, cy, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + 600, cy + 25, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'fourball_master',
      name: { tr: 'Dort Top Ustasi', en: '4-Ball Master' },
      desc: { tr: 'Tek vurusla uc hedef topa da deg', en: 'Hit all three object balls with one shot' },
      mode: '4ball',
      setup: (bounds) => {
        const white = new Ball.Ball(bounds.x + 60, bounds.y + 60, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 80, bounds.y + 80, '#FFD700', 'yellow');
        const red1 = new Ball.Ball(bounds.x + bounds.width / 2, bounds.y + bounds.height - 80, '#CC0000', 'red1');
        const red2 = new Ball.Ball(bounds.x + bounds.width - 150, cyOf(bounds), '#CC0000', 'red2');
        return { balls: [white, yellow, red1, red2], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 3
    },
    {
      id: 'double_cushion',
      name: { tr: 'Cift Bant', en: 'Double Cushion' },
      desc: { tr: 'Topa degmeden once iki banttan sektir', en: 'Hit two cushions before touching a ball' },
      mode: '3cushion',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 200, cy + 100, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 120, cy - 90, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 120, cy + 90, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.cushionHits >= 2 && gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'masse_spin',
      name: { tr: 'Falso Cambazi', en: 'Spin Wizard' },
      desc: { tr: 'Engel top dogrudan yolda, yan spinle kivrilarak gec', en: 'A blocker sits in the path, curve around it with side spin' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 150, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + 380, cy, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + 600, cy - 60, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.cushionHits >= 1 && gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'cluster',
      name: { tr: 'Kume Dagitma', en: 'Cluster Break' },
      desc: { tr: 'Merkezdeki kumeyi tek vurusla dagit', en: 'Break the tight cluster in the center' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 80, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width / 2 - 30, cy - 20, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width / 2 + 30, cy + 20, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'rail_shot',
      name: { tr: 'Bant Dibinde', en: 'Rail Shot' },
      desc: { tr: 'Toplar bant dibinde, zor acili vurus', en: 'Balls frozen near the cushion, a tough angled shot' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 100, bounds.y + 15, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + bounds.width - 100, bounds.y + 15, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + bounds.width - 100, cy, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    },
    {
      id: 'soft_touch',
      name: { tr: 'Hassas Dokunus', en: 'Soft Touch' },
      desc: { tr: 'Toplar cok yakin, yumusak ve kontrollu vurus gerek', en: 'Balls are very close, requires soft controlled power' },
      mode: '3ball',
      setup: (bounds) => {
        const cy = bounds.y + bounds.height / 2;
        const white = new Ball.Ball(bounds.x + 150, cy, '#FFFFFF', 'white');
        const yellow = new Ball.Ball(bounds.x + 230, cy - 20, '#FFD700', 'yellow');
        const red = new Ball.Ball(bounds.x + 230, cy + 20, '#CC0000', 'red');
        return { balls: [white, yellow, red], cueBall: white };
      },
      validate: (gs) => gs.ballsHitThisShot.size >= 2
    }
  ];

  function cyOf(bounds) {
    return bounds.y + bounds.height / 2;
  }

  let currentChallenge = CHALLENGES[0];
  let challengeIndex = 0;
  // Stores the last exact setup so a failed attempt can be repeated identically.
  let lastSetupSnapshot = null; // { balls: [{x,y,id,color}], cueId }

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
    const setup = currentChallenge.setup(bounds);
    storeSnapshot(setup);
    return setup;
  }

  function storeSnapshot(setup) {
    lastSetupSnapshot = {
      balls: setup.balls.map(b => ({ x: b.x, y: b.y, id: b.id, color: b.color })),
      cueId: setup.cueBall ? setup.cueBall.id : null
    };
  }

  function repeatLastSetup() {
    if (!lastSetupSnapshot) return setupChallenge();
    const bounds = Table.getBounds();
    const balls = lastSetupSnapshot.balls.map(b => new Ball.Ball(b.x, b.y, b.color, b.id));
    const cueBall = balls.find(b => b.id === lastSetupSnapshot.cueId) || balls[0];
    return { balls, cueBall };
  }

  function setupChallengeVariant() {
    const base = setupChallenge();
    const bounds = Table.getBounds();
    const radius = Physics.CONFIG.BALL_RADIUS;
    const minX = bounds.x + radius;
    const maxX = bounds.x + bounds.width - radius;
    const minY = bounds.y + radius;
    const maxY = bounds.y + bounds.height - radius;

    const cx = base.balls.reduce((s, b) => s + b.x, 0) / base.balls.length;
    const cy = base.balls.reduce((s, b) => s + b.y, 0) / base.balls.length;

    let dx = (Math.random() - 0.5) * 100;
    let dy = (Math.random() - 0.5) * 80;
    const shiftX = Math.max(minX - cx, Math.min(maxX - cx, dx));
    const shiftY = Math.max(minY - cy, Math.min(maxY - cy, dy));

    const minDist = 2 * radius + 4;
    let placed = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      placed = base.balls.map(b => {
        const x = Math.max(minX, Math.min(maxX, b.x + shiftX + (Math.random() - 0.5) * 36));
        const y = Math.max(minY, Math.min(maxY, b.y + shiftY + (Math.random() - 0.5) * 36));
        return { x, y, id: b.id, color: b.color };
      });
      let overlap = false;
      for (let i = 0; i < placed.length && !overlap; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const ddx = placed[i].x - placed[j].x;
          const ddy = placed[i].y - placed[j].y;
          if (ddx * ddx + ddy * ddy < minDist * minDist) { overlap = true; break; }
        }
      }
      if (!overlap) break;
    }

    const balls = placed.map(p => new Ball.Ball(p.x, p.y, p.color, p.id));
    const cueBall = balls.find(b => b.id === base.cueBall.id) || balls[0];
    return { balls, cueBall };
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
    setupChallengeVariant, repeatLastSetup,
    nextChallenge, prevChallenge
  };
})();
