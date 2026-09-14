(() => {
  'use strict';

  const chalkParticles = [];
  let chalkActive = false;
  let chalkTimer = 0;

  const confettiParticles = [];
  let confettiActive = false;

  function triggerConfetti() {
    confettiActive = true;
    confettiParticles.length = 0;
    const colors = ['#FFD700', '#4CAF50', '#FF5722', '#2196F3', '#E91E63', '#9C27B0'];
    for (let i = 0; i < 80; i++) {
      confettiParticles.push({
        x: 450 + (Math.random() - 0.5) * 100,
        y: 290 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
  }

  function updateConfetti(dt) {
    if (!confettiActive) return;
    let anyAlive = false;
    for (const p of confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.rot += p.rotSpeed;
      p.life -= 0.008;
      if (p.life > 0) anyAlive = true;
    }
    if (!anyAlive) confettiActive = false;
  }

  function drawConfetti(ctx) {
    if (!confettiActive) return;
    for (const p of confettiParticles) {
      if (p.life <= 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
  }

  function triggerChalk(x, y) {
    chalkActive = true;
    chalkTimer = 300;
    chalkParticles.length = 0;
    for (let i = 0; i < 12; i++) {
      chalkParticles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        life: 1,
        size: Math.random() * 3 + 1
      });
    }
  }

  function updateChalk(dt) {
    if (!chalkActive) return;
    chalkTimer -= dt;
    if (chalkTimer <= 0) {
      chalkActive = false;
      return;
    }
    for (const p of chalkParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 0.03;
    }
  }

  function drawChalk(ctx) {
    if (!chalkActive) return;
    for (const p of chalkParticles) {
      if (p.life <= 0) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(135,206,235,${p.life * 0.7})`;
      ctx.fill();
    }
  }

  Object.assign(UI, {
    triggerConfetti, updateConfetti, drawConfetti,
    triggerChalk, updateChalk, drawChalk
  });
})();
