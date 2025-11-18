/* ============================================================
   오목 AI (렌주룰 + Threat-Based)
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

// ⭐ 교차점 간격 (14칸)
const CELL = 100 / (SIZE - 1);

/* ============================================================
   보드 UI 초기화
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `
        <div id="board"></div>
        <div id="ghostStone"></div>
    `;
    ghostStone = document.getElementById("ghostStone");
}

/* ============================================================
   데이터 초기화
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   클릭 포인트 UI 생성 (교차점 정확 위치)
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

            // ⭐ 교차점 위치 정확히
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

            // 금수 표시
            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.textContent = "X";
                ban.style.left = `${x * CELL}%`;
                ban.style.top  = `${y * CELL}%`;
                boardEl.appendChild(ban);
            }

            // 돌 렌더링
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
   hover 미리보기 돌 (정확한 위치)
============================================================ */
function onHover(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    ghostStone.style.left = `${x * CELL}%`;
    ghostStone.style.top  = `${y * CELL}%`;

    ghostStone.className = "";
    ghostStone.classList.add(humanColor === BLACK ? "black" : "white");

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

/* ============================================================
   돌 놓기
============================================================ */
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
   AI 착수
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 80));

    const diff = document.querySelector("input[name=difficulty]:checked").value;

    // ⭐ 난이도: normal → B, hard → C
    let mv = (diff === "normal") ? aiMove_B() : aiMove_C();

    if (!mv) return;

    if (aiColor === BLACK && isForbidden(board, mv.x, mv.y)) {
        mv = findNonForbiddenMove();
        if (!mv) {
            setStatus("무승부!");
            return;
        }
    }

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
   금수 아닌 자리 찾기
============================================================ */
function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };
    return null;
}
/* ============================================================
   오목 AI (렌주룰 + Threat-Based)
============================================================ */

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let humanColor = BLACK;
let aiColor = WHITE;
let turn = BLACK;
let gameOver = false;

let ghostStone;

// ⭐ 교차점 간격(14칸)
const CELL = 100 / (SIZE - 1);
let stoneSize = 42; // 원하는 돌 크기(px)

/* ============================================================
   보드 UI 초기화
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `
        <div id="board"></div>
        <div id="ghostStone"></div>
    `;
    ghostStone = document.getElementById("ghostStone");
}

/* ============================================================
   데이터 초기화
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   클릭 포인트 UI 생성 — (선 × 선 교차점 정확 위치)
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

            // 🔥 정확한 교차점 위치
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

            // 금수 표시
            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.textContent = "X";
                ban.style.left = `${x * CELL}%`;
                ban.style.top  = `${y * CELL}%`;
                boardEl.appendChild(ban);
            }

            // 실제 돌
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
   hover 미리보기 돌
============================================================ */
function onHover(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    ghostStone.style.left = `${x * CELL}%`;
    ghostStone.style.top  = `${y * CELL}%`;

    ghostStone.className = "";
    ghostStone.classList.add(humanColor === BLACK ? "black" : "white");

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

/* ============================================================
   돌 놓기
============================================================ */
function placeStone(x, y, color) {
    board[y][x] = color;
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    // 돌 크기 CSS 변수 반영
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
   AI 착수
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 90));

    const diff = document.querySelector("input[name=difficulty]:checked").value;

    // 🔥 난이도: normal = B / hard = C
    let mv = (diff === "normal") ? aiMove_B() : aiMove_C();

    if (!mv) return;

    // 금수 피하기
    if (aiColor === BLACK && isForbidden(board, mv.x, mv.y)) {
        mv = findNonForbiddenMove();
        if (!mv) {
            setStatus("무승부!");
            return;
        }
    }

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
   금수 아닌 자리 찾기
============================================================ */
function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };
    return null;
}

/* ============================================================
   AI 로직 B / C 난이도
============================================================ */
function aiMove_B() {
    let win = findWinningMove(aiColor);
    if (win) return win;

    let block = findWinningMove(humanColor);
    if (block) return block;

    let f = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(false);
}

function aiMove_C() {
    let win = findWinningMove(aiColor);
    if (win) return win;

    let block = findWinningMove(humanColor);
    if (block) return block;

    let dual = findDoubleThreat(aiColor);
    if (dual) return dual;

    let dualBlock = findDoubleThreat(humanColor);
    if (dualBlock) return dualBlock;

    let f = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(true);
}

/* ============================================================
   승리수 탐색
============================================================ */
function findWinningMove(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let win = checkWin(color);
            board[y][x] = EMPTY;

            if (win) return { x, y };
        }
    }
    return null;
}

/* ============================================================
   강제 4
============================================================ */
function findForceMove(color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let best = null;
    let bestScore = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            for (const [dx, dy] of dirs) {
                let c = countSeq(board, x, y, dx, dy, color);
                if (c === 4) score += 100000;
                else if (c === 3) score += 800;
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }
    return best;
}

/* ============================================================
   더블 쓰레트 (C 난이도)
============================================================ */
function findDoubleThreat(color) {
    let bestMove = null;
    let bestCount = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let f = findForceMove(color);
            let cnt = f ? 1 : 0;
            board[y][x] = EMPTY;

            if (cnt > bestCount) {
                bestCount = cnt;
                bestMove = { x, y };
            }
        }
    }
    return bestMove;
}

/* ============================================================
   전략 위치 선택
============================================================ */
function chooseStrategicMove(hardMode) {
    let best = null;
    let bestScore = -Infinity;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (aiColor === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            // 중심 가중치
            const dist = Math.abs(x - 7) + Math.abs(y - 7);
            score += (hardMode ? 30 : 18) - dist;

            // 주변 영향
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {

                    let nx = x + dx, ny = y + dy;
                    if (!isIn(nx, ny)) continue;

                    if (board[ny][nx] === aiColor)    score += (hardMode ? 14 : 10);
                    if (board[ny][nx] === humanColor) score += (hardMode ? 11 : 7);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }
    return best;
}

/* ============================================================
   승리 판정
============================================================ */
function checkWin(color) {
    const dirs = [
        [1,0],[0,1],[1,1],[1,-1]
    ];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== color) continue;

            for (const [dx,dy] of dirs) {
                let count = 1;

                // 정
                let nx = x + dx, ny = y + dy;
                while (isIn(nx,ny) && board[ny][nx] === color) {
                    count++; nx += dx; ny += dy;
                }

                // 역
                nx = x - dx; ny = y - dy;
                while (isIn(nx,ny) && board[ny][nx] === color) {
                    count++; nx -= dx; ny -= dy;
                }

                if (count >= 5) return true;
            }
        }
    }
    return false;
}

/* ============================================================
   연속 개수
============================================================ */
function countSeq(bd, x, y, dx, dy, color) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (isIn(nx, ny) && bd[ny][nx] === color) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (isIn(nx, ny) && bd[ny][nx] === color) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

/* ============================================================
   장목
============================================================ */
function isOverline(bd, x, y) {
    return (
        countSeq(bd, x, y, 1,0, BLACK) >= 6 ||
        countSeq(bd, x, y, 0,1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1,1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1,-1,BLACK) >= 6
    );
}

/* ============================================================
   패턴 검사
============================================================ */
function countPattern(bd, x, y, pattern) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let count = 0;

    for (const [dx, dy] of dirs) {
        let line = "";
        for (let k = -4; k <= 4; k++) {
            let nx = x + dx*k;
            let ny = y + dy*k;
            if (!isIn(nx, ny)) line += "3";
            else {
                line += (
                    bd[ny][nx] === BLACK ? "1" :
                    bd[ny][nx] === WHITE ? "2" : "0"
                );
            }
        }
        if (line.includes(pattern)) count++;
    }
    return count;
}

function countOpenThree(bd, x, y) {
    return countPattern(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return countPattern(bd, x, y, "011110");
}

/* ============================================================
   금수
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

function isIn(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

/* ============================================================
   UI 메시지
============================================================ */
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

