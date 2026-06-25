const UI = (() => {
  const chalkParticles = [];
  let chalkActive = false;
  let chalkTimer = 0;
  let trajectoryMode = true;

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

  function isTrajectoryMode() { return trajectoryMode; }
  function toggleTrajectoryMode() { trajectoryMode = !trajectoryMode; }

  function drawStrikeIndicator(ctx, cueBall, spinX, spinY) {
    if (!cueBall || !cueBall.active) return;
    const r = cueBall.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cueBall.x, cueBall.y, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    const zones = [
      { l: -1, t: -1, label: 'FL' },
      { l:  0, t: -1, label: 'F' },
      { l:  1, t: -1, label: 'FR' },
      { l: -1, t:  0, label: 'L' },
      { l:  0, t:  0, label: 'C' },
      { l:  1, t:  0, label: 'R' },
      { l: -1, t:  1, label: 'BL' },
      { l:  0, t:  1, label: 'B' },
      { l:  1, t:  1, label: 'BR' },
    ];

    const zoneR = r * 0.5;
    for (const z of zones) {
      const zx = cueBall.x + z.l * r * 0.55;
      const zy = cueBall.y + z.t * r * 0.55;
      const isSelected = (
        Math.abs(spinX - z.l * 0.7) < 0.25 &&
        Math.abs(spinY - z.t * 0.7) < 0.25
      );
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(zx, zy, zoneR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,100,100,0.7)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(zx, zy, zoneR * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(z.label, zx, zy);
    }

    const dotX = cueBall.x + spinX * r * 0.8;
    const dotY = cueBall.y + spinY * r * 0.8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const spinLabel = getSpinLabel(spinX, spinY);
    if (spinLabel) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(spinLabel, cueBall.x, cueBall.y - r - 12);
    }

    ctx.restore();
  }

  function getSpinLabel(spinX, spinY) {
    const absX = Math.abs(spinX);
    const absY = Math.abs(spinY);
    if (absX < 0.25 && absY < 0.25) return '';
    const parts = [];
    if (absY > 0.25) parts.push(spinY < 0 ? 'FWD' : 'BACK');
    if (absX > 0.25) parts.push(spinX < 0 ? 'LEFT' : 'RIGHT');
    return parts.join('+');
  }

  function drawAimLine(ctx, cueBall, angle, balls, tableBounds, spinX, spinY) {
    if (!cueBall || !cueBall.active) return;

    const startX = cueBall.x;
    const startY = cueBall.y;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    let hitBall = null;
    let hitT = Infinity;
    let hitX = startX, hitY = startY;

    for (const ball of balls) {
      if (!ball.active || ball === cueBall) continue;
      const ocx = ball.x - startX;
      const ocy = ball.y - startY;
      const rSum = cueBall.radius + ball.radius;
      const a = dirX * dirX + dirY * dirY;
      const b = -2 * (ocx * dirX + ocy * dirY);
      const c = ocx * ocx + ocy * ocy - rSum * rSum;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        if (t > 0.01 && t < hitT) {
          hitT = t;
          hitBall = ball;
          hitX = startX + dirX * t;
          hitY = startY + dirY * t;
        }
      }
    }

    if (trajectoryMode) return;

    ctx.save();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const extendLen = hitBall ? hitT : 300;
    ctx.lineTo(startX + dirX * extendLen, startY + dirY * extendLen);
    ctx.stroke();
    ctx.setLineDash([]);

    if (hitBall) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(hitX, hitY);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hitX, hitY, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hitBall.x, hitBall.y, hitBall.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const nx = (hitX - hitBall.x) / (cueBall.radius + hitBall.radius);
      const ny = (hitY - hitBall.y) / (cueBall.radius + hitBall.radius);
      const ghostX = hitBall.x + nx * (hitBall.radius + cueBall.radius);
      const ghostY = hitBall.y + ny * (hitBall.radius + cueBall.radius);

      ctx.beginPath();
      ctx.arc(ghostX, ghostY, cueBall.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawTrajectoryPreview(ctx, cueBall, angle, power, spinX, spinY, balls, tableBounds) {
    if (!cueBall || !cueBall.active) return;
    const result = Physics.simulateTrajectory(
      cueBall.x, cueBall.y, angle, power, spinX, spinY,
      tableBounds, balls, 300
    );
    const pts = result.cuePoints;
    const hitPts = result.hitPoints;
    if (!pts || pts.length < 2) return;

    ctx.save();

    const gradient = ctx.createLinearGradient(
      pts[0].x, pts[0].y,
      pts[pts.length - 1].x, pts[pts.length - 1].y
    );
    gradient.addColorStop(0, 'rgba(0,230,118,0.9)');
    gradient.addColorStop(1, 'rgba(0,180,80,0.4)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    let hitIdx = -1;
    let hitX = 0, hitY = 0;
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
      if (pts[i].type === 'ball_hit' && hitIdx < 0) {
        hitIdx = i;
        hitX = pts[i].x;
        hitY = pts[i].y;
      }
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,230,118,0.5)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (hitPts && hitPts.length > 0) {
      ctx.beginPath();
      ctx.moveTo(hitPts[0].x, hitPts[0].y);
      let lastHitPt = hitPts[0];
      for (let i = 1; i < hitPts.length; i++) {
        ctx.lineTo(hitPts[i].x, hitPts[i].y);
        lastHitPt = hitPts[i];
      }

      const hitGrad = ctx.createLinearGradient(hitPts[0].x, hitPts[0].y, lastHitPt.x, lastHitPt.y);
      hitGrad.addColorStop(0, 'rgba(255,140,0,0.9)');
      hitGrad.addColorStop(1, 'rgba(255,80,0,0.4)');
      ctx.strokeStyle = hitGrad;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(255,140,0,0.5)';
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      for (let i = 0; i < hitPts.length; i += 4) {
        const p = hitPts[i];
        const alpha = 0.3 + (i / hitPts.length) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + (i / hitPts.length) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,140,0,${alpha})`;
        ctx.fill();
      }
    }

    if (hitIdx > 0) {
      ctx.beginPath();
      ctx.arc(hitX, hitY, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hitX, hitY, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,215,0,0.6)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARPMA', hitX, hitY - 18);
    }

    for (const pt of pts) {
      if (pt.type === 'cushion') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,180,255,0.7)';
        ctx.fill();
      }
    }
    
    if (hitPts) {
      for (const pt of hitPts) {
        if (pt.type === 'cushion') {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100,180,255,0.7)';
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  function drawSimpleTrajectory(ctx, cueBall, angle, spinX, spinY) {
    const bounds = Table.getBounds();
    const power = 12;
    const result = Physics.simulateTrajectory(
      cueBall.x, cueBall.y, angle, power, spinX, spinY,
      bounds, [], 200
    );
    const pts = result.cuePoints;
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,200,255,0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < pts.length; i += 5) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,200,255,0.6)';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFullTrajectory(ctx, trajectories, cueBall, angle, spinX, spinY) {
    if (!trajectories || trajectories.length === 0) {
      if (cueBall && cueBall.active) {
        drawSimpleTrajectory(ctx, cueBall, angle, spinX, spinY);
      }
      return;
    }
    ctx.save();

    for (const traj of trajectories) {
      const pts = traj.points;
      if (!pts || pts.length < 2) continue;

      const isCue = traj.isCue;
      const dist = Math.sqrt(
        (pts[pts.length - 1].x - pts[0].x) ** 2 +
        (pts[pts.length - 1].y - pts[0].y) ** 2
      );
      const subsample = Math.max(1, Math.floor(pts.length / 40));

      if (isCue) {
        const grad = ctx.createLinearGradient(
          pts[0].x, pts[0].y,
          pts[pts.length - 1].x, pts[pts.length - 1].y
        );
        grad.addColorStop(0, 'rgba(0,200,255,0.9)');
        grad.addColorStop(1, 'rgba(0,150,200,0.5)');
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0,200,255,0.4)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i = 0; i < pts.length; i += subsample) {
          const pt = pts[i];
          const alpha = 0.4 + (i / pts.length) * 0.5;
          const size = 3 + (i / pts.length) * 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,200,255,${alpha})`;
          ctx.fill();
        }
      } else {
        const grad2 = ctx.createLinearGradient(
          pts[0].x, pts[0].y,
          pts[pts.length - 1].x, pts[pts.length - 1].y
        );
        grad2.addColorStop(0, 'rgba(255,180,0,0.8)');
        grad2.addColorStop(1, 'rgba(255,140,0,0.4)');
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = grad2;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        for (let i = 0; i < pts.length; i += subsample) {
          const pt = pts[i];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,180,0,0.6)';
          ctx.fill();
        }
      }
    }

    const cueTraj = trajectories.find(t => t.isCue);
    if (cueTraj && cueTraj.points.length > 2) {
      const otherTraj = trajectories.find(t => !t.isCue);
      if (otherTraj && otherTraj.points.length > 0) {
        const impactPt = otherTraj.points[0];
        ctx.beginPath();
        ctx.arc(impactPt.x, impactPt.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,215,0,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        const grad = ctx.createRadialGradient(impactPt.x, impactPt.y, 0, impactPt.x, impactPt.y, 12);
        grad.addColorStop(0, 'rgba(255,215,0,0.3)');
        grad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.beginPath();
        ctx.arc(impactPt.x, impactPt.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    for (const traj of trajectories) {
      const pts = traj.points;
      if (!pts || pts.length < 2) continue;
      const last = pts[pts.length - 1];
      const isCue = traj.isCue;

      ctx.beginPath();
      ctx.arc(last.x, last.y, isCue ? 8 : 6, 0, Math.PI * 2);
      ctx.strokeStyle = isCue ? 'rgba(255,255,255,0.8)' : 'rgba(255,200,50,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();

      if (!isCue && traj.id) {
        ctx.fillStyle = 'rgba(255,200,50,0.7)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(traj.id.toUpperCase(), last.x, last.y - 10);
      }
    }

    ctx.restore();
  }

  function drawPowerRing(ctx, cueBall, power) {
    if (!cueBall || !cueBall.active || power <= 0) return;
    const ratio = power / Physics.MAX_POWER;
    const radius = cueBall.radius + 8;

    let color;
    if (ratio < 0.33) color = '#4CAF50';
    else if (ratio < 0.66) color = '#FFEB3B';
    else color = '#F44336';

    ctx.beginPath();
    ctx.arc(cueBall.x, cueBall.y, radius, -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(ratio * 100) + '%', cueBall.x, cueBall.y - cueBall.radius - 14);
  }

  function drawPowerBar(ctx, power, isCharging) {
    if (power <= 0 && !isCharging) return;

    const ratio = power / Physics.MAX_POWER;
    const barX = 15;
    const barY = Table.TABLE_Y + 30;
    const barW = 18;
    const barH = Table.TABLE_HEIGHT - 60;
    const fillH = barH * ratio;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const gradient = ctx.createLinearGradient(barX, barY + barH, barX, barY);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.5, '#FFEB3B');
    gradient.addColorStop(1, '#F44336');

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY + barH - fillH, barW, fillH);

    if (isCharging && ratio > 0) {
      ctx.shadowColor = ratio > 0.7 ? '#F44336' : ratio > 0.4 ? '#FFEB3B' : '#4CAF50';
      ctx.shadowBlur = 10 + ratio * 15;
      ctx.fillRect(barX, barY + barH - fillH, barW, fillH);
      ctx.shadowBlur = 0;
    }

    const markPositions = [0.25, 0.5, 0.75];
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    for (const mark of markPositions) {
      const markY = barY + barH - (barH * mark);
      ctx.beginPath();
      ctx.moveTo(barX - 3, markY);
      ctx.lineTo(barX + barW + 3, markY);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(ratio * 100) + '%', barX + barW / 2, barY - 10);

    if (isCharging) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px sans-serif';
      ctx.fillText(I18n.t('power'), barX + barW / 2, barY + barH + 18);
    }
  }

  function drawCueStick(ctx, cueBall, angle, power, isCharging) {
    if (!cueBall || !cueBall.active) return;

    const stickLength = 120;
    const stickWidth = 4;
    const tipLength = 15;
    const pullBack = isCharging ? (power / Physics.MAX_POWER) * 50 : 0;

    const startX = cueBall.x - Math.cos(angle) * (cueBall.radius + 3 + pullBack);
    const startY = cueBall.y - Math.sin(angle) * (cueBall.radius + 3 + pullBack);

    const endX = startX - Math.cos(angle) * stickLength;
    const endY = startY - Math.sin(angle) * stickLength;

    ctx.save();

    if (isCharging && power > 0) {
      ctx.shadowColor = 'rgba(255,200,100,0.3)';
      ctx.shadowBlur = 10 + (power / Physics.MAX_POWER) * 15;
    }

    ctx.translate(startX, startY);
    ctx.rotate(angle + Math.PI);

    const gradient = ctx.createLinearGradient(0, 0, stickLength, 0);
    gradient.addColorStop(0, '#F5DEB3');
    gradient.addColorStop(0.15, '#DEB887');
    gradient.addColorStop(0.8, '#8B4513');
    gradient.addColorStop(1, '#654321');

    ctx.beginPath();
    ctx.moveTo(0, -stickWidth / 2);
    ctx.lineTo(stickLength, -stickWidth / 2 - 1);
    ctx.lineTo(stickLength, stickWidth / 2 + 1);
    ctx.lineTo(0, stickWidth / 2);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -stickWidth / 2 - 0.5);
    ctx.lineTo(tipLength, -stickWidth / 2);
    ctx.lineTo(tipLength, stickWidth / 2);
    ctx.lineTo(0, stickWidth / 2 + 0.5);
    ctx.closePath();
    ctx.fillStyle = '#E8E8E8';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(stickLength, 0, stickWidth / 2 + 1, 0, Math.PI * 2);
    ctx.fillStyle = '#654321';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    const contactX = cueBall.x - Math.cos(angle) * cueBall.radius;
    const contactY = cueBall.y - Math.sin(angle) * cueBall.radius;
    ctx.beginPath();
    ctx.arc(contactX, contactY, 3, 0, Math.PI * 2);
    ctx.fillStyle = isCharging ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.4)';
    ctx.fill();
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

  function drawPreviewPanel(ctx, cueBall, targetBall, mode) {
    const px = 10;
    const py = Table.TABLE_Y + Table.TABLE_HEIGHT + Table.FRAME_SIZE + 5;
    const pw = 180;
    const ph = 55;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CUE BALL', px + 35, py + 18);

    if (cueBall && cueBall.active) {
      ctx.beginPath();
      ctx.arc(px + 15, py + 14, 8, 0, Math.PI * 2);
      ctx.fillStyle = cueBall.color;
      ctx.fill();
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (targetBall && targetBall.active) {
      ctx.beginPath();
      ctx.arc(px + 15, py + 40, 8, 0, Math.PI * 2);
      ctx.fillStyle = targetBall.color;
      ctx.fill();
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.fillText('TARGET', px + 35, py + 44);
    }
  }

  function drawScoreboard(ctx, gameState) {
    const y = 30;
    const canvasW = 900;

    ctx.font = 'bold 14px sans-serif';

    if (gameState.mode === '4ball') {
      const cur = Mode4Ball.getCurrentPlayer();
      const curId = Mode4Ball.getCurrentCueId();

      ctx.textAlign = 'left';
      ctx.fillStyle = cur === 1 ? '#FFD700' : '#aaa';
      ctx.fillText('P1 (Beyaz): ' + gameState.p1Score, 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = cur === 2 ? '#FFD700' : '#aaa';
      ctx.fillText('P2 (Sari): ' + gameState.p2Score, canvasW - 20, y);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px sans-serif';
      ctx.fillText('SIRA: Player ' + cur + '  (' + (curId === 'white' ? 'Beyaz' : 'Sari') + ')', canvasW / 2, y);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('HEDEF: ' + Mode4Ball.getTargetScore() + ' SAYI', canvasW / 2, y + 18);

      if (AI.isEnabled()) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '11px sans-serif';
        ctx.fillText(AI.isThinking() ? '[AI DUSUNUYOR...]' : '[EGITIM MODU]', canvasW / 2, y + 32);
      }

      if (gameState.isPractice) {
        ctx.fillStyle = '#FFC107';
        ctx.font = '11px sans-serif';
        ctx.fillText(I18n.t('practiceReset'), canvasW / 2, y + 46);
      }
    } else {
      const cur = Mode3Ball.getCurrentPlayer();
      const curId = Mode3Ball.getCurrentCueId();

      ctx.textAlign = 'left';
      ctx.fillStyle = cur === 1 ? '#FFD700' : '#aaa';
      ctx.fillText('P1 (' + (Mode3Ball.getCurrentPlayer() === 1 ? curId : (curId === 'white' ? 'yellow' : 'white')).toUpperCase() + '): ' + gameState.p1Score, 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = cur === 2 ? '#FFD700' : '#aaa';
      ctx.fillText('P2 (' + (Mode3Ball.getCurrentPlayer() === 2 ? curId : (curId === 'white' ? 'yellow' : 'white')).toUpperCase() + '): ' + gameState.p2Score, canvasW - 20, y);

      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      let modeLabel = gameState.mode === '3ball' ? '3-TOP (CAROM)' : '3-TOP (3-BAND)';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('SIRA: Player ' + cur + '  (' + curId.toUpperCase() + ')', canvasW / 2, y);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('HEDEF: ' + Mode3Ball.getTargetScore() + ' SAYI  |  ' + modeLabel, canvasW / 2, y + 18);

      if (gameState.mode === '3cushion') {
        ctx.fillText('BANT: ' + gameState.cushionHits + '/3', canvasW / 2, y + 32);
      }

      if (AI.isEnabled()) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '11px sans-serif';
        ctx.fillText(AI.isThinking() ? '[AI DUSUNUYOR...]' : '[EGITIM MODU]', canvasW / 2, y + 46);
      }

      if (gameState.isPractice) {
        ctx.fillStyle = '#FFC107';
        ctx.font = '11px sans-serif';
        ctx.fillText(I18n.t('practiceReset'), canvasW / 2, y + 60);
      }
    }
  }

  function drawGameOver(ctx, won, score, gs) {
    const canvasW = 900;
    const canvasH = 620;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = won ? '#4CAF50' : '#F44336';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';

    if (gs && gs.isTimeAttack) {
      ctx.fillText(I18n.t('timeUp'), canvasW / 2, canvasH / 2 - 40);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(gs.timeAttackScore + ' ' + I18n.t('points'), canvasW / 2, canvasH / 2 + 10);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(I18n.t('finalScore'), canvasW / 2, canvasH / 2 + 40);
    } else if (gs && (gs.mode === '4ball' || gs.mode === '3ball' || gs.mode === '3cushion') && gs.winner) {
      const color = gs.winner === 1 ? 'Beyaz' : 'Sari';
      ctx.fillText('Player ' + gs.winner + ' KAZANDI!', canvasW / 2, canvasH / 2 - 30);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('(' + color + ' top)', canvasW / 2, canvasH / 2 + 5);
      ctx.fillText(gs.p1Score + ' - ' + gs.p2Score, canvasW / 2, canvasH / 2 + 30);
    } else {
      ctx.fillText(won ? 'KAZANDIN!' : 'KAYBETTIN!', canvasW / 2, canvasH / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.fillText('Score: ' + score, canvasW / 2, canvasH / 2 + 20);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.fillText('Click to return to menu', canvasW / 2, canvasH / 2 + 60);

    if (won && gs && gs.winner) triggerConfetti();
  }

  function drawTimeAttackTimer(ctx, remaining, total) {
    const canvasW = 900;
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const timeStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    const ratio = remaining / total;

    ctx.save();

    const barW = 200;
    const barH = 8;
    const barX = (canvasW - barW) / 2;
    const barY = 55;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    let color;
    if (ratio > 0.5) color = '#4CAF50';
    else if (ratio > 0.25) color = '#FFC107';
    else color = '#F44336';

    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.fillStyle = ratio < 0.25 ? '#F44336' : '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, canvasW / 2, barY - 8);

    if (ratio < 0.25) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.fillStyle = '#F44336';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('!', canvasW / 2 + 35, barY - 8);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawTimeAttackScore(ctx, score) {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(score + ' ' + I18n.t('points'), 20, 50);
    ctx.restore();
  }

  function drawMenu(ctx, phase) {
    const canvasW = 900;
    const canvasH = 620;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const titleY = 65;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';

    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 20;
    ctx.fillText(I18n.t('title'), canvasW / 2, titleY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    ctx.fillText(I18n.t('subtitle'), canvasW / 2, titleY + 22);

    if (phase === 'targetselect') {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText(I18n.t('selectTarget'), canvasW / 2, 130);

      const buttons = getTargetScoreButtons();
      for (const btn of buttons) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(btn.label, canvasW / 2, btn.y + btn.h / 2 + 6);
      }

      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText(I18n.t('targetReached'), canvasW / 2, 400);
      ctx.fillText(I18n.t('back'), canvasW / 2, 440);
    } else if (phase === 'timeselect') {
      ctx.fillStyle = '#F44336';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(I18n.t('selectTime'), canvasW / 2, 100);

      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText(I18n.t('timeAttackDesc'), canvasW / 2, 135);

      const buttons = getTimeSelectButtons();
      for (const btn of buttons) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = '#F44336';
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(btn.label, canvasW / 2, btn.y + btn.h / 2 + 6);
      }

      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText(I18n.t('timeAttackGoal'), canvasW / 2, 420);
      ctx.fillText(I18n.t('back'), canvasW / 2, 455);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText(I18n.t('selectMode'), canvasW / 2, 120);

      const buttons = getMenuButtons();
      for (const btn of buttons) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(btn.label, canvasW / 2, btn.y + btn.h / 2 + 6);
      }

      const aiBtn = getAIToggleButton();
      ctx.fillStyle = aiBtn.active ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(aiBtn.x, aiBtn.y, aiBtn.w, aiBtn.h);
      ctx.strokeStyle = aiBtn.active ? '#4CAF50' : '#666';
      ctx.lineWidth = 2;
      ctx.strokeRect(aiBtn.x, aiBtn.y, aiBtn.w, aiBtn.h);
      ctx.fillStyle = aiBtn.active ? '#4CAF50' : '#888';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(aiBtn.active ? 'AI: ' + AI.getDifficultyLabel() : I18n.t('aiOff'), canvasW / 2, aiBtn.y + aiBtn.h / 2 + 5);

      if (aiBtn.active) {
        const diffBtns = getDiffButtons();
        const curDiff = AI.getDifficulty();
        for (const btn of diffBtns) {
          const isActive = btn.key === curDiff;
          ctx.fillStyle = isActive ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.08)';
          ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
          ctx.strokeStyle = isActive ? '#4CAF50' : '#555';
          ctx.lineWidth = 1;
          ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
          ctx.fillStyle = isActive ? '#4CAF50' : '#999';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 4);
        }
      }

      const practiceBtn = getPracticeButton();
      ctx.fillStyle = practiceBtn.active ? 'rgba(255,193,7,0.3)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(practiceBtn.x, practiceBtn.y, practiceBtn.w, practiceBtn.h);
      ctx.strokeStyle = practiceBtn.active ? '#FFC107' : '#666';
      ctx.lineWidth = 2;
      ctx.strokeRect(practiceBtn.x, practiceBtn.y, practiceBtn.w, practiceBtn.h);
      ctx.fillStyle = practiceBtn.active ? '#FFC107' : '#888';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(I18n.t('practice') + (practiceBtn.active ? ' ✓' : ''), canvasW / 2, practiceBtn.y + practiceBtn.h / 2 + 5);

      const timeAttackBtn = getTimeAttackButton();
      ctx.fillStyle = timeAttackBtn.active ? 'rgba(244,67,54,0.3)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(timeAttackBtn.x, timeAttackBtn.y, timeAttackBtn.w, timeAttackBtn.h);
      ctx.strokeStyle = timeAttackBtn.active ? '#F44336' : '#666';
      ctx.lineWidth = 2;
      ctx.strokeRect(timeAttackBtn.x, timeAttackBtn.y, timeAttackBtn.w, timeAttackBtn.h);
      ctx.fillStyle = timeAttackBtn.active ? '#F44336' : '#888';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(I18n.t('timeAttack') + (timeAttackBtn.active ? ' ✓' : ''), canvasW / 2, timeAttackBtn.y + timeAttackBtn.h / 2 + 5);

      const challengeBtn = getChallengeButton();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(challengeBtn.x, challengeBtn.y, challengeBtn.w, challengeBtn.h);
      ctx.strokeStyle = '#9C27B0';
      ctx.lineWidth = 2;
      ctx.strokeRect(challengeBtn.x, challengeBtn.y, challengeBtn.w, challengeBtn.h);
      ctx.fillStyle = '#9C27B0';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(I18n.t('challenge'), canvasW / 2, challengeBtn.y + challengeBtn.h / 2 + 5);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.strokeRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(I18n.t('careerStats'), canvasW / 2, STATS_BTN.y + STATS_BTN.h / 2 + 5);

      const themeBtn = getThemeButton();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(themeBtn.x, themeBtn.y, themeBtn.w, themeBtn.h);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.strokeRect(themeBtn.x, themeBtn.y, themeBtn.w, themeBtn.h);
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(I18n.t('tableColor') + ': ' + Table.getThemeName(), canvasW / 2, themeBtn.y + themeBtn.h / 2 + 4);

      const soundBtn = getSoundButton();
      const soundOn = Audio.isEnabled();
      ctx.fillStyle = soundOn ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(soundBtn.x, soundBtn.y, soundBtn.w, soundBtn.h);
      ctx.strokeStyle = soundOn ? '#4CAF50' : '#888';
      ctx.lineWidth = 2;
      ctx.strokeRect(soundBtn.x, soundBtn.y, soundBtn.w, soundBtn.h);
      ctx.fillStyle = soundOn ? '#4CAF50' : '#888';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(I18n.t('sound') + ': ' + (soundOn ? I18n.t('soundOn') : I18n.t('soundOff')), canvasW / 2, soundBtn.y + soundBtn.h / 2 + 4);

      const langBtn = getLanguageButton();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(langBtn.x, langBtn.y, langBtn.w, langBtn.h);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.strokeRect(langBtn.x, langBtn.y, langBtn.w, langBtn.h);
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(I18n.t('language') + ': ' + I18n.getLanguage().toUpperCase(), canvasW / 2, langBtn.y + langBtn.h / 2 + 4);

      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText(I18n.t('controls'), canvasW / 2, canvasH - 10);
    }
  }

  let aiToggleActive = false;
  let practiceToggleActive = false;
  let timeAttackToggleActive = false;
  const DIFF_BTNS = [
    { label: 'KOLAY', key: 'easy' },
    { label: 'ORTA', key: 'medium' },
    { label: 'ZOR', key: 'hard' }
  ];

  function getAIToggleButton() {
    const canvasW = 900;
    return {
      x: (canvasW - 160) / 2, y: 300, w: 160, h: 28,
      active: aiToggleActive
    };
  }

  function getDiffButtons() {
    const canvasW = 900;
    const bw = 80;
    const startX = (canvasW - bw * 3 - 10) / 2;
    return DIFF_BTNS.map((d, i) => ({
      x: startX + i * (bw + 5), y: 334, w: bw, h: 25,
      label: d.label, key: d.key
    }));
  }

  function getDiffClick(mx, my) {
    for (const btn of getDiffButtons()) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h)
        return btn.key;
    }
    return null;
  }

  function toggleAI() {
    aiToggleActive = !aiToggleActive;
    return aiToggleActive;
  }

  function isAIToggled() { return aiToggleActive; }

  function togglePractice() {
    practiceToggleActive = !practiceToggleActive;
    return practiceToggleActive;
  }

  function isPracticeToggled() { return practiceToggleActive; }

  function toggleTimeAttack() {
    timeAttackToggleActive = !timeAttackToggleActive;
    return timeAttackToggleActive;
  }

  function isTimeAttackToggled() { return timeAttackToggleActive; }

  function getPracticeButton() {
    const canvasW = 900;
    return {
      x: (canvasW - 160) / 2, y: 365, w: 160, h: 28,
      active: practiceToggleActive
    };
  }

  function getTimeAttackButton() {
    const canvasW = 900;
    return {
      x: (canvasW - 160) / 2, y: 398, w: 160, h: 28,
      active: timeAttackToggleActive
    };
  }

  function getChallengeButton() {
    const canvasW = 900;
    return { x: (canvasW - 160) / 2, y: 431, w: 160, h: 28 };
  }

  function getChallengeNavButtons() {
    const canvasW = 900;
    const btnW = 100;
    const btnH = 36;
    const y = 420;
    return {
      prev: { x: canvasW / 2 - btnW - 60, y, w: btnW, h: btnH },
      next: { x: canvasW / 2 + 60, y, w: btnW, h: btnH },
      play: { x: (canvasW - 140) / 2, y: 470, w: 140, h: 40 }
    };
  }

  function getChallengeClick(mx, my) {
    const btn = getChallengeButton();
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      return 'open';
    }
    return null;
  }

  function getChallengeNavClick(mx, my) {
    const nav = getChallengeNavButtons();
    if (mx >= nav.prev.x && mx <= nav.prev.x + nav.prev.w &&
        my >= nav.prev.y && my <= nav.prev.y + nav.prev.h) return 'prev';
    if (mx >= nav.next.x && mx <= nav.next.x + nav.next.w &&
        my >= nav.next.y && my <= nav.next.y + nav.next.h) return 'next';
    if (mx >= nav.play.x && mx <= nav.play.x + nav.play.w &&
        my >= nav.play.y && my <= nav.play.y + nav.play.h) return 'play';
    return null;
  }

  function getMenuButtons() {
    const canvasW = 900;
    const bw = 280;
    const bh = 42;
    const bx = (canvasW - bw) / 2;

    return [
      { x: bx, y: 140, w: bw, h: bh, label: I18n.t('mode4ball'), mode: '4ball' },
      { x: bx, y: 192, w: bw, h: bh, label: I18n.t('mode3ball'), mode: '3ball' },
      { x: bx, y: 244, w: bw, h: bh, label: I18n.t('mode3cushion'), mode: '3cushion' }
    ];
  }

  function getTargetScoreButtons() {
    const canvasW = 900;
    const bw = 200;
    const bh = 40;
    const bx = (canvasW - bw) / 2;
    const scores = [20, 50, 100, 200];

    return scores.map((s, i) => ({
      x: bx, y: 180 + i * 55, w: bw, h: bh,
      label: s + ' ' + I18n.t('points'), score: s
    }));
  }

  function getTargetScoreClick(mx, my) {
    const buttons = getTargetScoreButtons();
    for (const btn of buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w &&
          my >= btn.y && my <= btn.y + btn.h) {
        return btn.score;
      }
    }
    return null;
  }

  function getTimeSelectButtons() {
    const canvasW = 900;
    const bw = 200;
    const bh = 40;
    const bx = (canvasW - bw) / 2;
    const times = [
      { seconds: 60, label: '1 ' + I18n.t('minute') },
      { seconds: 120, label: '2 ' + I18n.t('minutes') },
      { seconds: 180, label: '3 ' + I18n.t('minutes') },
      { seconds: 300, label: '5 ' + I18n.t('minutes') }
    ];

    return times.map((t, i) => ({
      x: bx, y: 180 + i * 55, w: bw, h: bh,
      label: t.label, seconds: t.seconds
    }));
  }

  function getTimeSelectClick(mx, my) {
    const buttons = getTimeSelectButtons();
    for (const btn of buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w &&
          my >= btn.y && my <= btn.y + btn.h) {
        return btn.seconds;
      }
    }
    return null;
  }

  function drawSpinOnBall(ctx, cueBall, spinX, spinY) {
  }

  const STATS_BTN = { x: 360, y: 475, w: 180, h: 26 };
  const THEME_BTN = { x: 360, y: 505, w: 180, h: 26 };
  const SOUND_BTN = { x: 360, y: 535, w: 180, h: 26 };
  const LANG_BTN = { x: 360, y: 565, w: 180, h: 26 };

  function getStatsButton() { return STATS_BTN; }
  function getThemeButton() { return THEME_BTN; }
  function getSoundButton() { return SOUND_BTN; }
  function getLanguageButton() { return LANG_BTN; }

  function drawStatsMenu(ctx) {
    const canvasW = 900, canvasH = 620;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KARIYER ISTATISTIKLERI', canvasW / 2, 60);

    const s = Stats.getStats();
    const wr = Stats.getWinRate();
    const acc = Stats.getShotAccuracy();

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    const lines = [
      'Toplam Oyun: ' + s.totalGames,
      'Kazanma: ' + s.totalWins + ' / ' + s.totalGames + '  (' + wr + '%)',
      'Seri: ' + s.currentStreak + ' (En iyi: ' + s.bestStreak + ')',
      'Isabet: ' + acc + '%  (' + s.scoringShots + '/' + s.totalShots + ' vurus)',
      '',
      '--- MOD BAZINDA ---'
    ];
    const modes = [
      { key: '4ball', label: '4-Top' },
      { key: '3ball', label: '3-Top (Carom)' },
      { key: '3cushion', label: '3-Bant' }
    ];
    for (const m of modes) {
      const ms = Stats.getModeStats(m.key);
      lines.push(m.label + ': ' + ms.played + ' oyun, ' + ms.won + ' galibiyet, En yuksek: ' + ms.bestScore);
    }

    lines.push('', '--- SON MACLAR ---');
    if (s.history.length === 0) {
      lines.push('Henuz mac kaydi yok');
    } else {
      const maxShow = Math.min(s.history.length, 8);
      for (let i = 0; i < maxShow; i++) {
        const h = s.history[i];
        const modeLabel = modes.find(m => m.key === h.mode)?.label || h.mode;
        const date = new Date(h.date).toLocaleDateString('tr-TR');
        lines.push(date + ' | ' + modeLabel + ' | ' + h.p1Score + '-' + h.p2Score + (h.won ? ' W' : ' L'));
      }
    }

    const startY = 95;
    const lineH = 22;
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('---')) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px sans-serif';
      } else if (lines[i] === '') {
        continue;
      } else {
        ctx.fillStyle = '#ccc';
        ctx.font = '13px sans-serif';
      }
      ctx.fillText(lines[i], 60, startY + i * lineH);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← GERI', canvasW / 2, STATS_BTN.y + STATS_BTN.h / 2 + 5);
  }

  function getStatsButtonClick(mx, my) {
    return mx >= STATS_BTN.x && mx <= STATS_BTN.x + STATS_BTN.w &&
           my >= STATS_BTN.y && my <= STATS_BTN.y + STATS_BTN.h;
  }

  function drawChallengeMenu(ctx) {
    const canvasW = 900, canvasH = 620;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#9C27B0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(I18n.t('challenge'), canvasW / 2, 55);

    const challenges = Challenge.getChallenges();
    const current = Challenge.getChallengeIndex();
    const ch = challenges[current];
    const lang = I18n.getLanguage();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(ch.name[lang] || ch.name.en, canvasW / 2, 100);

    ctx.fillStyle = '#ccc';
    ctx.font = '16px sans-serif';
    ctx.fillText(ch.desc[lang] || ch.desc.en, canvasW / 2, 135);

    ctx.fillStyle = '#888';
    ctx.font = '14px sans-serif';
    ctx.fillText((current + 1) + ' / ' + challenges.length, canvasW / 2, 165);

    const previewX = canvasW / 2 - 180;
    const previewY = 185;
    const previewW = 360;
    const previewH = 220;

    ctx.fillStyle = '#0d4d0d';
    ctx.fillRect(previewX, previewY, previewW, previewH);
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 8;
    ctx.strokeRect(previewX, previewY, previewW, previewH);

    const bounds = Table.getBounds();
    const setup = ch.setup(bounds);
    if (setup) {
      const scaleX = (previewW - 20) / bounds.width;
      const scaleY = (previewH - 20) / bounds.height;
      const scale = Math.min(scaleX, scaleY) * 0.85;
      const offsetX = previewX + (previewW - bounds.width * scale) / 2;
      const offsetY = previewY + (previewH - bounds.height * scale) / 2;

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX, offsetY, bounds.width * scale, bounds.height * scale);

      for (const ball of setup.balls) {
        const bx = offsetX + (ball.x - bounds.x) * scale;
        const by = offsetY + (ball.y - bounds.y) * scale;
        const br = Math.max(ball.radius * scale, 6);

        ctx.beginPath();
        ctx.arc(bx, by, br + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (ball.id === 'white' || ball.id === 'cue') {
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,0,0,0.3)';
          ctx.fill();
        }
      }

      const cueBall = setup.cueBall;
      if (cueBall) {
        const cx = offsetX + (cueBall.x - bounds.x) * scale;
        const cy = offsetY + (cueBall.y - bounds.y) * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const nav = getChallengeNavButtons();

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(nav.prev.x, nav.prev.y, nav.prev.w, nav.prev.h);
    ctx.strokeStyle = '#9C27B0';
    ctx.lineWidth = 2;
    ctx.strokeRect(nav.prev.x, nav.prev.y, nav.prev.w, nav.prev.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('◄ ' + I18n.t('challengePrev'), nav.prev.x + nav.prev.w / 2, nav.prev.y + nav.prev.h / 2 + 5);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(nav.next.x, nav.next.y, nav.next.w, nav.next.h);
    ctx.strokeStyle = '#9C27B0';
    ctx.lineWidth = 2;
    ctx.strokeRect(nav.next.x, nav.next.y, nav.next.w, nav.next.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(I18n.t('challengeNext') + ' ►', nav.next.x + nav.next.w / 2, nav.next.y + nav.next.h / 2 + 5);

    ctx.fillStyle = 'rgba(156,39,176,0.3)';
    ctx.fillRect(nav.play.x, nav.play.y, nav.play.w, nav.play.h);
    ctx.strokeStyle = '#9C27B0';
    ctx.lineWidth = 3;
    ctx.strokeRect(nav.play.x, nav.play.y, nav.play.w, nav.play.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(I18n.t('challengeReset'), canvasW / 2, nav.play.y + nav.play.h / 2 + 6);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('← GERI', canvasW / 2, STATS_BTN.y + STATS_BTN.h / 2 + 5);
  }

  function drawChallengeResult(ctx, success) {
    const canvasW = 900;
    ctx.save();
    ctx.fillStyle = success ? 'rgba(76,175,80,0.9)' : 'rgba(244,67,54,0.9)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(success ? I18n.t('challengeComplete') : I18n.t('challengeFailed'), canvasW / 2, 30);
    ctx.restore();
  }

  return {
    drawAimLine, drawPowerRing, drawPowerBar, drawCueStick,
    triggerChalk, updateChalk, drawChalk,
    drawPreviewPanel, drawScoreboard, drawGameOver, drawMenu,
    getMenuButtons, getTargetScoreButtons, getTargetScoreClick,
    getTimeSelectButtons, getTimeSelectClick,
    drawSpinOnBall, getSpinLabel,
    getAIToggleButton, toggleAI, isAIToggled, getDiffClick,
    getPracticeButton, togglePractice, isPracticeToggled,
    getTimeAttackButton, toggleTimeAttack, isTimeAttackToggled,
    getChallengeButton, getChallengeNavButtons, getChallengeClick, getChallengeNavClick,
    isTrajectoryMode, toggleTrajectoryMode, drawTrajectoryPreview,
    drawStrikeIndicator, drawFullTrajectory,
    getStatsButton, getThemeButton, getSoundButton, getLanguageButton,
    drawStatsMenu, getStatsButtonClick,
    drawChallengeMenu, drawChallengeResult,
    updateConfetti, drawConfetti, triggerConfetti,
    drawTimeAttackTimer, drawTimeAttackScore
  };
})();
