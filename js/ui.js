const UI = (() => {
  let trajectoryMode = true;
  let trainingMode = false;

  // Physics-derived shot guidance (Todo 6): one cached surface on the shared
  // simulation API so preview, rest markers, and HUD consume the same output.
  let guidanceCacheKey = null;
  let guidanceCacheResult = null;

  function getShotGuidance(cueBall, angle, power, spinX, spinY, balls, tableBounds) {
    if (!cueBall || !cueBall.active) return null;
    const simPower = power > 2 ? power : 12;
    const keyParts = [
      cueBall.x, cueBall.y, angle, simPower, spinX, spinY,
      tableBounds.x, tableBounds.y, tableBounds.width, tableBounds.height
    ];
    for (const b of balls) {
      if (b.active) keyParts.push(b.id, b.x, b.y, b.radius);
    }
    const key = keyParts.join('|');
    let result;
    if (key === guidanceCacheKey) {
      result = guidanceCacheResult;
    } else {
      result = Physics.simulateTrajectory(
        cueBall.x, cueBall.y, angle, simPower, spinX, spinY,
        tableBounds, balls
      );
      guidanceCacheKey = key;
      guidanceCacheResult = result;
    }
    const pts = result.cuePoints;
    if (!pts || pts.length < 2) return null;

    let distance = 0;
    for (let i = 1; i < pts.length; i++) {
      distance += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }

    const hitPt = pts.find(p => p.type === 'ball_hit');
    const cushionOrder = pts.filter(p => p.type === 'cushion');
    const cueRest = pts[pts.length - 1];
    const targetRest = result.hitPoints && result.hitPoints.length > 0
      ? result.hitPoints[result.hitPoints.length - 1]
      : null;

    return {
      distance,
      firstContact: hitPt ? { x: hitPt.x, y: hitPt.y, ballId: hitPt.ballId } : null,
      cushionOrder,
      cueRest,
      targetRest,
      hitBallId: result.hitBallId,
      cuePoints: pts,
      hitPoints: result.hitPoints
    };
  }

  function getBallName(ballId) {
    if (ballId === 'white') return I18n.t('white');
    if (ballId === 'yellow') return I18n.t('yellow');
    return String(ballId).toUpperCase();
  }

  function isTrajectoryMode() { return trajectoryMode; }
  function toggleTrajectoryMode() { trajectoryMode = !trajectoryMode; }

  function isTrainingMode() { return trainingMode; }
  function toggleTrainingMode() { trainingMode = !trainingMode; }
  function setTrainingMode(v) { trainingMode = !!v; }

  function drawStrikeIndicator(ctx, cueBall, spinX, spinY, gameState) {
    if (!cueBall || !cueBall.active) return;
    const r = cueBall.radius;

    let suggested = null;
    if (trainingMode && gameState && gameState.cueBall && gameState.balls) {
      suggested = AI.getSuggestedSpinForAngle(
        gameState.cueBall, gameState.aimAngle, gameState.balls, gameState.mode
      );
    }

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
        Math.abs(spinX - z.l * 0.7) < 0.35 &&
        Math.abs(spinY - z.t * 0.7) < 0.35
      );
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(zx, zy, zoneR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,100,100,0.85)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
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

    if (suggested && (Math.abs(suggested.spinX) > 0.15 || Math.abs(suggested.spinY) > 0.15)) {
      const gx = cueBall.x + suggested.spinX * r * 0.8;
      const gy = cueBall.y + suggested.spinY * r * 0.8;
      ctx.beginPath();
      ctx.arc(gx, gy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00E676';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const sugLabel = getSpinLabel(suggested.spinX, suggested.spinY);
      if (sugLabel) {
        ctx.fillStyle = '#00E676';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(I18n.t('suggestionLabel') + ' ' + sugLabel, cueBall.x, cueBall.y + r + 34);
      }
    }

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

  function drawAimLine(ctx, cueBall, angle, balls, tableBounds, spinX, spinY, guidance) {
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

    const ghost = trajectoryMode;
    const extendLen = hitBall ? hitT : 300;

    ctx.save();

    ctx.strokeStyle = ghost ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + dirX * extendLen, startY + dirY * extendLen);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let d = 100; d < extendLen; d += 100) {
      const tx = startX + dirX * d;
      const ty = startY + dirY * d;
      ctx.beginPath();
      ctx.moveTo(tx - dirY * 3, ty + dirX * 3);
      ctx.lineTo(tx + dirY * 3, ty - dirX * 3);
      ctx.stroke();
    }

    // swerve direction must match Physics: accel = (-dirY, dirX) * spinX
    if (Math.abs(spinX) > 0.2) {
      if (guidance && guidance.cuePoints && guidance.cuePoints.length > 2) {
        // physics-derived swerve samples along the simulated cue path
        const pts = guidance.cuePoints;
        const endIdx = pts.findIndex(p => p.type === 'ball_hit');
        const pathPts = endIdx > 0 ? pts.slice(0, endIdx) : pts;
        if (pathPts.length > 2) {
          for (let i = 1; i <= 3; i++) {
            const frac = i / 4;
            const idx = Math.min(pathPts.length - 1, Math.floor(frac * (pathPts.length - 1)));
            const p = pathPts[idx];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,120,120,${0.45 + i * 0.15})`;
            ctx.fill();
          }
        }
      } else {
        const offset = spinX * 15;
        for (let i = 1; i <= 3; i++) {
          const t = (extendLen * i) / 4;
          const px = startX + dirX * t - dirY * offset * (i / 3);
          const py = startY + dirY * t + dirX * offset * (i / 3);
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,120,120,${0.45 + i * 0.15})`;
          ctx.fill();
        }
      }
    }

    if (hitBall && !ghost) {
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

  function drawTrajectoryPreview(ctx, cueBall, angle, power, spinX, spinY, balls, tableBounds, guidance) {
    if (!cueBall || !cueBall.active) return;

    const g = guidance || getShotGuidance(cueBall, angle, power, spinX, spinY, balls, tableBounds);
    if (!g) return;
    const pts = g.cuePoints;
    const hitPts = g.hitPoints;
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
      ctx.fillText(I18n.t('impact'), hitX, hitY - 18);
    }

    let cushionCount = 0;
    for (const pt of pts) {
      if (pt.type === 'cushion') {
        cushionCount++;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,180,255,0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,180,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(cushionCount), pt.x, pt.y);
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
      bounds, []
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
    const ratio = power / Physics.CONFIG.MAX_POWER;
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

    const ratio = power / Physics.CONFIG.MAX_POWER;
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

  function drawStickAt(ctx, cueBall, angle, tipDist, alpha) {
    const stickLength = 120;
    const stickWidth = 4;
    const tipLength = 15;

    const startX = cueBall.x - Math.cos(angle) * tipDist;
    const startY = cueBall.y - Math.sin(angle) * tipDist;

    ctx.save();
    ctx.globalAlpha = alpha;
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

    ctx.restore();
  }

  function drawCueStick(ctx, cueBall, angle, power, isCharging) {
    if (!cueBall || !cueBall.active) return;

    const pullBack = isCharging ? (power / Physics.CONFIG.MAX_POWER) * 50 : 0;
    const tipDist = cueBall.radius + 3 + pullBack;

    ctx.save();
    if (isCharging && power > 0) {
      ctx.shadowColor = 'rgba(255,200,100,0.3)';
      ctx.shadowBlur = 10 + (power / Physics.CONFIG.MAX_POWER) * 15;
    }
    drawStickAt(ctx, cueBall, angle, tipDist, 1);
    ctx.restore();

    const contactX = cueBall.x - Math.cos(angle) * cueBall.radius;
    const contactY = cueBall.y - Math.sin(angle) * cueBall.radius;
    ctx.beginPath();
    ctx.arc(contactX, contactY, 3, 0, Math.PI * 2);
    ctx.fillStyle = isCharging ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.4)';
    ctx.fill();
  }

  function drawCueStickFollowthrough(ctx, cueBall, angle, animTimeMs) {
    if (!cueBall || !cueBall.active) return;
    const progress = Math.min(animTimeMs / 120, 1);
    const tipDist = cueBall.radius + 3 - progress * 16;
    drawStickAt(ctx, cueBall, angle, tipDist, 1 - progress);
  }
  function drawRestMarkers(ctx, guidance) {
    if (!guidance) return;
    ctx.save();
    if (guidance.cueRest) {
      const p = guidance.cueRest;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(I18n.t('restCue'), p.x, p.y - 12);
    }
    if (guidance.targetRest) {
      const p = guidance.targetRest;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,180,50,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFB432';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,180,50,0.9)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(I18n.t('restTarget'), p.x, p.y - 11);
    }
    ctx.restore();
  }

  function drawPreviewPanel(ctx, cueBall, targetBall, mode, guidance) {
    const px = 10;
    const py = Table.TABLE_Y + Table.TABLE_HEIGHT + Table.FRAME_SIZE + 5;
    const pw = 190;
    const ph = guidance ? 92 : 55;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(I18n.t('cueBallLabel'), px + 35, py + 18);

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
      ctx.fillText(I18n.t('target'), px + 35, py + 44);
    }

    if (guidance) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(I18n.t('predictedDistance', { d: Math.round(guidance.distance) }), px + 8, py + 62);
      ctx.fillStyle = '#7EC8FF';
      ctx.fillText(I18n.t('cushionCount', { n: guidance.cushionOrder.length }), px + 8, py + 76);
      if (guidance.firstContact) {
        ctx.fillStyle = '#FFB432';
        ctx.fillText(I18n.t('firstContact', { ball: getBallName(guidance.firstContact.ballId) }), px + 8, py + 90);
      }
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
      ctx.fillText(I18n.t('p1') + ' (' + I18n.t('white') + '): ' + gameState.p1Score, 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = cur === 2 ? '#FFD700' : '#aaa';
      ctx.fillText(I18n.t('p2') + ' (' + I18n.t('yellow') + '): ' + gameState.p2Score, canvasW - 20, y);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px sans-serif';
      ctx.fillText(I18n.t('turn') + ': Player ' + cur + '  (' + I18n.t(curId === 'white' ? 'white' : 'yellow') + ')', canvasW / 2, y);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText(I18n.t('target') + ': ' + Mode4Ball.getTargetScore() + ' ' + I18n.t('pointsLabel'), canvasW / 2, y + 18);

      if (AI.isEnabled()) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '11px sans-serif';
        ctx.fillText(AI.isThinking() ? I18n.t('aiThinking') : I18n.t('aiTraining'), canvasW / 2, y + 32);
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
      ctx.fillText(I18n.t('p1') + ' (' + (Mode3Ball.getCurrentPlayer() === 1 ? curId : (curId === 'white' ? 'yellow' : 'white')).toUpperCase() + '): ' + gameState.p1Score, 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = cur === 2 ? '#FFD700' : '#aaa';
      ctx.fillText(I18n.t('p2') + ' (' + (Mode3Ball.getCurrentPlayer() === 2 ? curId : (curId === 'white' ? 'yellow' : 'white')).toUpperCase() + '): ' + gameState.p2Score, canvasW - 20, y);

      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      let modeLabel = gameState.mode === '3ball' ? I18n.t('mode3TopCarom') : I18n.t('mode3TopBand');
      ctx.fillStyle = '#FFD700';
      ctx.fillText(I18n.t('turn') + ': Player ' + cur + '  (' + curId.toUpperCase() + ')', canvasW / 2, y);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText(I18n.t('target') + ': ' + Mode3Ball.getTargetScore() + ' ' + I18n.t('pointsLabel') + '  |  ' + modeLabel, canvasW / 2, y + 18);

      if (gameState.mode === '3cushion') {
        ctx.fillText(I18n.t('cushion') + ': ' + gameState.cushionHits + '/3', canvasW / 2, y + 32);
      }

      if (AI.isEnabled()) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '11px sans-serif';
        ctx.fillText(AI.isThinking() ? I18n.t('aiThinking') : I18n.t('aiTraining'), canvasW / 2, y + 46);
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
      const color = gs.winner === 1 ? I18n.t('white') : I18n.t('yellow');
      ctx.fillText(I18n.t('playerWins', { n: gs.winner }), canvasW / 2, canvasH / 2 - 30);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(I18n.t('ballColor', { color: color }), canvasW / 2, canvasH / 2 + 5);
      ctx.fillText(gs.p1Score + ' - ' + gs.p2Score, canvasW / 2, canvasH / 2 + 30);
    } else {
      ctx.fillText(won ? I18n.t('youWin') : I18n.t('youLose'), canvasW / 2, canvasH / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.fillText(I18n.t('score') + ': ' + score, canvasW / 2, canvasH / 2 + 20);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
      ctx.fillText(I18n.t('clickToMenu'), canvasW / 2, canvasH / 2 + 60);

    if (won && gs && gs.winner) UI.triggerConfetti();
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
  return {
    drawAimLine, drawPowerRing, drawPowerBar, drawCueStick, drawCueStickFollowthrough,
    drawPreviewPanel, drawScoreboard, drawGameOver,
    isTrajectoryMode, toggleTrajectoryMode, drawTrajectoryPreview,
    isTrainingMode, toggleTrainingMode, setTrainingMode,
    drawStrikeIndicator, drawFullTrajectory,
    getSpinLabel,
    getShotGuidance, drawRestMarkers,
    drawTimeAttackTimer, drawTimeAttackScore
  };
})();
