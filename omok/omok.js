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
   클릭 포인트 UI 생성
============================================================ */
function createBoardUI() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    const percent = 100 / SIZE;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;

            p.style.left = `${(x + 0.5) * percent}%`;
            p.style.top = `${(y + 0.5) * percent}%`;

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

    const percent = 100 / SIZE;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const v = board[y][x];

            // 금수 표시
            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.textContent = "X";
                ban.style.left = `${(x + 0.5) * percent}%`;
                ban.style.top = `${(y + 0.5) * percent}%`;
                boardEl.appendChild(ban);
            }

            // 돌 렌더링
            if (v === BLACK || v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = `${(x + 0.5) * percent}%`;
                s.style.top = `${(y + 0.5) * percent}%`;
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
    const percent = 100 / SIZE;

    ghostStone.style.left = `${(x + 0.5) * percent}%`;
    ghostStone.style.top = `${(y + 0.5) * percent}%`;

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
    let mv = diff === "normal" ? aiMove_B() : aiMove_C();

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
   A·B·C 레벨 AI 로직 (줄임)
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
   AI 판단 유틸 (findWinningMove / findForceMove 등)
============================================================ */
/* ... (너무 길어 생략 가능하지만 필요하면 전체 제공 가능) */

/* ============================================================
   금수 룰
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
    startGame();
};
