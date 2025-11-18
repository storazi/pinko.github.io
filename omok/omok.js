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

/* ============================================================
   고정 값 : 보드 간격 / 돌 크기
============================================================ */
const cell = 50;      // 선-선 간격 (CSS와 반드시 동일)
const pad = 0;        // 시작 오프셋
const stoneSize = 100; // 돌 크기(px)

/* ============================================================
   DOM 보드 초기화 (돌 남는 문제 해결)
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `<div id="board" class="board"></div>`;
}

/* ============================================================
   데이터 초기화
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   클릭 포인트 UI 생성
============================================================ */
function createBoardUI() {
    const bd = document.getElementById("board");
    bd.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;

            // 교차점에 정확히 위치
            p.style.left = (pad + x * cell) + "px";
            p.style.top  = (pad + y * cell) + "px";

            p.addEventListener("click", onHumanClick);
            bd.appendChild(p);
        }
    }
}

/* ============================================================
   보드 렌더링
============================================================ */
function renderBoard() {
    const boardEl = document.getElementById("board");

    // 기존 돌 / 금수 제거
    document.querySelectorAll(".stone").forEach(s => s.remove());
    document.querySelectorAll(".ban").forEach(b => b.remove());

    // point 내부 초기화
    document.querySelectorAll(".point").forEach(p => (p.innerHTML = ""));

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const stoneColor = board[y][x];

            /* -----------------------
               금수 표시 (흑 턴에서만)
            ------------------------- */
            if (turn === BLACK && stoneColor === EMPTY && isForbidden(board, x, y)) {
                const b = document.createElement("div");
                b.className = "ban";
                b.textContent = "B";

                b.style.left = (pad + x * cell - 10) + "px";
                b.style.top  = (pad + y * cell - 10) + "px";

                boardEl.appendChild(b);
            }

            /* -----------------------
               돌 렌더링
            ------------------------- */
            if (stoneColor === BLACK || stoneColor === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (stoneColor === BLACK ? "black" : "white");

                // 중심 배치 (CSS에서 translate(-50%, -50%) 적용)
                s.style.left = (pad + x * cell) + "px";
                s.style.top  = (pad + y * cell) + "px";

                boardEl.appendChild(s);
            }
        }
    }
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    resetBoardUI();
    initBoard();
    createBoardUI();
    renderBoard();

    const first = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = (first === "human" ? BLACK : WHITE);
    aiColor    = (humanColor === BLACK ? WHITE : BLACK);

    turn = BLACK;
    gameOver = false;
    setStatus("새 게임이 시작되었습니다.");

    if (first === "ai") aiStartMove();
}

/* ============================================================
   사람 착수
============================================================ */
function onHumanClick(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.currentTarget.dataset.x;
    const y = +e.currentTarget.dataset.y;

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
   AI 착수
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 60));

    const diff = document.querySelector("input[name=difficulty]:checked").value;
    let mv = (diff === "normal" ? aiMove_B() : aiMove_C());

    if (!mv) return;

    // 금수 회피
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
   금수 아닌 대체 착수
============================================================ */
function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };
        }
    }
    return null;
}

/* ============================================================
   B 난이도
============================================================ */
function aiMove_B() {
    let win   = findWinningMove(aiColor);
    if (win) return win;

    let block = findWinningMove(humanColor);
    if (block) return block;

    let f  = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(false);
}

/* ============================================================
   C 난이도
============================================================ */
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
   승리 수 탐색
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
    let dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let best = null, bestScore = 0;

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
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let f = findForceMove(color);
            let cnt = f ? 1 : 0;
            board[y][x] = EMPTY;

            if (cnt >= 2) return { x, y };
        }
    }
    return null;
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

            // 주변 돌 영향
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    let nx = x + dx, ny = y + dy;
                    if (!isIn(nx, ny)) continue;

                    if (board[ny][nx] === aiColor) score += (hardMode ? 14 : 10);
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
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== color) continue;

            for (const [dx, dy] of dirs) {
                let c = 1;

                // +
                let nx = x + dx, ny = y + dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    c++; nx += dx; ny += dy;
                }

                // -
                nx = x - dx; ny = y - dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    c++; nx -= dx; ny -= dy;
                }

                if (c >= 5) return true;
            }
        }
    }
    return false;
}

/* ============================================================
   금수 검사
============================================================ */
function isIn(x, y) { return x >= 0 && y >= 0 && x < SIZE && y < SIZE; }

function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over  = isOverline(bd, x, y);
    const open3 = countOpenThree(bd, x, y) >= 2;
    const open4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over || open3 || open4;
}

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

function isOverline(bd, x, y) {
    return (
        countSeq(bd, x, y, 1, 0, BLACK) >= 6 ||
        countSeq(bd, x, y, 0, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, -1, BLACK) >= 6
    );
}

function countPattern(bd, x, y, pat) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        let line = "";
        for (let k = -4; k <= 4; k++) {
            let nx = x + dx * k, ny = y + dy * k;
            if (!isIn(nx, ny)) line += "3";
            else line += (bd[ny][nx] === BLACK ? "1" :
                          bd[ny][nx] === WHITE ? "2" : "0");
        }
        if (line.includes(pat)) cnt++;
    }
    return cnt;
}

function countOpenThree(bd, x, y) {
    return countPattern(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return countPattern(bd, x, y, "011110");
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
    startGame();
};
