/* ============================================================
   오목 AI – S/U 최강 버전
   - 15x15
   - 렌주룰 적용
   - S = Strong = 깊이 2~3
   - U = Ultra = 깊이 4 (상황 따라 4.5)
   - 시작 랜덤
============================================================ */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let turn = BLACK;
let humanColor = BLACK;
let aiColor = WHITE;
let gameOver = false;

/* ============================================================
   초기 보드 생성
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   UI 보드 생성 (테이블 기반)
============================================================ */
function createBoardUI() {
    const tbl = document.getElementById("board");
    tbl.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        const row = document.createElement("tr");

        for (let x = 0; x < SIZE; x++) {
            const cell = document.createElement("td");
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener("click", onHumanClick);
            row.appendChild(cell);
        }
        tbl.appendChild(row);
    }
}

/* ============================================================
   보드 렌더링 (돌, 금수)
============================================================ */
function renderBoard() {
    const tbl = document.getElementById("board");

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const td = tbl.rows[y].cells[x];
            td.className = "";       // 초기화
            td.textContent = "";     // 금수표시 제거

            const v = board[y][x];

            if (v === BLACK) td.classList.add("black");
            else if (v === WHITE) td.classList.add("white");

            // 금수 (흑 차례일 때만)
            if (turn === BLACK && v === EMPTY) {
                if (isForbidden(board, x, y)) {
                    td.classList.add("forbid");
                    td.textContent = "X";
                }
            }
        }
    }
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
    aiStart();
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    gameOver = false;

    const fp = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = (fp === "human") ? BLACK : WHITE;
    aiColor = (humanColor === BLACK) ? WHITE : BLACK;
    turn = BLACK;

    initBoard();
    createBoardUI();
    renderBoard();

    setStatus("게임 시작!");

    if (fp === "ai") {
        aiStart();
    }
}

/* ============================================================
   AI 실행
============================================================ */
async function aiStart() {
    if (gameOver) return;

    await wait(80);

    // 첫 수: 랜덤
    if (board.flat().every(v => v === EMPTY)) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        board[r][c] = aiColor;
        turn = humanColor;
        renderBoard();
        return;
    }

    const move = aiMove();

    if (!move) {
        setStatus("무승부");
        gameOver = true;
        return;
    }

    board[move.y][move.x] = aiColor;

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
   AI Move
   S = depth 2~3
   U = depth 4 (확대 탐색)
============================================================ */
function aiMove() {
    const diff = document.querySelector("input[name=difficulty]:checked").value;
    const depth = (diff === "U") ? 4 : 2;

    const me = aiColor;
    const opp = humanColor;

    // 즉승
    let win = findWinningMove(me);
    if (win) return win;

    // 즉패 방어
    let block = findWinningMove(opp);
    if (block) return block;

    // 강한 threat 기반
    let t1 = threatMove(me);
    if (t1) return t1;

    let t2 = threatMove(opp);
    if (t2) return t2;

    // 후보수
    const moves = generateCandidates();

    let best = null;
    let bestVal = -Infinity;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;
        const val = minimax(depth, false, me, opp, -99999999, 99999999);
        board[mv.y][mv.x] = EMPTY;

        if (val > bestVal) {
            bestVal = val;
            best = mv;
        }
    }
    return best;
}

/* ============================================================
   Minimax + AlphaBeta
============================================================ */
function minimax(depth, maximizing, me, opp, alpha, beta) {

    if (depth === 0) return evaluate(me, opp);

    const moves = generateCandidates();

    if (moves.length === 0) return 0;

    if (maximizing) {
        let best = -Infinity;

        for (const mv of moves) {
            board[mv.y][mv.x] = me;

            if (checkWin(me)) {
                board[mv.y][mv.x] = EMPTY;
                return 9999999;
            }

            const val = minimax(depth - 1, false, me, opp, alpha, beta);
            board[mv.y][mv.x] = EMPTY;

            best = Math.max(best, val);
            alpha = Math.max(alpha, val);

            if (alpha >= beta) break;
        }
        return best;
    }

    else {
        let best = Infinity;

        for (const mv of moves) {
            board[mv.y][mv.x] = opp;

            if (checkWin(opp)) {
                board[mv.y][mv.x] = EMPTY;
                return -9999999;
            }

            const val = minimax(depth - 1, true, me, opp, alpha, beta);
            board[mv.y][mv.x] = EMPTY;

            best = Math.min(best, val);
            beta = Math.min(beta, val);

            if (alpha >= beta) break;
        }
        return best;
    }
}

/* ============================================================
   후보수 생성 (근처 위주)
============================================================ */
function generateCandidates() {
    const res = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (!nearStone(x, y)) continue;

            let score = 0;

            score += patternScore(x, y, aiColor) * 2;
            score += patternScore(x, y, humanColor);

            res.push({ x, y, score });
        }
    }

    res.sort((a, b) => b.score - a.score);
    return res.slice(0, 12);
}

/* ============================================================
   평가 함수
============================================================ */
function evaluate(me, opp) {
    let score = 0;

    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];

            for (const [dx, dy] of dirs) {
                const c = countSeq(board, x, y, dx, dy, v);

                if (v === me) {
                    if (c >= 5) score += 5000000;
                    else if (c === 4) score += 80000;
                    else if (c === 3) score += 2000;
                    else if (c === 2) score += 50;
                }

                else if (v === opp) {
                    if (c >= 5) score -= 8000000;
                    else if (c === 4) score -= 120000;
                    else if (c === 3) score -= 3000;
                    else if (c === 2) score -= 70;
                }
            }
        }
    }
    return score;
}

/* ============================================================
   승리 체크
============================================================ */
function checkWin(color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== color) continue;

            for (const [dx, dy] of dirs) {
                if (countSeq(board, x, y, dx, dy, color) >= 5) return true;
            }
        }
    }
    return false;
}

/* ============================================================
   Seq 카운트
============================================================ */
function countSeq(bd, x, y, dx, dy, c) {
    if (c === EMPTY) return 0;

    let cnt = 1;
    let nx = x + dx, ny = y + dy;

    while (inside(nx, ny) && bd[ny][nx] === c) {
        cnt++; nx += dx; ny += dy;
    }
    nx = x - dx; ny = y - dy;

    while (inside(nx, ny) && bd[ny][nx] === c) {
        cnt++; nx -= dx; ny -= dy;
    }
    return cnt;
}

/* ============================================================
   Threat 기반 (열린3/4)
============================================================ */
function threatMove(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;

            board[y][x] = color;
            if (isOpenFour(x, y, color) || isOpenThree(x, y, color)) {
                board[y][x] = EMPTY;
                return { x, y };
            }
            board[y][x] = EMPTY;
        }
    }
    return null;
}

function isOpenFour(x, y, c) {
    return patternCheck(x, y, c, 4);
}

function isOpenThree(x, y, c) {
    return patternCheck(x, y, c, 3);
}

function patternCheck(x, y, c, need) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        if (countSeq(board, x, y, dx, dy, c) === need) cnt++;
    }
    return cnt > 0;
}

/* ============================================================
   금수 (렌주룰)
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over5 =
        countSeq(bd, x, y, 1,0,BLACK) >= 6 ||
        countSeq(bd, x, y, 0,1,BLACK) >= 6 ||
        countSeq(bd, x, y, 1,1,BLACK) >= 6 ||
        countSeq(bd, x, y, 1,-1,BLACK) >= 6;

    const d3 = countOpenThree(bd, x, y) >= 2;
    const d4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over5 || d3 || d4;
}

function countOpenThree(bd, x, y) {
    return patternLine(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return patternLine(bd, x, y, "011110");
}

function patternLine(bd, x, y, pat) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        let s = "";
        for (let k = -4; k <= 4; k++) {
            const nx = x + dx * k;
            const ny = y + dy * k;

            if (!inside(nx, ny)) s += "3";
            else if (bd[ny][nx] === BLACK) s += "1";
            else if (bd[ny][nx] === WHITE) s += "2";
            else s += "0";
        }
        if (s.includes(pat)) cnt++;
    }
    return cnt;
}

/* ============================================================
   Utility
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

function nearStone(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (!inside(nx, ny)) continue;
            if (board[ny][nx] !== EMPTY) return true;
        }
    }
    return false;
}

function patternScore(x, y, c) {
    let score = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (const [dx, dy] of dirs) {
        const k = countSeq(board, x, y, dx, dy, c);
        if (k === 4) score += 8000;
        else if (k === 3) score += 500;
        else if (k === 2) score += 40;
    }
    return score;
}

function inside(x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

function setStatus(s) {
    document.getElementById("statusBox").textContent = s;
}

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/* ============================================================
   초기 실행
============================================================ */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    startGame();
};
