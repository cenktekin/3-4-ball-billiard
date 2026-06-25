const I18n = (() => {
  'use strict';

  const LANGUAGES = {
    tr: {
      // Menu
      title: 'CAROM & 4-BALL BILLIARDS',
      subtitle: '3-Top | 3-Bant | 4-Top',
      selectMode: 'Oyun Modu Secin',
      selectTarget: 'Bitis Sayisini Secin',
      targetReached: 'Ilk o sayiya ulasan kazanir',
      back: '← Geri',
      
      // Game modes
      mode4ball: '4-TOP (DÖRT TOP)',
      mode3ball: '3-TOP (CAROM)',
      mode3cushion: '3-TOP (3-BAND)',
      practice: 'ANTRENMAN',
      practiceReset: '[PRACTICE] R = Toplari Sifirla',
      
      // Target scores
      points: 'SAYI',
      
      // AI
      aiOff: 'AI: KAPALI',
      aiEasy: 'KOLAY',
      aiMedium: 'ORTA',
      aiHard: 'ZOR',
      aiThinking: '[AI DUSUNUYOR...]',
      aiTraining: '[EGITIM MODU]',
      
      // Settings
      careerStats: 'KARIYER STATS',
      tableColor: 'MASA',
      sound: 'SES',
      soundOn: 'ACIK',
      soundOff: 'KAPALI',
      language: 'DIL',
      
      // Gameplay
      selectCueBall: 'Select your cue ball (White or Yellow)',
      selected: 'Selected',
      spinReset: 'Spin reset',
      trajectoryOn: '[G] ROTA ACIK',
      trajectoryOff: '[G] ROTA KAPALI',
      replayOn: '[SHIFT+R] REPLAY AKTIF',
      replayOff: '[SHIFT+R] REPLAY KAPALI',
      power: 'GUC',
      
      // Scoreboard
      p1: 'P1',
      p2: 'P2',
      white: 'Beyaz',
      yellow: 'Sari',
      turn: 'SIRA',
      target: 'HEDEF',
      cushion: 'BANT',
      pointsLabel: 'SAYI',
      mode3TopCarom: '3-TOP (CAROM)',
      mode3TopBand: '3-TOP (3-BAND)',
      
      // Game over
      playerWins: 'Player {n} KAZANDI!',
      ballColor: '({color} top)',
      youWin: 'KAZANDIN!',
      youLose: 'KAYBETTIN!',
      score: 'Score',
      clickToMenu: 'Click to return to menu',
      
      // Stats
      careerStatistics: 'KARIYER ISTATISTIKLERI',
      totalGames: 'Toplam Oyun',
      wins: 'Kazanma',
      streak: 'Seri',
      best: 'En iyi',
      accuracy: 'Isabet',
      shots: 'vurus',
      byMode: '--- MOD BAZINDA ---',
      games: 'oyun',
      victories: 'galibiyet',
      highest: 'En yuksek',
      recentMatches: '--- SON MACLAR ---',
      noMatches: 'Henuz mac kaydi yok',
      backLabel: '← GERI',
      
      // Controls hint
      controls: 'Aim: Mouse  |  Power: Hold Click  |  Spin: Right-Click Drag  |  Chalk: SPACE  |  Undo: Z',
      
      // Trajectory
      cueTrajectory: 'Beyaz topun rotasi',
      hitPoint: 'Yesil nokta = carpma',
      
      // Impact
      impact: 'CARPMA',
      
      // Time Attack
      timeAttack: 'ZAMANA KARSI',
      timeUp: 'SURE DOLDU!',
      finalScore: 'Sonuc',
      selectTime: 'Sure Secin',
      timeAttackDesc: 'Belirli surede en cok puani topla',
      timeAttackGoal: 'Sure doldugunda en yuksek puan kazanir',
      minute: 'dakika',
      minutes: 'dakika',
      
      // Challenge
      challenge: 'CHALLENGE',
      challengeComplete: 'TAMAMLANDI!',
      challengeFailed: 'BASARISIZ!',
      challengeNext: 'Sonraki',
      challengePrev: 'Onceki',
      challengeReset: 'Tekrar Dene',
    },
    
    en: {
      // Menu
      title: 'CAROM & 4-BALL BILLIARDS',
      subtitle: '3-Ball | 3-Cushion | 4-Ball',
      selectMode: 'Select Game Mode',
      selectTarget: 'Select Target Score',
      targetReached: 'First to reach this score wins',
      back: '← Back',
      
      // Game modes
      mode4ball: '4-BALL (FOUR BALL)',
      mode3ball: '3-BALL (CAROM)',
      mode3cushion: '3-BALL (3-CUSHION)',
      practice: 'PRACTICE',
      practiceReset: '[PRACTICE] R = Reset Balls',
      
      // Target scores
      points: 'POINTS',
      
      // AI
      aiOff: 'AI: OFF',
      aiEasy: 'EASY',
      aiMedium: 'MEDIUM',
      aiHard: 'HARD',
      aiThinking: '[AI THINKING...]',
      aiTraining: '[TRAINING MODE]',
      
      // Settings
      careerStats: 'CAREER STATS',
      tableColor: 'TABLE',
      sound: 'SOUND',
      soundOn: 'ON',
      soundOff: 'OFF',
      language: 'LANG',
      
      // Gameplay
      selectCueBall: 'Select your cue ball (White or Yellow)',
      selected: 'Selected',
      spinReset: 'Spin reset',
      trajectoryOn: '[G] TRAJECTORY ON',
      trajectoryOff: '[G] TRAJECTORY OFF',
      replayOn: '[SHIFT+R] REPLAY ON',
      replayOff: '[SHIFT+R] REPLAY OFF',
      power: 'POWER',
      
      // Scoreboard
      p1: 'P1',
      p2: 'P2',
      white: 'White',
      yellow: 'Yellow',
      turn: 'TURN',
      target: 'TARGET',
      cushion: 'CUSHION',
      pointsLabel: 'POINTS',
      mode3TopCarom: '3-BALL (CAROM)',
      mode3TopBand: '3-BALL (3-CUSHION)',
      
      // Game over
      playerWins: 'Player {n} WINS!',
      ballColor: '({color} ball)',
      youWin: 'YOU WIN!',
      youLose: 'YOU LOSE!',
      score: 'Score',
      clickToMenu: 'Click to return to menu',
      
      // Stats
      careerStatistics: 'CAREER STATISTICS',
      totalGames: 'Total Games',
      wins: 'Wins',
      streak: 'Streak',
      best: 'Best',
      accuracy: 'Accuracy',
      shots: 'shots',
      byMode: '--- BY MODE ---',
      games: 'games',
      victories: 'wins',
      highest: 'Highest',
      recentMatches: '--- RECENT MATCHES ---',
      noMatches: 'No match history yet',
      backLabel: '← BACK',
      
      // Controls hint
      controls: 'Aim: Mouse  |  Power: Hold Click  |  Spin: Right-Click Drag  |  Chalk: SPACE  |  Undo: Z',
      
      // Trajectory
      cueTrajectory: 'Cue ball trajectory',
      hitPoint: 'Green dot = impact',
      
      // Impact
      impact: 'IMPACT',
      
      // Time Attack
      timeAttack: 'TIME ATTACK',
      timeUp: 'TIME UP!',
      finalScore: 'Final Score',
      selectTime: 'Select Time',
      timeAttackDesc: 'Score as many points as possible in the given time',
      timeAttackGoal: 'Highest score when time runs out wins',
      minute: 'minute',
      minutes: 'minutes',
      
      // Challenge
      challenge: 'CHALLENGE',
      challengeComplete: 'COMPLETE!',
      challengeFailed: 'FAILED!',
      challengeNext: 'Next',
      challengePrev: 'Previous',
      challengeReset: 'Try Again',
    }
  };

  let currentLang = loadLanguage();

  function loadLanguage() {
    const saved = localStorage.getItem('billiard_language');
    return saved || 'tr';
  }

  function saveLanguage() {
    localStorage.setItem('billiard_language', currentLang);
  }

  function setLanguage(lang) {
    if (LANGUAGES[lang]) {
      currentLang = lang;
      saveLanguage();
    }
  }

  function getLanguage() {
    return currentLang;
  }

  function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    saveLanguage();
    return currentLang;
  }

  function t(key, replacements) {
    let text = LANGUAGES[currentLang][key] || LANGUAGES['tr'][key] || key;
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  }

  return {
    setLanguage, getLanguage, toggleLanguage, t,
    LANGUAGES
  };
})();
