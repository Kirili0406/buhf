/* Snake game - clean, working, with theme + walls mode + touch controls */
(() => {
  // DOM
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusEl = document.getElementById('status');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const themeBtn = document.getElementById('themeBtn');
  const modeBtn = document.getElementById('modeBtn');

  const upBtn = document.getElementById('upBtn');
  const downBtn = document.getElementById('downBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  // Config
  const GRID = 20;              // grid cells per side
  const MIN_TICK = 55;         // max speed (ms)
  const START_TICK = 160;      // starting tick interval (ms)

  // State
  let cellSize = 20;
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let apple = { x: 0, y: 0 };
  let score = 0;
  let best = 0;
  let running = false;
  let paused = false;
  let tickInterval = START_TICK;
  let tickTimer = null;
  let wallsMode = false;

  // Audio (optional small beep)
  let audioCtx = null;
  function beep(freq = 440, dt = 0.06) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.03;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dt);
      o.stop(audioCtx.currentTime + dt + 0.02);
    } catch (e) { /* ignore */ }
  }

  // Initialize / reset
  function resetGame() {
    // center-ish starting snake
    snake = [{ x: 8, y: 10 }, { x: 9, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    tickInterval = START_TICK;
    score = 0;
    running = true;
    paused = false;
    statusEl.textContent = 'Игра идёт';
    pauseBtn.textContent = '⏸';
    scoreEl.textContent = score;
    loadBest();
    placeApple();
    restartLoop();
    render();
  }

  function placeApple() {
    // find empty cell
    const taken = new Set(snake.map(s => `${s.x},${s.y}`));
    for (let i = 0; i < 2000; i++) {
      const x = Math.floor(Math.random() * GRID);
      const y = Math.floor(Math.random() * GRID);
      if (!taken.has(`${x},${y}`)) {
        apple = { x, y };
        return;
      }
    }
    // fallback (shouldn't happen)
    apple = { x: 0, y: 0 };
  }

  // Tick: game step
  function tick() {
    if (!running || paused) return;
    dir = nextDir;
    let head = { x: snake[snake.length - 1].x + dir.x, y: snake[snake.length - 1].y + dir.y };

    if (wallsMode) {
      // walls are deadly
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return gameOver();
    } else {
      // wrap
      head.x = (head.x + GRID) % GRID;
      head.y = (head.y + GRID) % GRID;
    }

    // collision with self
    if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.push(head);

    if (head.x === apple.x && head.y === apple.y) {
      // eat
      score++;
      beep(800, 0.04);
      scoreEl.textContent = score;
      // speed up
      tickInterval = Math.max(MIN_TICK, tickInterval - 5);
      placeApple();
      saveBest();
    } else {
      // move forward
      snake.shift();
    }

    render();
    restartLoop();
  }

  function gameOver() {
    running = false;
    paused = false;
    clearInterval(tickTimer);
    statusEl.textContent = '❌ Конец игры';
    pauseBtn.textContent = '⏸';
    beep(220, 0.12);
    render(); // final render
  }

  // Rendering
  function render() {
    // scale aware: draw in pixels
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas').trim() || '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // optionally render subtle grid (very light)
    // draw apple
    const radius = Math.max(4, cellSize * 0.36);
    ctx.beginPath();
    ctx.fillStyle = '#ff4d4f';
    ctx.arc(apple.x * cellSize + cellSize / 2, apple.y * cellSize + cellSize / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // draw snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const x = s.x * cellSize + 1;
      const y = s.y * cellSize + 1;
      const size = cellSize - 2;
      ctx.fillStyle = (i === snake.length - 1) ? '#4ade80' : '#16a34a';
      roundRect(ctx, x, y, size, size, Math.max(2, Math.floor(size / 6)), true, false);
    }

    // draw walls outline if mode ON
    if (wallsMode) {
      ctx.strokeStyle = 'rgba(100,116,139,0.9)';
      ctx.lineWidth = Math.max(3, Math.floor(cellSize / 8));
      ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    }
  }

  // helper to draw rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (r === undefined) r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Controls
  function setDir(x, y) {
    // prevent immediate reverse
    if (x === -dir.x && y === -dir.y) return;
    nextDir = { x, y };
  }

  window.addEventListener('keydown', (e) => {
    if (!running && e.key === 'Enter') { resetGame(); return; }
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') setDir(0, -1);
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') setDir(0, 1);
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') setDir(-1, 0);
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') setDir(1, 0);
    if (e.key === ' ') togglePause();
  });

  upBtn && upBtn.addEventListener('click', () => setDir(0, -1));
  downBtn && downBtn.addEventListener('click', () => setDir(0, 1));
  leftBtn && leftBtn.addEventListener('click', () => setDir(-1, 0));
  rightBtn && rightBtn.addEventListener('click', () => setDir(1, 0));

  // touch swipe
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!touchStart || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) > 30) {
      if (adx > ady) {
        if (dx > 0) setDir(1, 0); else setDir(-1, 0);
      } else {
        if (dy > 0) setDir(0, 1); else setDir(0, -1);
      }
      touchStart = null;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => { touchStart = null; }, { passive: true });

  // Buttons
  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', () => { resetGame(); });

  modeBtn.addEventListener('click', () => {
    wallsMode = !wallsMode;
    modeBtn.textContent = wallsMode ? 'Со стенами' : 'Стандарт';
    // restart to apply mode cleanly
    resetGame();
  });

  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    themeBtn.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
    // re-render colors
    render();
  });

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : '⏸';
    statusEl.textContent = paused ? '⏸ Пауза' : 'Игра идёт';
  }

  // loop helper
  function restartLoop() {
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, tickInterval);
  }

  // Best (localStorage)
  function loadBest() {
    try {
      best = parseInt(localStorage.getItem('snake_best_v2') || '0', 10) || 0;
    } catch (e) { best = 0; }
    bestEl.textContent = best;
  }
  function saveBest() {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem('snake_best_v2', String(best)); } catch (e) { /* ignore */ }
    }
  }

  // Responsive canvas sizing (and crisp on HiDPI)
  function resizeCanvas() {
    // choose a square size fitting the card (max 700)
    const maxW = Math.min(700, document.querySelector('.game-card').clientWidth - 4);
    const size = Math.floor(Math.min(maxW, window.innerHeight * 0.62));
    // HiDPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale context to CSS pixels
    cellSize = Math.floor(size / GRID);
    render();
  }
  window.addEventListener('resize', resizeCanvas);

  // initial boot
  loadBest();
  resizeCanvas();
  resetGame();

  // expose for debug (optional)
  window._snake = {
    reset: resetGame,
    state: () => ({ snake, apple, score, best, running, paused, wallsMode }),
  };
})();