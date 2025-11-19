/* ============================================================
   오목 AI – Threat 기반 + 하이브리드 + 미니맥스 완성본
   난이도 normal=2 / hard=3 깊이로 동작
============================================================ */

const SIZE = 14;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let humanColor = BLACK;
let aiColor = WHITE;
let turn = BLACK;
let gameOver = false;
let ghostStone;

/* ============================================================
   UI 초기화
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `<div id="board"></div><div id="ghostStone"></div>`;
    ghostStone = document.getElementById("ghostStone");
}

function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function createBoardUI() {
    const boardEl = document.getElementById("board");

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;
            p.style.left = `${(x / 13) * 100}%`;
            p.style.top  = `${(y / 13) * 100}%`;

            p.addEventListener("click", onHumanClick);
            p.addEventListener("mousemove", onHover);
            p.addEventListener("mouseleave", () => ghostStone.style.opacity = 0);

            boardEl.appendChild(p);
        }
    }
}

function renderBoard() {
    const boardEl = document.getElementById("board");
    document.querySelectorAll(".stone, .ban").forEach(e => e.remove());

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const v = board[y][x];

            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.textContent = "X";
                ban.style.left = `${(x / 13) * 100}%`;
                ban.style.top  = `${(y / 13) * 100}%`;
                boardEl.appendChild(ban);
            }

            if (v !== EMPTY) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = `${(x / 13) * 100}%`;
                s.style.top  = `${(y / 13) * 100}%`;
                boardEl.appendChild(s);
            }
        }
    }
}

/* ============================================================
   Hover
============================================================ */
function onHover(e) {
    if (turn !== humanColor || gameOver) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    ghostStone.style.left = `${(x / 13) * 100}%`;
    ghostStone.style.top  = `${(y / 13) * 100}%`;

    ghostStone.className = humanColor === BLACK ? "black" : "white";
    ghostStone.style.opacity = 1;
}

/* ============================================================
   사람 착수
============================================================ */
function onHumanClick(e) {
    if (turn !== humanColor || gameOver) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    if (board[y][x] !== EMPTY) return;

    if (humanColor === BLACK && isForbidden(board, x, y)) {
        setStatus("⚠ 금수 자리입니다!");
        return;
    }

    board[y][x] = humanColor;

    if (checkWin(humanColor)) {
        gameOver = true;
        renderBoard();
        setStatus("🎉 당신의 승리!");
        return;
    }

    turn = aiColor;
    renderBoard();
    aiStartMove();
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
    humanColor = first === "human" ? BLACK : WHITE;
    aiColor = humanColor === BLACK ? WHITE : BLACK;

    turn = BLACK;
    gameOver = false;

    if (first === "ai") aiStartMove();
}

/* ============================================================
   AI 시작
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    await new Promise(r => setTimeout(r, 60));

    if (board.flat().every(v => v === EMPTY)) {
        board[7][7] = aiColor;
        turn = humanColor;
        renderBoard();
        return;
    }

    const mv = aiMove();
    board[mv.y][mv.x] = aiColor;

    if (checkWin(aiColor)) {
        gameOver = true;
        renderBoard();
        setStatus("💀 AI 승리");
        return;
    }

    turn = humanColor;
    renderBoard();
}

/* ============================================================
   최종 AI – 위협 기반 + 강제수 + 미니맥스
============================================================ */
function aiMove() {
    const me = aiColor;
    const opp = humanColor;

    // 1) 즉승
    let win = findWinningMove(me);
    if (win) return win;

    // 2) 즉패 방어
    let block = findWinningMove(opp);
    if (block) return block;

    // 3) 위협 기반(활삼/열린4)
    let t = threatMove(me);
    if (t) return t;

    let td = threatMove(opp);
    if (td) return td;

    // 4) minimax (난이도)
    const depth = getDepth();
    const moves = generateCandidates(me);

    let best = null;
    let bestV = -Infinity;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;

        const val = minimax(depth - 1, false, me, opp, -Infinity, Infinity);

        board[mv.y][mv.x] = EMPTY;

        if (val > bestV) {
            bestV = val;
            best = mv;
        }
    }

    return best ?? moves[0];
}

/* ============================================================
   난이도: normal → 2 / hard → 3
============================================================ */
function getDepth() {
    const v = document.querySelector("input[name=difficulty]:checked")?.value;
    if (v === "hard") return 3;
    return 2;
}

/* ============================================================
   Threat-based Search (활삼 / 열린4)
============================================================ */
function threatMove(color) {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY) {

                board[y][x] = color;

                if (isOpenFour(x, y, color) || isOpenThree(x, y, color)) {
                    board[y][x] = EMPTY;
                    return { x, y };
                }

                board[y][x] = EMPTY;
            }
    return null;
}

function isOpenFour(x, y, c) {
    let count = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx, dy] of dirs) {
        const seq = countSeq(board, x, y, dx, dy, c);
        if (seq === 4) count++;
    }
    return count > 0;
}

function isOpenThree(x, y, c) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx, dy] of dirs) {
        if (countSeq(board, x, y, dx, dy, c) === 3)
            return true;
    }
    return false;
}

/* ============================================================
   후보수 생성 (10개)
============================================================ */
function generateCandidates(color) {
    let arr = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (!hasNearbyStone(x, y)) continue;

            let score = 0;

            for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
                score += countSeq(board, x, y, dx, dy, color) ** 2;
                score += countSeq(board, x, y, dx, dy, humanColor) ** 2;
            }

            arr.push({ x, y, score });
        }
    }

    arr.sort((a, b) => b.score - a.score);
    return arr.slice(0, 10);
}

/* ============================================================
   Minimax + AlphaBeta
============================================================ */
function minimax(depth, maximizing, me, opp, alpha, beta) {

    if (depth === 0)
        return evaluateBoard(me, opp);

    const moves = generateCandidates(maximizing ? me : opp);
    if (moves.length === 0) return 0;

    if (maximizing) {
        let best = -Infinity;

        for (const mv of moves) {
            board[mv.y][mv.x] = me;

            if (checkWin(me)) {
                board[mv.y][mv.x] = EMPTY;
                return 99999999;
            }

            const val = minimax(depth - 1, false, me, opp, alpha, beta);
            board[mv.y][mv.x] = EMPTY;

            best = Math.max(best, val);
            alpha = Math.max(alpha, val);
            if (beta <= alpha) break;
        }

        return best;
    }

    else {
        let best = Infinity;

        for (const mv of moves) {
            board[mv.y][mv.x] = opp;

            if (checkWin(opp)) {
                board[mv.y][mv.x] = EMPTY;
                return -99999999;
            }

            const val = minimax(depth - 1, true, me, opp, alpha, beta);
            board[mv.y][mv.x] = EMPTY;

            best = Math.min(best, val);
            beta = Math.min(beta, val);
            if (beta <= alpha) break;
        }

        return best;
    }
}

/* ============================================================
   평가 함수
============================================================ */
function evaluateBoard(me, opp) {
    let score = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];

            if (v === me) {
                for (const [dx, dy] of dirs) {
                    const c = countSeq(board, x, y, dx, dy, me);
                    if (c >= 5) score += 10000000;
                    else if (c === 4) score += 80000;
                    else if (c === 3) score += 1500;
                    else if (c === 2) score += 60;
                }
            }

            else if (v === opp) {
                for (const [dx, dy] of dirs) {
                    const c = countSeq(board, x, y, dx, dy, opp);
                    if (c >= 5) score -= 10000000;
                    else if (c === 4) score -= 85000;
                    else if (c === 3) score -= 1800;
                    else if (c === 2) score -= 70;
                }
            }
        }
    }

    return score;
}

/* ============================================================
   기본 유틸
============================================================ */
function findWinningMove(color) {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY) {
                if (color === BLACK && isForbidden(board, x, y)) continue;

                board[y][x] = color;
                const ok = checkWin(color);
                board[y][x] = EMPTY;

                if (ok) return { x, y };
            }

    return null;
}

function hasNearbyStone(x, y) {
    for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE)
                if (board[ny][nx] !== EMPTY) return true;
        }
    return false;
}

function countSeq(bd, x, y, dx, dy, c) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && bd[ny][nx] === c) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && bd[ny][nx] === c) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

function checkWin(color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === color)
                for (const [dx, dy] of dirs)
                    if (countSeq(board, x, y, dx, dy, color) >= 5)
                        return true;

    return false;
}

/* ============================================================
   렌주룰 금수
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over6 =
        countSeq(bd, x, y, 1,0,BLACK) >= 6 ||
        countSeq(bd, x, y, 0,1,BLACK) >= 6 ||
        countSeq(bd, x, y, 1,1,BLACK) >= 6 ||
        countSeq(bd, x, y, 1,-1,BLACK) >= 6;

    const open3 = countOpenThree(bd, x, y) >= 2;
    const open4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over6 || open3 || open4;
}

function countOpenThree(bd, x, y) {
    return countPattern(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return countPattern(bd, x, y, "011110");
}

function countPattern(bd, x, y, pattern) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let count = 0;

    for (const [dx, dy] of dirs) {
        let line = "";

        for (let k = -4; k <= 4; k++) {
            const nx = x + dx * k;
            const ny = y + dy * k;

            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE)
                line += "3";
            else if (bd[ny][nx] === BLACK)
                line += "1";
            else if (bd[ny][nx] === WHITE)
                line += "2";
            else
                line += "0";
        }

        if (line.includes(pattern)) count++;
    }

    return count;
}

/* ============================================================
   상태 박스
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
