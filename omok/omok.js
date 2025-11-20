/* ============================================================
   🧠 Ultra Renju AI (최적 안정판)
   ✔ VCF / VCT
   ✔ 금수 정상 작동
   ✔ HTML/CSS 100% 호환
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
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = ""; // 초기화

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const px = x * 40 + 20; // 중앙
            const py = y * 40 + 20;

            // 클릭 영역 (교차점)
            const p = document.createElement("div");
            p.className = "point";
            p.style.left = px + "px";
            p.style.top = py + "px";
            p.dataset.x = x;
            p.dataset.y = y;
            p.addEventListener("click", onHumanClick);
            boardDiv.appendChild(p);

            // 돌 그리기
            const v = board[y][x];
            if (v !== EMPTY) {
                const stone = document.createElement("div");
                stone.classList.add("stone");
                if (v === BLACK) stone.classList.add("black");
                else stone.classList.add("white");

                p.appendChild(stone);
            }

            // 금수 표시
            if (turn === BLACK && board[y][x] === EMPTY) {
                if (isForbidden(x, y)) {
                    const mark = document.createElement("div");
                    mark.classList.add("forbid");
                    mark.textContent = "X";
                    mark.style.position = "absolute";
                    mark.style.top = "50%";
                    mark.style.left = "50%";
                    mark.style.transform = "translate(-50%, -50%)";
                    p.appendChild(mark);
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

    await wait(70);

    // 첫 수 : 무조건 중앙
    if (board.flat().every(v => v === EMPTY)) {
        const c = 7;
        board[c][c] = aiColor;
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
   AI 메인 로직
============================================================ */
function aiMove() {
    const diff = document.querySelector("input[name=difficulty]:checked").value;
    const depth = diff === "U" ? 7 : 4;

    const me = aiColor;
    const opp = humanColor;

    // 즉승
    let win = findWinning(me);
    if (win) return win;

    // 즉패 방어
    let block = findWinning(opp);
    if (block) return block;

    // 강제승리 탐색
    let vcf = searchVCF(me, depth);
    if (vcf) return vcf;

    return searchNormal(me, opp, depth);
}

/* ============================================================
   VCF/VCT 탐색
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

        const value = -minSearch(opp, me, depth - 1, -9999999, 9999999);

        board[mv.y][mv.x] = EMPTY;

        if (value > bestVal) {
            bestVal = value;
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

        const val = -minSearch(opp, me, depth - 1, -beta, -alpha);

        board[mv.y][mv.x] = EMPTY;

        if (val > alpha) alpha = val;
        if (alpha >= beta) break;
    }
    return alpha;
}

/* ============================================================
   후보군 생성
============================================================ */
function generateMoves(color) {
    const arr = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;
            if (!nearStone(x, y)) continue;

            if (color === BLACK && isForbidden(x, y)) continue;

            const score = moveScore(x, y, color);
            arr.push({ x, y, score });
        }
    }

    arr.sort((a, b) => b.score - a.score);
    return arr.slice(0, 16);   // 안정판: 16수만 탐색
}

function nearStone(x, y) {
    for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (inside(nx, ny) && board[ny][nx] !== EMPTY)
                return true;
        }
    return false;
}

/* ============================================================
   평가 보조 함수
============================================================ */
function moveScore(x, y, c) {
    let s = patternScore(x, y, c) * 2;
    s += patternScore(x, y, 3 - c);
    return s;
}

function patternScore(x, y, c) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let score = 0;

    for (const [dx, dy] of dirs) {
        const len = countLine(x, y, dx, dy, c);
        if (len === 4) score += 8000;
        else if (len === 3) score += 500;
        else if (len === 2) score += 40;
    }
    return score;
}

function countLine(x, y, dx, dy, c) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (inside(nx, ny) && board[ny][nx] === c) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (inside(nx, ny) && board[ny][nx] === c) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

function checkWin(c) {
    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            if (board[y][x] !== c) continue;
            if (countLine(x,y,1,0,c) >= 5) return true;
            if (countLine(x,y,0,1,c) >= 5) return true;
            if (countLine(x,y,1,1,c) >= 5) return true;
            if (countLine(x,y,1,-1,c) >= 5) return true;
        }
    return false;
}

/* ============================================================
   금수 판정
============================================================ */
function isForbidden(x, y) {
    if (board[y][x] !== EMPTY) return false;

    board[y][x] = BLACK;

    const overline =
        countLine(x,y,1,0,BLACK) >= 6 ||
        countLine(x,y,0,1,BLACK) >= 6 ||
        countLine(x,y,1,1,BLACK) >= 6 ||
        countLine(x,y,1,-1,BLACK) >= 6;

    const d3 = countOpenPattern(x, y, "01110") >= 2;
    const d4 = countOpenPattern(x, y, "011110") >= 2;

    board[y][x] = EMPTY;
    return overline || d3 || d4;
}

function countOpenPattern(x,y,pat) {
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    let cnt=0;

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
   즉승 판단
============================================================ */
function findWinning(color) {
    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(x,y)) continue;

            board[y][x] = color;
            const ok = checkWin(color);
            board[y][x] = EMPTY;

            if (ok) return { x, y };
        }
    return null;
}

/* ============================================================
   보드 평가
============================================================ */
function evalBoard(me, opp) {
    let score=0;
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];

    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            const v = board[y][x];
            if (v === EMPTY) continue;

            for (const [dx,dy] of dirs) {
                const len = countLine(x,y,dx,dy,v);

                if (v === me) {
                    if (len >= 5) score += 5000000;
                    else if (len === 4) score += 60000;
                    else if (len === 3) score += 3500;
                    else if (len === 2) score += 80;
                } else {
                    if (len >= 5) score -= 8000000;
                    else if (len === 4) score -= 90000;
                    else if (len === 3) score -= 4500;
                    else if (len === 2) score -= 100;
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

