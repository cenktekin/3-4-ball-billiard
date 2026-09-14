(() => {
  'use strict';

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
    ctx.fillText(I18n.t('careerStatistics'), canvasW / 2, 60);

    const s = Stats.getStats();
    const wr = Stats.getWinRate();
    const acc = Stats.getShotAccuracy();

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    const lines = [
      I18n.t('totalGames') + ': ' + s.totalGames,
      I18n.t('wins') + ': ' + s.totalWins + ' / ' + s.totalGames + '  (' + wr + '%)',
      I18n.t('streak') + ': ' + s.currentStreak + ' (' + I18n.t('best') + ': ' + s.bestStreak + ')',
      I18n.t('accuracy') + ': ' + acc + '%  (' + s.scoringShots + '/' + s.totalShots + ' ' + I18n.t('shots') + ')',
      '',
      I18n.t('byMode')
    ];
    const modes = [
      { key: '4ball', label: I18n.t('mode4ballShort') },
      { key: '3ball', label: I18n.t('mode3ballShort') },
      { key: '3cushion', label: I18n.t('mode3cushionShort') }
    ];
    for (const m of modes) {
      const ms = Stats.getModeStats(m.key);
      lines.push(m.label + ': ' + ms.played + ' ' + I18n.t('games') + ', ' + ms.won + ' ' + I18n.t('victories') + ', ' + I18n.t('highest') + ': ' + ms.bestScore);
    }

    lines.push('', I18n.t('recentMatches'));
    if (s.history.length === 0) {
      lines.push(I18n.t('noMatches'));
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

  Object.assign(UI, {
    drawMenu,
    getMenuButtons, getTargetScoreButtons, getTargetScoreClick,
    getTimeSelectButtons, getTimeSelectClick,
    getAIToggleButton, toggleAI, isAIToggled, getDiffClick,
    getPracticeButton, togglePractice, isPracticeToggled,
    getTimeAttackButton, toggleTimeAttack, isTimeAttackToggled,
    getChallengeButton, getChallengeNavButtons, getChallengeClick, getChallengeNavClick,
    getStatsButton, getThemeButton, getSoundButton, getLanguageButton,
    drawStatsMenu, getStatsButtonClick,
    drawChallengeMenu, drawChallengeResult
  });
})();
