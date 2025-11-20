/* ============================================================
   🧠 Ultra Pro Renju AI (VCF/VCT/Threat-Based)
   네 HTML/CSS 100% 호환 버전
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
   UI 보드 생성
============================================================ */
function createBoardUI() {
    const tbl = document.getElementById("board");
    tbl.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        const row = document.createElement("tr");
        for (let x = 0; x < SIZE; x++) {
            const td = document.createElement("td");
            td.dataset.x = x;
            td.dataset.y = y;
            td.addEventListener("click", onHumanClick);
            row.appendChild(td);
        }
        tbl.appendChild(row);
    }
}

/* ============================================================
   보드 렌더링
============================================================ */
function renderBoard() {
    const tbl = document.getElementById("board");

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const td = tbl.rows[y].cells[x];
            td.className = "";
            td.textContent = "";

            const v = board[y][x];

            if (v === BLACK) td.classList.add("black");
            else if (v === WHITE) td.classList.add("white");

            if (turn === BLACK && v === EMPTY) {
                if (isForbidden(x, y)) {
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

    if (humanColor === BLACK && isForbidden(x, y)) {
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

    if (fp === "ai") aiStart();
}

/* ============================================================
   AI 시작
============================================================ */
async function aiStart() {
    if (gameOver) return;

    await wait(80);

    // 첫 수는 랜덤 중앙 근처
    if (board.flat().every(v => v === EMPTY)) {
        const r = 6 + Math.floor(Math.random() * 3);
        const c = 6 + Math.floor(Math.random() * 3);
        board[r][c] = aiColor;
        turn = humanColor;
        renderBoard();
        return;
    }

    const mv = aiMove();
    if (!mv) {
        setStatus("무승부");
        gameOver = true;
        return;
    }

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
   AI 메인
============================================================ */
function aiMove() {
    const diff = document.querySelector("input[name=difficulty]:checked").value;
    const depth = diff === "U" ? 7 : 4;

    const me = aiColor;
    const opp = humanColor;

    // 즉승 체크
    let w = findWinning(me);
    if (w) return w;

    // 즉패 방어
    let b = findWinning(opp);
    if (b) return b;

    // 강제승리(VCT/VCF)
    let vcf = searchVCF(me, depth);
    if (vcf) return vcf;

    return searchNormal(me, opp, depth);
}

/* ============================================================
   강제승리 탐색 (VCF/VCT)
============================================================ */
function searchVCF(color, depth) {
    if (depth <= 0) return null;

    const moves = generateMoves(color);

    for (const mv of moves) {
        board[mv.y][mv.x] = color;

        if (checkWin(color)) {
            board[mv.y][mv.x] = EMPTY;
            return mv;
        }

        const opp = 3 - color;
        const block = searchVCF(opp, depth - 1);

        board[mv.y][mv.x] = EMPTY;

        if (!block) return mv;
    }
    return null;
}

/* ============================================================
   일반 탐색 (Alpha-Beta)
============================================================ */
function searchNormal(me, opp, depth) {
    const moves = generateMoves(me);

    let best = null;
    let bestVal = -99999999;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;

        const val = -minSearch(opp, me, depth - 1, -999999, 999999);

        board[mv.y][mv.x] = EMPTY;

        if (val > bestVal) {
            bestVal = val;
            best = mv;
        }
    }
    return best;
}

function minSearch(me, opp, depth, alpha, beta) {
    if (depth <= 0) return evalBoard(opp, me);

    const moves = generateMoves(me);
    if (moves.length === 0) return 0;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;

        if (checkWin(me)) {
            board[mv.y][mv.x] = EMPTY;
            return -999999;
        }

        let v = -minSearch(opp, me, depth - 1, -beta, -alpha);

        board[mv.y][mv.x] = EMPTY;

        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
    }
    return alpha;
}

/* ============================================================
   후보수 생성 (상위 20개)
============================================================ */
function generateMoves(color) {
    const arr = [];

    for (let y=0;y<SIZE;y++) {
        for (let x=0;x<SIZE;x++) {
            if (board[y][x] !== EMPTY) continue;
            if (!nearStone(x,y)) continue;

            // 금수 방지
            if (color === BLACK && isForbidden(x,y)) continue;

            const score = moveScore(x,y,color);
            arr.push({ x, y, score });
        }
    }

    arr.sort((a,b)=>b.score - a.score);
    return arr.slice(0, 20);
}

function nearStone(x,y) {
    for (let dy=-2; dy<=2; dy++)
        for (let dx=-2; dx<=2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (inside(nx,ny) && board[ny][nx] !== EMPTY)
                return true;
        }
    return false;
}

/* ============================================================
   카운트, 패턴, 평가
============================================================ */
function moveScore(x,y,c) {
    let score = 0;
    score += patternScore(x,y,c) * 2;
    score += patternScore(x,y,3-c);
    return score;
}

function patternScore(x, y, c) {
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    let s = 0;

    for (const [dx,dy] of dirs) {
        const k = countLine(x,y,dx,dy,c);
        if (k === 4) s += 8000;
        else if (k === 3) s += 500;
        else if (k === 2) s += 40;
    }
    return s;
}

function countLine(x,y,dx,dy,c) {
    let cnt = 1;
    let nx = x + dx, ny = y + dy;
    while (inside(nx,ny) && board[ny][nx] === c) {
        cnt++; nx += dx; ny += dy;
    }
    nx = x - dx; ny = y - dy;
    while (inside(nx,ny) && board[ny][nx] === c) {
        cnt++; nx -= dx; ny -= dy;
    }
    return cnt;
}

function checkWin(c) {
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            if (board[y][x] !== c) continue;
            for (const [dx,dy] of dirs)
                if (countLine(x,y,dx,dy,c) >= 5)
                    return true;
        }
    return false;
}

/* ============================================================
   금수 규칙(렌주룰)
============================================================ */
function isForbidden(x,y) {
    if (board[y][x] !== EMPTY) return true;

    board[y][x] = BLACK;

    const over5 =
        countLine(x,y,1,0,BLACK) >= 6 ||
        countLine(x,y,0,1,BLACK) >= 6 ||
        countLine(x,y,1,1,BLACK) >= 6 ||
        countLine(x,y,1,-1,BLACK) >= 6;

    const d3 = countOpenPattern(x,y,"01110") >= 2;
    const d4 = countOpenPattern(x,y,"011110") >= 2;

    board[y][x] = EMPTY;

    return over5 || d3 || d4;
}

function countOpenPattern(x,y,pat) {
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx,dy] of dirs) {
        let s="";
        for (let k=-4;k<=4;k++) {
            const nx=x+dx*k, ny=y+dy*k;
            if (!inside(nx,ny)) s+="3";
            else if (board[ny][nx]===BLACK) s+="1";
            else if (board[ny][nx]===WHITE) s+="2";
            else s+="0";
        }
        if (s.includes(pat)) cnt++;
    }
    return cnt;
}

/* ============================================================
   즉승 수 찾기 (findWinning)
============================================================ */
function findWinning(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;

            // 흑이면 금수 검사
            if (color === BLACK && isForbidden(x, y)) continue;

            board[y][x] = color;
            const ok = checkWin(color);
            board[y][x] = EMPTY;

            if (ok) return { x, y };
        }
    }
    return null;
}

/* ============================================================
   보드 평가 함수 (evalBoard)
============================================================ */
function evalBoard(me, opp) {
    let score = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];
            if (v === EMPTY) continue;

            for (const [dx, dy] of dirs) {
                const c = countLine(x, y, dx, dy, v);

                if (v === me) {
                    if (c >= 5) score += 5000000;
                    else if (c === 4) score += 60000;
                    else if (c === 3) score += 3500;
                    else if (c === 2) score += 80;
                } else {
                    if (c >= 5) score -= 8000000;
                    else if (c === 4) score -= 90000;
                    else if (c === 3) score -= 4500;
                    else if (c === 2) score -= 100;
                }
            }
        }
    }
    return score;
}

/* ============================================================
   유틸
============================================================ */
function inside(x,y){return x>=0 && x<SIZE && y>=0 && y<SIZE;}
function setStatus(s){document.getElementById("statusBox").textContent=s;}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}

/* ============================================================
   초기 실행
============================================================ */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    startGame();
};


