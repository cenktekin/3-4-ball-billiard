const Stats = (() => {
  'use strict';

  const STORAGE_KEY = 'billiard_stats_v1';
  const HISTORY_MAX = 20;

  let data = null;

  function getDefault() {
    return {
      totalGames: 0, totalWins: 0,
      currentStreak: 0, bestStreak: 0,
      byMode: {
        '4ball':  { played: 0, won: 0, bestScore: 0, totalScore: 0 },
        '3ball':  { played: 0, won: 0, bestScore: 0, totalScore: 0 },
        '3cushion': { played: 0, won: 0, bestScore: 0, totalScore: 0 }
      },
      totalShots: 0, scoringShots: 0,
      history: []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        const def = getDefault();
        for (const key of Object.keys(def)) {
          if (!(key in data)) data[key] = def[key];
        }
        if (!data.byMode) data.byMode = def.byMode;
        for (const m of ['4ball', '3ball', '3cushion']) {
          if (!data.byMode[m]) data.byMode[m] = def.byMode[m];
        }
      } else {
        data = getDefault();
      }
    } catch (e) {
      data = getDefault();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {} // eslint-disable-line
  }

  function recordGame(mode, won, score, p1Score, p2Score) {
    if (!data) load();
    data.totalGames++;
    if (won) {
      data.totalWins++;
      data.currentStreak++;
      if (data.currentStreak > data.bestStreak) data.bestStreak = data.currentStreak;
    } else {
      data.currentStreak = 0;
    }

    const modeStats = data.byMode[mode] || { played: 0, won: 0, bestScore: 0, totalScore: 0 };
    modeStats.played++;
    if (won) modeStats.won++;
    modeStats.totalScore += score;
    if (score > modeStats.bestScore) modeStats.bestScore = score;
    data.byMode[mode] = modeStats;

    data.history.unshift({
      mode,
      won,
      score,
      p1Score: p1Score || 0,
      p2Score: p2Score || 0,
      date: new Date().toISOString()
    });
    if (data.history.length > HISTORY_MAX) data.history.length = HISTORY_MAX;

    save();
  }

  function recordShot(scored) {
    if (!data) load();
    data.totalShots++;
    if (scored) data.scoringShots++;
  }

  function getStats() {
    if (!data) load();
    return data;
  }

  function getWinRate() {
    if (!data) load();
    return data.totalGames > 0
      ? Math.round((data.totalWins / data.totalGames) * 100)
      : 0;
  }

  function getShotAccuracy() {
    if (!data) load();
    return data.totalShots > 0
      ? Math.round((data.scoringShots / data.totalShots) * 100)
      : 0;
  }

  function getModeStats(mode) {
    if (!data) load();
    return data.byMode[mode] || { played: 0, won: 0, bestScore: 0, totalScore: 0 };
  }

  function reset() {
    data = getDefault();
    save();
  }

  load();

  return {
    recordGame, recordShot, getStats,
    getWinRate, getShotAccuracy, getModeStats, reset
  };
})();
