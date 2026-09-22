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
      mode4ballShort: '4-Top',
      mode3ballShort: '3-Top (Carom)',
      mode3cushionShort: '3-Bant',
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
      selectCueBall: 'Isteka topunu sec (Beyaz veya Sari)',
      cueBallLabel: 'ISTEKA TOPU',
      selected: 'Secilen: {b}',
      spinReset: 'Spin sifirlandi',
      trajectoryOn: '[G] ROTA ACIK',
      trajectoryOff: '[G] ROTA KAPALI',
      trainingOn: '[C] EGITIM MODU: ACIK',
      trainingOff: '[C] EGITIM MODU: KAPALI',
      suggestionApplied: 'Oneri uygulandi (H)',
      bestShotApplied: 'En iyi vuruş uygulandı (sağ tık)',
      suggestionLabel: 'ONERI:',
      shotCancelled: 'Vuruş iptal (ESC)',
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
      controls: 'Aim: Mouse  |  Power: Hold Click  |  Best Shot: Right-Click  |  Falso: Right-Drag  |  Chalk: SPACE  |  Undo: Z',
      
      // Trajectory
      cueTrajectory: 'Beyaz topun rotasi',
      hitPoint: 'Yesil nokta = carpma',
      
      // Impact
      impact: 'CARPMA',

      // Shot guidance (physics-derived)
      restCue: 'ISTEKA DURUSU',
      restTarget: 'HEDEF DURUSU',
      predictedDistance: 'MESAFE: {d}px',
      cushionCount: 'BANT: {n}',
      firstContact: 'ILK TEMAS: {ball}',
      spinMag: 'SPIN: %{pct}',
      
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

      // Shot results
      miss: 'MISS!',
      scoreBoth: 'SAYI! Iki topa da degdi!',
      score3cushion: 'SAYI! 3 bant + iki top!',
      noBallHit: 'Hic topa degmedi!',
      oneBallHit: 'Yalnizca bir topa degdi!',
      twoBallsMissed: 'Iki topa da degmedi!',
      cushionsOnly: 'Yalnizca {n}/3 bant!',
      turnTo: 'Sira → Player {n}',
      singleBallNoPoints: 'TEK TOP — puan yok!',
      threeBalls: 'UC TOP!',
      twoReds: 'IKI KIRMIZI',
      redAndOpponent: 'KIRMIZI + RAKIP',
      cushionDouble: ' + BANT x2!',
      pointsEarned: '+{n} puan',

      // System messages
      noUndo: 'Geri alinacak vurus yok',
      undoDone: 'Son vurus geri alindi',
      simSpeed: 'SIM HIZI: {n}x',
      replayToggleOn: '[R] REPLAY ACIK',
      replayToggleOff: '[R] REPLAY KAPALI',
      ballsReset: 'Toplar sifirlandi',
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
      mode4ballShort: '4-Ball',
      mode3ballShort: '3-Ball (Carom)',
      mode3cushionShort: '3-Cushion',
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
      cueBallLabel: 'CUE BALL',
      selected: 'Selected: {b}',
      spinReset: 'Spin reset',
      trajectoryOn: '[G] TRAJECTORY ON',
      trajectoryOff: '[G] TRAJECTORY OFF',
      trainingOn: '[C] TRAINING: ON',
      trainingOff: '[C] TRAINING: OFF',
      suggestionApplied: 'Suggestion applied (H)',
      bestShotApplied: 'Best shot applied (right-click)',
      suggestionLabel: 'SUGGESTION:',
      shotCancelled: 'Shot cancelled (ESC)',
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
      controls: 'Aim: Mouse  |  Power: Hold Click  |  Best Shot: Right-Click  |  Falso: Right-Drag  |  Chalk: SPACE  |  Undo: Z',
      
      // Trajectory
      cueTrajectory: 'Cue ball trajectory',
      hitPoint: 'Green dot = impact',
      
      // Impact
      impact: 'IMPACT',

      // Shot guidance (physics-derived)
      restCue: 'CUE REST',
      restTarget: 'TARGET REST',
      predictedDistance: 'DISTANCE: {d}px',
      cushionCount: 'CUSHIONS: {n}',
      firstContact: 'FIRST CONTACT: {ball}',
      spinMag: 'SPIN: %{pct}',
      
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

      // Shot results
      miss: 'MISS!',
      scoreBoth: 'SCORE! Hit both balls!',
      score3cushion: 'SCORE! 3 cushions + both balls!',
      noBallHit: 'No ball hit!',
      oneBallHit: 'Only one ball hit!',
      twoBallsMissed: 'Missed both balls!',
      cushionsOnly: 'Only {n}/3 cushions!',
      turnTo: 'Turn → Player {n}',
      singleBallNoPoints: 'SINGLE BALL — no points!',
      threeBalls: 'THREE BALLS!',
      twoReds: 'TWO REDS',
      redAndOpponent: 'RED + OPPONENT',
      cushionDouble: ' + CUSHION x2!',
      pointsEarned: '+{n} points',

      // System messages
      noUndo: 'No shot to undo',
      undoDone: 'Last shot undone',
      simSpeed: 'SIM SPEED: {n}x',
      replayToggleOn: '[R] REPLAY ON',
      replayToggleOff: '[R] REPLAY OFF',
      ballsReset: 'Balls reset',
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
