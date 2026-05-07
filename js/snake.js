// Mini-jeu Snake — easter egg de Bourg Palette
// Objectif : atteindre WIN_SCORE pommes en moins de TIME_LIMIT secondes

const GRID_SIZE = 20;          // 20x20 cellules
const CELL = 18;                // taille en pixels d'une cellule
const TIME_LIMIT = 30;          // secondes
const WIN_SCORE = 10;           // pommes à manger pour gagner
const TICK_MS = 100;            // vitesse de base (ms par mouvement)

let canvas, ctx;
let snake, dir, nextDir, apple, score, startTime, tickInterval, timerInterval;
let onWinCb, onLoseCb;
let running = false;
let keyHandler = null;

function rndCell() {
    return Math.floor(Math.random() * GRID_SIZE);
}

function spawnApple() {
    while (true) {
        const a = { x: rndCell(), y: rndCell() };
        if (!snake.some(s => s.x === a.x && s.y === a.y)) return a;
    }
}

function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    apple = spawnApple();
    score = 0;
    startTime = Date.now();
}

function draw() {
    // Fond
    ctx.fillStyle = '#9bd17a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Quadrillage discret
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if ((i + j) % 2 === 0) ctx.fillRect(i * CELL, j * CELL, CELL, CELL);
        }
    }

    // Pomme (Pokéball stylisée)
    const ax = apple.x * CELL + CELL / 2;
    const ay = apple.y * CELL + CELL / 2;
    const r = CELL / 2 - 2;
    ctx.fillStyle = '#ee1515';
    ctx.beginPath(); ctx.arc(ax, ay, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(ax - r, ay - 1, r * 2, 2);
    ctx.beginPath(); ctx.arc(ax, ay, 2, 0, Math.PI * 2); ctx.fill();

    // Serpent (Pikachu jaune)
    snake.forEach((s, i) => {
        const sx = s.x * CELL;
        const sy = s.y * CELL;
        ctx.fillStyle = i === 0 ? '#ffcb05' : '#f0b800';
        ctx.fillRect(sx + 1, sy + 1, CELL - 2, CELL - 2);
        if (i === 0) {
            // Yeux
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx + 4, sy + 4, 3, 3);
            ctx.fillRect(sx + CELL - 7, sy + 4, 3, 3);
            // Joues rouges
            ctx.fillStyle = '#ee1515';
            ctx.fillRect(sx + 2, sy + CELL - 7, 3, 3);
            ctx.fillRect(sx + CELL - 5, sy + CELL - 7, 3, 3);
        }
    });
}

function updateHud() {
    const elapsed = Math.max(0, TIME_LIMIT - (Date.now() - startTime) / 1000);
    document.getElementById('snake-score').textContent = `${score} / ${WIN_SCORE}`;
    document.getElementById('snake-timer').textContent = `${elapsed.toFixed(1)}s`;

    if (elapsed <= 0 && running) {
        stop();
        onLoseCb?.('time');
    }
}

function tick() {
    if (!running) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Collision murs
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        stop(); onLoseCb?.('wall'); return;
    }
    // Collision corps
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        stop(); onLoseCb?.('self'); return;
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
        score++;
        if (score >= WIN_SCORE) {
            stop();
            draw();
            onWinCb?.();
            return;
        }
        apple = spawnApple();
    } else {
        snake.pop();
    }

    draw();
}

function handleKey(e) {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'z' || k === 'w') {
        if (dir.y !== 1) nextDir = { x: 0, y: -1 };
        e.preventDefault();
    } else if (k === 'ArrowDown' || k === 's') {
        if (dir.y !== -1) nextDir = { x: 0, y: 1 };
        e.preventDefault();
    } else if (k === 'ArrowLeft' || k === 'q' || k === 'a') {
        if (dir.x !== 1) nextDir = { x: -1, y: 0 };
        e.preventDefault();
    } else if (k === 'ArrowRight' || k === 'd') {
        if (dir.x !== -1) nextDir = { x: 1, y: 0 };
        e.preventDefault();
    }
}

function stop() {
    running = false;
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
}

export function startSnakeGame(opts = {}) {
    onWinCb = opts.onWin || (() => {});
    onLoseCb = opts.onLose || (() => {});
    canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = GRID_SIZE * CELL;
    canvas.height = GRID_SIZE * CELL;

    reset();
    running = true;
    draw();
    updateHud();

    keyHandler = handleKey;
    window.addEventListener('keydown', keyHandler);
    tickInterval = setInterval(tick, TICK_MS);
    timerInterval = setInterval(updateHud, 100);
}

export function stopSnakeGame() {
    stop();
}

export const SNAKE_CONFIG = { TIME_LIMIT, WIN_SCORE };
