const socket = io();

let grid = [];
let currentPlayer = 0;
let playerIndex = null;
let gameId = null;
let username = null;
let selectedMonster = null;
const players = ["Player 1", "Player 2", "Player 3", "Player 4"];
const playerColors = ["rgba(255, 99, 71, 0.8)", "rgba(30, 144, 255, 0.8)", "rgba(144, 238, 144, 0.8)", "rgba(255, 215, 0, 0.8)"];
const playerMonsters = [6, 6, 6, 6]; // Initial lives set to 6 (each player starts with 6 monsters)
const monsters = ["V", "W", "G"]; // V for Vampire, W for Werewolf, G for Ghost


function highlightMoves(index) {
    console.log(`Highlighting moves for index: ${index}`);
    clearHighlight();
    const possibleMoves = calculatePossibleMoves(index);
    possibleMoves.forEach(move => {
        getElementById(`cell-${move}`).classList.add('highlight');
        console.log(`Highlighting cell ${move}`);
    });
}
// Utility functions
function getElementById(id) {
    return document.getElementById(id);
}

function createCell(index) {
    const cell = document.createElement("div");
    cell.id = `cell-${index}`;
    cell.addEventListener("click", () => handleCellClick(index));
    return cell;
}

// Create the game grid
function createGrid() {
    const gridElement = getElementById("grid");
    for (let i = 0; i < 100; i++) {
        const cell = createCell(i);
        gridElement.appendChild(cell);
        grid.push({ monster: "", player: null });
        console.log(`Created cell ${i} with id cell-${i}`);
    }
}

function handleCellClick(index) {
    console.log(`Cell ${index} clicked`);
    if (selectedMonster !== null) {
        moveMonster(index);
    } else {
        selectMonster(index);
    }
}

function moveMonster(index) {
    console.log(`Attempting to move monster from ${selectedMonster} to ${index}`);
    if (grid[index].monster === "" && isMoveValid(selectedMonster, index)) {
        socket.emit('moveMonster', { gameId, username, fromIndex: selectedMonster, toIndex: index });
        selectedMonster = null;
        clearHighlight();
    } else {
        alert("Invalid move!");
    }
}

function selectMonster(index) {
    if (grid[index].player === playerIndex) {
        console.log(`Monster selected at index: ${index}`);
        selectedMonster = index;
        highlightMoves(index);
    } else {
        console.log(`Invalid selection at index: ${index}`);
    }
}

function isMoveValid(fromIndex, toIndex) {
    const fromRow = Math.floor(fromIndex / 10);
    const fromCol = fromIndex % 10;
    const toRow = Math.floor(toIndex / 10);
    const toCol = toIndex % 10;

    return (fromRow === toRow || fromCol === toCol || (Math.abs(fromRow - toRow) <= 2 && Math.abs(fromCol - toCol) <= 2));
}

function calculatePossibleMoves(index) {
    const possibleMoves = [];
    const row = Math.floor(index / 10);
    const col = index % 10;

    // Add row and column moves
    for (let i = 0; i < 10; i++) {
        if (grid[row * 10 + i].monster === "" && col !== i) {
            possibleMoves.push(row * 10 + i);
        }
        if (grid[i * 10 + col].monster === "" && row !== i) {
            possibleMoves.push(i * 10 + col);
        }
    }

    // Add surrounding cells within 2 moves
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            if (Math.abs(i) === 2 || Math.abs(j) === 2) {
                const newRow = row + i;
                const newCol = col + j;
                const newIndex = newRow * 10 + newCol;
                if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && grid[newIndex].monster === "" && newIndex !== index) {
                    possibleMoves.push(newIndex);
                }
            }
        }
    }
    return possibleMoves;
}



function clearHighlight() {
    const highlightedCells = document.querySelectorAll('.highlight');
    highlightedCells.forEach(cell => cell.classList.remove('highlight'));
}

function updateGrid(game) {
    game.grid.forEach((cell, index) => {
        const cellElement = getElementById(`cell-${index}`);
        cellElement.textContent = cell.monster;
        cellElement.style.backgroundColor = cell.player !== null ? playerColors[cell.player] : 'white';
    });
    getElementById("player1-stats").textContent = `${game.players[0]} Lives: ${game.playerMonsters[0]}`;
    getElementById("player2-stats").textContent = `${game.players[1]} Lives: ${game.playerMonsters[1]}`;
    getElementById("player3-stats").textContent = `${game.players[2]} Lives: ${game.playerMonsters[2]}`;
    getElementById("player4-stats").textContent = `${game.players[3]} Lives: ${game.playerMonsters[3]}`;
    getElementById("current-player").textContent = `Current Player: ${game.players[game.currentPlayer]}`;
    currentPlayer = game.currentPlayer;
}

getElementById("login-button").addEventListener("click", () => {
    username = getElementById("username").value;
    if (username) {
        socket.emit('login', username);
    }
});

socket.on('loginSuccess', ({ gameId, username }) => {
    getElementById("login-screen").style.display = "none";
    getElementById("game-screen").style.display = "flex";
    getElementById("player-name").textContent = username;
    console.log(`Logged in as ${username} in game ${gameId}`);
    this.gameId = gameId;
    this.username = username;
    socket.emit('joinGame', { gameId, username });
});

socket.on('waitingForPlayer', (message) => {
    alert(message);
});

socket.on('startGame', (game) => {
    getElementById("countdown").style.display = "none";
    getElementById("grid-container").style.display = "block";
    updateGrid(game);
    playerIndex = game.players.indexOf(username);
});

socket.on('updateGame', (game) => {
    updateGrid(game);
    playerIndex = game.players.indexOf(username);
});

socket.on('countdown', (count) => {
    getElementById("countdown").style.display = "block";
    getElementById("countdown").textContent = `Starting in ${count} seconds...`;
});

socket.on('updatePlayerList', (players) => {
    let playerStats = "";
    players.forEach((player, index) => {
        playerStats += `<div id="player${index+1}-stats">${player} Lives: 6</div>`;
    });
    getElementById("stats").innerHTML = playerStats + `<div id="current-player">Current Player: Player 1</div>`;
});

socket.on('gameOver', (message) => {
    alert(message);
});

socket.on('error', (errorMessage) => {
    console.error('Error:', errorMessage);
});

// Initialize the game on page load
window.onload = createGrid;

// Popup rules functionality
const showRulesBtn = getElementById("show-rules");
const rulesPopup = getElementById("rules-popup");
const closeBtn = document.getElementsByClassName("close")[0];

showRulesBtn.onclick = function() {
    rulesPopup.style.display = "block";
}

closeBtn.onclick = function() {
    rulesPopup.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == rulesPopup) {
        rulesPopup.style.display = "none";
    }
}
