const GameState = (() => {
  class GameState {
    constructor() {
      this.mode = null;
      this.phase = 'menu';
      this.cueBall = null;
      this.balls = [];
      this.life = 8;
      this.count = 0;
      this.score = 0;
      this.p1Score = 0;
      this.p2Score = 0;
      this.winner = 0;
      this.firstHitType = null;
      this.shotPower = 0;
      this.aimAngle = 0;
      this.spinX = 0;
      this.spinY = 0;
      this.selectedBallId = null;
      this.cushionHits = 0;
      this.ballsHitThisShot = new Set();
      this.soundedPairs = new Set();
      this.turnActive = false;
      this.isCharging = false;
      this.won = false;
    }

    reset() {
      this.cueBall = null;
      this.balls = [];
      this.life = 8;
      this.count = 0;
      this.score = 0;
      this.p1Score = 0;
      this.p2Score = 0;
      this.winner = 0;
      this.firstHitType = null;
      this.shotPower = 0;
      this.aimAngle = 0;
      this.spinX = 0;
      this.spinY = 0;
      this.selectedBallId = null;
      this.cushionHits = 0;
      this.ballsHitThisShot = new Set();
      this.soundedPairs = new Set();
      this.turnActive = false;
      this.isCharging = false;
      this.won = false;
    }

    startShot() {
      this.ballsHitThisShot.clear();
      this.soundedPairs.clear();
      this.cushionHits = 0;
      this.firstHitType = null;
      this.turnActive = true;
    }

    trySoundPair(id1, id2) {
      if (!this.turnActive) return false;
      const key = id1 < id2 ? id1 + '|' + id2 : id2 + '|' + id1;
      if (this.soundedPairs.has(key)) return false;
      this.soundedPairs.add(key);
      return true;
    }

    recordBallHit(ballId) {
      if (this.turnActive) {
        this.ballsHitThisShot.add(ballId);
      }
    }

    recordCushionHit() {
      if (this.turnActive) {
        this.cushionHits++;
      }
    }

    recordFirstHit(type) {
      if (this.turnActive && this.firstHitType === null) {
        this.firstHitType = type;
      }
    }
  }

  return { GameState };
})();
