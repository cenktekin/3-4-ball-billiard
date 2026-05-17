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

  const THEMES = {
    green: { surface: '#1a6b1a', cushion: '#0d4d0d', name: 'Yesil' },
    blue: { surface: '#1a3a5c', cushion: '#0d2540', name: 'Mavi' },
    grey: { surface: '#3a3a3a', cushion: '#252525', name: 'Gri' }
  };
  let currentTheme = 'green';

  let surfacePattern = null;
  let patternCanvas = null;

  function createSurfacePattern(ctx, themeColor) {
    if (!patternCanvas) {
      patternCanvas = document.createElement('canvas');
      patternCanvas.width = 64;
      patternCanvas.height = 64;
    }
    const pctx = patternCanvas.getContext('2d');
    pctx.fillStyle = themeColor;
    pctx.fillRect(0, 0, 64, 64);

    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const brightness = (Math.random() - 0.5) * 15;
      const nr = Math.max(0, Math.min(255, r + brightness));
      const ng = Math.max(0, Math.min(255, g + brightness));
      const nb = Math.max(0, Math.min(255, b + brightness));
      pctx.fillStyle = `rgb(${nr},${ng},${nb})`;
      pctx.fillRect(x, y, 1.5, 1.5);
    }

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      pctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
      pctx.fillRect(x, y, 1, 1);
    }

    return ctx.createPattern(patternCanvas, 'repeat');
  }

  function setTheme(themeName) {
    if (THEMES[themeName]) currentTheme = themeName;
  }

  function getTheme() { return currentTheme; }
  function getThemeName() { return THEMES[currentTheme].name; }
  function getThemes() { return Object.keys(THEMES).map(k => ({ key: k, name: THEMES[k].name })); }

  function getBounds() {
    return {
      x: TABLE_X + CUSHION_SIZE,
      y: TABLE_Y + CUSHION_SIZE,
      width: TABLE_WIDTH - CUSHION_SIZE * 2,
      height: TABLE_HEIGHT - CUSHION_SIZE * 2
    };
  }

  function drawTable(ctx) {
    const theme = THEMES[currentTheme];

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

    ctx.fillStyle = theme.cushion;
    ctx.fillRect(TABLE_X, TABLE_Y, TABLE_WIDTH, CUSHION_SIZE);
    ctx.fillRect(TABLE_X, TABLE_Y + TABLE_HEIGHT - CUSHION_SIZE, TABLE_WIDTH, CUSHION_SIZE);
    ctx.fillRect(TABLE_X, TABLE_Y, CUSHION_SIZE, TABLE_HEIGHT);
    ctx.fillRect(TABLE_X + TABLE_WIDTH - CUSHION_SIZE, TABLE_Y, CUSHION_SIZE, TABLE_HEIGHT);

    surfacePattern = createSurfacePattern(ctx, theme.surface);
    ctx.fillStyle = surfacePattern;
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
    getBounds, drawTable, getCanvasSize,
    setTheme, getTheme, getThemeName, getThemes
  };
})();
