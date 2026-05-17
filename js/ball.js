const Ball = (() => {
  function getNumber(ballId) {
    const map = {
      'white': '', 'yellow': '1',
      'red': '3', 'red1': '3', 'red2': '5',
      'cue': ''
    };
    return map[ballId] || '';
  }

  function getStripeColor(ballId) {
    const striped = { 'yellow': true, 'red2': true };
    return striped[ballId] || false;
  }

  class Ball {
    constructor(x, y, color, id) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.color = color;
      this.id = id;
      this.radius = Physics.BALL_RADIUS;
      this.active = true;
      this.spinX = 0;
      this.spinY = 0;
      this.number = getNumber(id);
      this.stripe = getStripeColor(id);
      this.trailTimer = 0;
    }

    draw(ctx) {
      if (!this.active) return;
      const r = this.radius;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

      if (speed > 1) {
        this.trailTimer = Math.min(this.trailTimer + 0.3, 1);
      } else {
        this.trailTimer = Math.max(this.trailTimer - 0.05, 0);
      }
      if (this.trailTimer > 0.1) {
        const trailAlpha = this.trailTimer * 0.15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${trailAlpha})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(this.x + 1, this.y + 2, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();

      if (this.stripe) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        const grad = ctx.createRadialGradient(
          this.x - r * 0.3, this.y - r * 0.3, r * 0.1,
          this.x, this.y, r
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(0.7, this.color);
        grad.addColorStop(1, this.darken(this.color, 30));

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        const grad = ctx.createRadialGradient(
          this.x - r * 0.3, this.y - r * 0.3, r * 0.1,
          this.x, this.y, r
        );
        grad.addColorStop(0, this.color === '#FFFFFF' ? '#ffffff' : '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, this.darken(this.color, 40));

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      if (this.number) {
        const nr = r * 0.45;
        ctx.beginPath();
        ctx.arc(this.x, this.y, nr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.font = `bold ${Math.round(r * 0.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.number, this.x, this.y + 0.5);
      }

      ctx.beginPath();
      ctx.arc(this.x - r * 0.25, this.y - r * 0.25, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();

      if (this.id === 'white' || this.id === 'cue' || this.id === 'yellow') {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,0,0,0.15)';
        ctx.fill();
      }
    }

    darken(hex, amount) {
      const num = parseInt(hex.slice(1), 16);
      const r = Math.max((num >> 16) - amount, 0);
      const g = Math.max(((num >> 8) & 0x00FF) - amount, 0);
      const b = Math.max((num & 0x0000FF) - amount, 0);
      return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }

    stop() {
      this.vx = 0;
      this.vy = 0;
    }
  }

  return { Ball };
})();
