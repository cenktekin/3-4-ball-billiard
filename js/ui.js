const UI = (() => {
  const chalkParticles = [];
  let chalkActive = false;
  let chalkTimer = 0;
  let trajectoryMode = true;

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

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    if (hitBall) {
      ctx.lineTo(hitX, hitY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hitX, hitY, cueBall.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    } else {
      ctx.lineTo(startX + dirX * 500, startY + dirY * 500);
      ctx.stroke();
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
    if (!pts || pts.length < 2) return;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    let hitIdx = -1;
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
      if (pts[i].type === 'ball_hit') hitIdx = i;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (hitIdx > 0 && hitIdx < pts.length) {
      const hp = pts[hitIdx];
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,215,0,0.8)';
      ctx.fill();
    }

    for (const pt of pts) {
      if (pt.type === 'cushion') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,200,255,0.6)';
        ctx.fill();
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
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i = 0; i < pts.length; i += subsample) {
          const pt = pts[i];
          const alpha = 0.4 + (i / pts.length) * 0.5;
          const size = 3 + (i / pts.length) * 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = 'rgba(255,200,50,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 0; i < pts.length; i += subsample) {
          const pt = pts[i];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,200,50,0.5)';
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
        ctx.fillText(AI.isThinking() ? '[AI DUSUNUYOR...]' : '[EGITIM MODU]', canvasW / 2, y + 32);
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
    }
  }

  function drawGameOver(ctx, won, score, gs) {
    const canvasW = 900;
    const canvasH = 580;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = won ? '#4CAF50' : '#F44336';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';

    if (gs && (gs.mode === '4ball' || gs.mode === '3ball' || gs.mode === '3cushion') && gs.winner) {
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
  }

  function drawMenu(ctx, phase) {
    const canvasW = 900;
    const canvasH = 580;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAROM & 4-BALL BILLIARDS', canvasW / 2, 100);

    if (phase === 'targetselect') {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Bitis Sayisini Secin', canvasW / 2, 150);

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
      ctx.fillText('Ilk o sayiya ulasan kazanir', canvasW / 2, 420);
      ctx.fillText('← Geri', canvasW / 2, 460);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Oyun Modu Secin', canvasW / 2, 130);

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
      ctx.fillText(aiBtn.active ? 'AI: ' + AI.getDifficultyLabel() : 'AI: KAPALI', canvasW / 2, aiBtn.y + aiBtn.h / 2 + 5);

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

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.strokeRect(STATS_BTN.x, STATS_BTN.y, STATS_BTN.w, STATS_BTN.h);
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('KARIYER STATS', canvasW / 2, STATS_BTN.y + STATS_BTN.h / 2 + 5);

      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText('Aim: Mouse  |  Power: Hold Click  |  Spin: Right-Click Drag  |  Chalk: SPACE', canvasW / 2, canvasH - 40);
    }
  }

  let aiToggleActive = false;
  const DIFF_BTNS = [
    { label: 'KOLAY', key: 'easy' },
    { label: 'ORTA', key: 'medium' },
    { label: 'ZOR', key: 'hard' }
  ];

  function getAIToggleButton() {
    const canvasW = 900;
    return {
      x: (canvasW - 160) / 2, y: 340, w: 160, h: 30,
      active: aiToggleActive
    };
  }

  function getDiffButtons() {
    const canvasW = 900;
    const bw = 80;
    const startX = (canvasW - bw * 3 - 10) / 2;
    return DIFF_BTNS.map((d, i) => ({
      x: startX + i * (bw + 5), y: 375, w: bw, h: 25,
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

  function getMenuButtons() {
    const canvasW = 900;
    const bw = 280;
    const bh = 45;
    const bx = (canvasW - bw) / 2;

    return [
      { x: bx, y: 155, w: bw, h: bh, label: '4-TOP (DÖRT TOP)', mode: '4ball' },
      { x: bx, y: 215, w: bw, h: bh, label: '3-TOP (CAROM)', mode: '3ball' },
      { x: bx, y: 275, w: bw, h: bh, label: '3-TOP (3-BAND)', mode: '3cushion' }
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
      label: s + ' SAYI', score: s
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

  function drawSpinOnBall(ctx, cueBall, spinX, spinY) {
  }

  const STATS_BTN = { x: 360, y: 405, w: 180, h: 30 };

  function getStatsButton() { return STATS_BTN; }

  function drawStatsMenu(ctx) {
    const canvasW = 900, canvasH = 580;
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

  return {
    drawAimLine, drawPowerRing, triggerChalk, updateChalk, drawChalk,
    drawPreviewPanel, drawScoreboard, drawGameOver, drawMenu,
    getMenuButtons, getTargetScoreButtons, getTargetScoreClick,
    drawSpinOnBall, getSpinLabel,
    getAIToggleButton, toggleAI, isAIToggled, getDiffClick,
    isTrajectoryMode, toggleTrajectoryMode, drawTrajectoryPreview,
    drawStrikeIndicator, drawFullTrajectory,
    getStatsButton, drawStatsMenu, getStatsButtonClick
  };
})();
