const Ball = (() => {
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
    }

    draw(ctx) {
      if (!this.active) return;
      const r = this.radius;

      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      const grad = ctx.createRadialGradient(
        this.x - r * 0.3, this.y - r * 0.3, r * 0.1,
        this.x, this.y, r
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, this.color);
      grad.addColorStop(1, this.darken(this.color, 40));

      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x - r * 0.25, this.y - r * 0.25, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
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
