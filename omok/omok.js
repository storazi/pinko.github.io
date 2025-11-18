/* ============================================================
   오목 AI (렌주룰) – 완성형 하이브리드 AI
============================================================ */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let humanColor = BLACK;
let aiColor = WHITE;
let turn = BLACK;
let gameOver = false;
let ghostStone;

let stoneSize = 44; // 돌 크기
const CELL = 100 / (SIZE - 1);

/* ============================================================
   UI 초기화
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `
        <div id="board"></div>
        <div id="ghostStone"></div>
    `;
    ghostStone = document.getElementById("ghostStone");
}

function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   클릭 포인트 생성 (교차점 정확)
============================================================ */
function createBoardUI() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;

            p.style.left = `${x * CELL}%`;
            p.style.top  = `${y * CELL}%`;

            p.addEventListener("click", onHumanClick);
            p.addEventListener("mousemove", onHover);
            p.addEventListener("mouseleave", () => ghostStone.style.opacity = 0);

            boardEl.appendChild(p);
        }
    }
}

/* ============================================================
   보드 렌더링
============================================================ */
function renderBoard() {
    const boardEl = document.getElementById("board");

    document.querySelectorAll(".stone").forEach(e => e.remove());
    document.querySelectorAll(".ban").forEach(e => e.remove());

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];

            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.textContent = "X";
                ban.style.left = `${x * CELL}%`;
                ban.style.top  = `${y * CELL}%`;
                boardEl.appendChild(ban);
            }

            if (v === BLACK || v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = `${x * CELL}%`;
                s.style.top  = `${y * CELL}%`;
                boardEl.appendChild(s);
            }
        }
    }
}

/* ============================================================
   hover 미리보기
============================================================ */
function onHover(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    ghostStone.style.left = `${x * CELL}%`;
    ghostStone.style.top  = `${y * CELL}%`;

    ghostStone.className = humanColor === BLACK ? "black" : "white";

    if (humanColor === BLACK && isForbidden(board, x, y)) {
        ghostStone.classList.add("forbidden");
    }

    ghostStone.style.opacity = 1;
}

/* ============================================================
   사람 착수
============================================================ */
function onHumanClick(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    if (board[y][x] !== EMPTY) return;

    if (turn === BLACK && isForbidden(board, x, y)) {
        setStatus("⚠ 금수 자리입니다!");
        return;
    }

    placeStone(x, y, humanColor);

    if (checkWin(humanColor)) {
        setStatus("🎉 당신의 승리!");
        gameOver = true;
        renderBoard();
        return;
    }

    turn = aiColor;
    ghostStone.style.opacity = 0;
    renderBoard();
    aiStartMove();
}

function placeStone(x, y, color) {
    board[y][x] = color;
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    document.documentElement.style.setProperty("--stone-size", stoneSize + "px");

    resetBoardUI();
    initBoard();
    createBoardUI();
    renderBoard();

    const first = document.querySelector("input[name=firstPlayer]:checked").value;

    humanColor = first === "human" ? BLACK : WHITE;
    aiColor = humanColor === BLACK ? WHITE : BLACK;

    turn = BLACK;
    gameOver = false;

    setStatus("새 게임이 시작되었습니다.");

    if (first === "ai") aiStartMove();
}

/* ============================================================
   AI 착수 (강화된 하이브리드)
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 80));

    // 🟦 AI 선공 첫 수: 중앙
    if (isBoardEmpty()) {
        placeStone(7, 7, aiColor);
        renderBoard();
        turn = humanColor;
        setStatus("당신 차례입니다.");
        return;
    }

    let mv = aiMoveHybrid();
    if (!mv) mv = findNonForbiddenMove();

    placeStone(mv.x, mv.y, aiColor);

    if (checkWin(aiColor)) {
        setStatus("💀 AI 승리!");
        gameOver = true;
        renderBoard();
        return;
    }

    turn = humanColor;
    setStatus("당신 차례입니다.");
    renderBoard();
}

/* ============================================================
   하이브리드 AI
============================================================ */
function aiMoveHybrid() {
    const me = aiColor;
    const opp = humanColor;

    let win = findWinningMove(me);
    if (win) return win;

    let block = findWinningMove(opp);
    if (block) return block;

    let force = findBestForceMove(me);
    if (force) return force;

    let blockForce = findBestForceMove(opp);
    if (blockForce) return blockForce;

    return evaluateBestMove(me, opp);
}

/* ============================================================
   승리수 / 강제수 / 패턴 기반
============================================================ */
function findWinningMove(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            const ok = checkWin(color);
            board[y][x] = EMPTY;

            if (ok) return { x, y };
        }
    }
    return null;
}

function findBestForceMove(color) {
    let best = null, bestScore = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            let score = forceScore(x, y, color);

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }

    return best;
}

function forceScore(x, y, color) {
    let score = 0;

    for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
        let c = countSeq(board, x, y, dx, dy, color);
        if (c === 4) score += 50000;
        if (c === 3) score += 3000;
        if (c === 2) score += 60;
    }

    return score;
}

function evaluateBestMove(me, opp) {
    let best = null;
    let bestScore = -999999;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (me === BLACK && isForbidden(board, x, y)) continue;

            if (!hasNearbyStone(x, y)) continue;

            let score = 0;

            board[y][x] = me;
            score += patternScore(x, y, me) * 1.2;

            board[y][x] = opp;
            score += patternScore(x, y, opp) * 1.0;

            board[y][x] = me;

            score += (14 - (Math.abs(x - 7) + Math.abs(y - 7))) * 3;

            board[y][x] = EMPTY;

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }

    return best;
}

function patternScore(x, y, color) {
    let score = 0;

    for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
        const c = countSeq(board, x, y, dx, dy, color);

        if (c >= 4) score += 200000;
        else if (c === 3) score += 3500;
        else if (c === 2) score += 90;
    }

    return score;
}

/* ============================================================
   유틸
============================================================ */
function isBoardEmpty() {
    return board.every(row => row.every(v => v === EMPTY));
}

function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };
    return null;
}

function hasNearbyStone(x, y) {
    for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (isIn(nx, ny) && board[ny][nx] !== EMPTY) return true;
        }
    return false;
}

function checkWin(color) {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === color)
                for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
                    let cnt = 1;

                    let nx = x + dx, ny = y + dy;
                    while (isIn(nx, ny) && board[ny][nx] === color)
                        cnt++, nx += dx, ny += dy;

                    nx = x - dx, ny = y - dy;
                    while (isIn(nx, ny) && board[ny][nx] === color)
                        cnt++, nx -= dx, ny -= dy;

                    if (cnt >= 5) return true;
                }

    return false;
}

function countSeq(bd, x, y, dx, dy, color) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (isIn(nx, ny) && bd[ny][nx] === color)
        cnt++, nx += dx, ny += dy;

    nx = x - dx, ny = y - dy;
    while (isIn(nx, ny) && bd[ny][nx] === color)
        cnt++, nx -= dx, ny -= dy;

    return cnt;
}

/* ============================================================
   금수 룰 (렌주룰)
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over6 = isOverline(bd, x, y);
    const open3 = countOpenThree(bd, x, y) >= 2;
    const open4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over6 || open3 || open4;
}

function isOverline(bd, x, y) {
    return (
        countSeq(bd, x, y, 1,0,BLACK) >= 6 ||
        countSeq(bd, x, y, 0,1,BLACK) >= 6 ||
        countSeq(bd, x, y, 1,1,BLACK) >= 6 ||
        countSeq(bd, x, y, 1,-1,BLACK) >= 6
    );
}

function countPattern(bd, x, y, pattern) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        let line = "";

        for (let k = -4; k <= 4; k++) {
            const nx = x + dx*k;
            const ny = y + dy*k;

            if (!isIn(nx, ny)) line += "3";
            else line += (
                bd[ny][nx] === BLACK ? "1" :
                bd[ny][nx] === WHITE ? "2" : "0"
            );
        }

        if (line.includes(pattern)) cnt++;
    }

    return cnt;
}

function countOpenThree(bd, x, y) {
    return countPattern(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return countPattern(bd, x, y, "011110");
}

function isIn(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

function setStatus(msg) {
    document.getElementById("statusBox").textContent = msg;
}

/* ============================================================
   초기 실행
============================================================ */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    document.documentElement.style.setProperty("--stone-size", stoneSize + "px");
    startGame();
};
