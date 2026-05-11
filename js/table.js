const Table = (() => {
  const TABLE_X = 50;
  const TABLE_Y = 70;
  const TABLE_WIDTH = 800;
  const TABLE_HEIGHT = 400;
  const FRAME_SIZE = 30;
  const CUSHION_SIZE = 12;

  const SURFACE_COLOR = '#1a6b1a';
  const CUSHION_COLOR = '#0d4d0d';
  const FRAME_COLOR_1 = '#5c3a1e';
  const FRAME_COLOR_2 = '#8B5E3C';

  function getBounds() {
    return {
      x: TABLE_X + CUSHION_SIZE,
      y: TABLE_Y + CUSHION_SIZE,
      width: TABLE_WIDTH - CUSHION_SIZE * 2,
      height: TABLE_HEIGHT - CUSHION_SIZE * 2
    };
  }

  function drawTable(ctx) {
    ctx.fillStyle = FRAME_COLOR_1;
    ctx.fillRect(TABLE_X - FRAME_SIZE, TABLE_Y - FRAME_SIZE,
      TABLE_WIDTH + FRAME_SIZE * 2, TABLE_HEIGHT + FRAME_SIZE * 2);

    const fGrad = ctx.createLinearGradient(
      TABLE_X - FRAME_SIZE, TABLE_Y - FRAME_SIZE,
      TABLE_X + TABLE_WIDTH + FRAME_SIZE, TABLE_Y + TABLE_HEIGHT + FRAME_SIZE
    );
    fGrad.addColorStop(0, FRAME_COLOR_2);
    fGrad.addColorStop(0.5, FRAME_COLOR_1);
    fGrad.addColorStop(1, FRAME_COLOR_2);
    ctx.fillStyle = fGrad;
    ctx.fillRect(TABLE_X - FRAME_SIZE + 3, TABLE_Y - FRAME_SIZE + 3,
      TABLE_WIDTH + FRAME_SIZE * 2 - 6, TABLE_HEIGHT + FRAME_SIZE * 2 - 6);

    ctx.fillStyle = CUSHION_COLOR;
    ctx.fillRect(TABLE_X, TABLE_Y, TABLE_WIDTH, CUSHION_SIZE);
    ctx.fillRect(TABLE_X, TABLE_Y + TABLE_HEIGHT - CUSHION_SIZE, TABLE_WIDTH, CUSHION_SIZE);
    ctx.fillRect(TABLE_X, TABLE_Y, CUSHION_SIZE, TABLE_HEIGHT);
    ctx.fillRect(TABLE_X + TABLE_WIDTH - CUSHION_SIZE, TABLE_Y, CUSHION_SIZE, TABLE_HEIGHT);

    ctx.fillStyle = SURFACE_COLOR;
    ctx.fillRect(TABLE_X + CUSHION_SIZE, TABLE_Y + CUSHION_SIZE,
      TABLE_WIDTH - CUSHION_SIZE * 2, TABLE_HEIGHT - CUSHION_SIZE * 2);

    drawDiamonds(ctx);

    const cx = TABLE_X + TABLE_WIDTH / 2;
    const cy = TABLE_Y + TABLE_HEIGHT / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff40';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawDiamonds(ctx) {
    const diamondSize = 5;
    const topY = TABLE_Y + CUSHION_SIZE / 2;
    const bottomY = TABLE_Y + TABLE_HEIGHT - CUSHION_SIZE / 2;
    const leftX = TABLE_X + CUSHION_SIZE / 2;
    const rightX = TABLE_X + TABLE_WIDTH - CUSHION_SIZE / 2;

    const playableLeft = TABLE_X + CUSHION_SIZE;
    const playableRight = TABLE_X + TABLE_WIDTH - CUSHION_SIZE;
    const playableTop = TABLE_Y + CUSHION_SIZE;
    const playableBottom = TABLE_Y + TABLE_HEIGHT - CUSHION_SIZE;

    for (let i = 1; i <= 6; i++) {
      const x = playableLeft + (playableRight - playableLeft) * (i / 7);
      drawDiamond(ctx, x, topY, diamondSize);
      drawDiamond(ctx, x, bottomY, diamondSize);
    }
    for (let i = 1; i <= 4; i++) {
      const y = playableTop + (playableBottom - playableTop) * (i / 5);
      drawDiamond(ctx, leftX, y, diamondSize);
      drawDiamond(ctx, rightX, y, diamondSize);
    }
  }

  function drawDiamond(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.6, y);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }

  function getCanvasSize() {
    return {
      width: 900,
      height: 580
    };
  }

  return {
    TABLE_X, TABLE_Y, TABLE_WIDTH, TABLE_HEIGHT,
    FRAME_SIZE, CUSHION_SIZE,
    getBounds, drawTable, getCanvasSize
  };
})();
