/* =======================================================
   오목 렌주룰 + 교차점 렌더링 + AI
======================================================= */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let turn = BLACK;
let humanColor = BLACK;
let aiColor = WHITE;
let gameOver = false;

/* ====================== 유틸 ====================== */

function inside(x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

function setStatus(s) {
    document.getElementById("statusBox").textContent = s;
}

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/* ====================== 보드 ====================== */

function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ====================== 렌더 ====================== */

function renderBoard() {
    const div = document.getElementById("board");
    div.innerHTML = "";

    const cell = 100 / SIZE;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const p = document.createElement("div");
            p.className = "point";
            p.style.left = (x + 0.5) * cell + "%";
            p.style.top  = (y + 0.5) * cell + "%";
            p.dataset.x = x;
            p.dataset.y = y;
            p.addEventListener("click", onHumanClick);
            div.appendChild(p);

            const v = board[y][x];

            if (v !== EMPTY) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = (x + 0.5) * cell + "%";
                s.style.top  = (y + 0.5) * cell + "%";
                div.appendChild(s);
            }

            if (turn === BLACK && v === EMPTY && isForbidden(x, y)) {
                const f = document.createElement("div");
                f.className = "forbid";
                f.textContent = "X";
                f.style.left = (x + 0.5) * cell + "%";
                f.style.top  = (y + 0.5) * cell + "%";
                div.appendChild(f);
            }
        }
    }
}

/* ====================== 인간 착수 ====================== */

function onHumanClick(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = Number(e.target.dataset.x);
    const y = Number(e.target.dataset.y);

    if (!inside(x, y)) return;
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

/* ====================== 게임 시작 ====================== */

function startGame() {
    gameOver = false;

    const fp = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = fp === "human" ? BLACK : WHITE;
    aiColor = humanColor === BLACK ? WHITE : BLACK;

    initBoard();
    renderBoard();

    turn = BLACK;
    setStatus("게임 시작!");

    if (fp === "ai") aiStart();
}

document.getElementById("resetBtn").onclick = startGame;

/* ====================== 승리 판단 ====================== */

function checkWin(c) {
    const dirs = [
        [1,0], [0,1], [1,1], [1,-1]
    ];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== c) continue;

            for (const [dx, dy] of dirs) {
                let cnt = 1;

                let nx = x + dx, ny = y + dy;
                while (inside(nx, ny) && board[ny][nx] === c) {
                    cnt++; nx += dx; ny += dy;
                }

                nx = x - dx; ny = y - dy;
                while (inside(nx, ny) && board[ny][nx] === c) {
                    cnt++; nx -= dx; ny -= dy;
                }

                if (cnt >= 5) return true;
            }
        }
    }
    return false;
}

/* ====================== 금수 (렌주룰) ====================== */

function isForbidden(x, y) {
    if (board[y][x] !== EMPTY) return false;

    board[y][x] = BLACK;

    const over5 =
        countLine(x,y,1,0) >= 6 ||
        countLine(x,y,0,1) >= 6 ||
        countLine(x,y,1,1) >= 6 ||
        countLine(x,y,1,-1) >= 6;

    const d3 = countPattern(x, y, "01110") >= 2;
    const d4 = countPattern(x, y, "011110") >= 2;

    board[y][x] = EMPTY;

    return over5 || d3 || d4;
}

function countLine(x,y,dx,dy){
    let cnt=1;
    let nx=x+dx, ny=y+dy;
    while(inside(nx,ny)&&board[ny][nx]===BLACK){cnt++; nx+=dx; ny+=dy;}
    nx=x-dx; ny=y-dy;
    while(inside(nx,ny)&&board[ny][nx]===BLACK){cnt++; nx-=dx; ny-=dy;}
    return cnt;
}

function countPattern(x,y,pat){
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    let cnt=0;

    for(const[dx,dy]of dirs){
        let s="";
        for(let k=-4;k<=4;k++){
            const nx=x+dx*k, ny=y+dy*k;
            if(!inside(nx,ny)) s+="3";
            else if(board[ny][nx]===BLACK) s+="1";
            else if(board[ny][nx]===WHITE) s+="2";
            else s+="0";
        }
        if(s.includes(pat)) cnt++;
    }
    return cnt;
}

/* ====================== AI ====================== */

function aiStart(){
    if (gameOver) return;

    wait(80).then(()=>{
        const diff = document.querySelector("input[name=difficulty]:checked").value;
        const depth = diff === "U" ? 4 : 2;

        const mv = aiMove(depth);
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
    });
}

function aiMove(depth){
    // 즉승
    let w = findWinning(aiColor);
    if(w) return w;

    // 즉패방어
    let b = findWinning(humanColor);
    if(b) return b;

    // 후보
    let best=null, bestVal=-999999;

    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            if(board[y][x]!==EMPTY)continue;

            if(aiColor===BLACK && isForbidden(x,y)) continue;

            board[y][x]=aiColor;
            let val = -evaluate(depth-1, humanColor, -999999,999999);
            board[y][x]=EMPTY;

            if(val>bestVal){
                bestVal=val;
                best={x,y};
            }
        }
    }
    return best;
}

function evaluate(depth, turn, alpha, beta){
    if(depth===0) return scoreBoard();

    let best=-999999;

    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            if(board[y][x]!==EMPTY) continue;

            if(turn===BLACK && isForbidden(x,y)) continue;

            board[y][x]=turn;
            let val=-evaluate(depth-1,3-turn,-beta,-alpha);
            board[y][x]=EMPTY;

            if(val>best) best=val;
            if(best>alpha) alpha=best;
            if(alpha>=beta) return alpha;
        }
    }
    return alpha;
}

function scoreBoard(){
    let s=0;
    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            if(board[y][x]===EMPTY)continue;
            let v=board[y][x]===aiColor?1:-1;
            s+=v;
        }
    }
    return s;
}

function findWinning(c){
    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            if(board[y][x]!==EMPTY)continue;
            if(c===BLACK && isForbidden(x,y)) continue;

            board[y][x]=c;
            let ok=checkWin(c);
            board[y][x]=EMPTY;
            if(ok) return {x,y};
        }
    }
    return null;
}

/* ====================== 초기 실행 ====================== */

startGame();
