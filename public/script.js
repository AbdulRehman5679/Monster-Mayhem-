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

// Create the game grid
function createGrid() {
    const gridElement = document.getElementById("grid");
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement("div");
        cell.id = `cell-${i}`;
        cell.addEventListener("click", () => handleCellClick(i));
        gridElement.appendChild(cell);
        grid.push({ monster: "", player: null });
    }
}

function handleCellClick(index) {
    if (selectedMonster !== null) {
        moveMonster(index);
    } else {
        selectMonster(index);
    }
}

// Move a monster on the grid
function moveMonster(index) {
    if (grid[index].monster === "" || (grid[index].player !== playerIndex)) {
        socket.emit('moveMonster', { gameId, username, fromIndex: selectedMonster, toIndex: index });
        selectedMonster = null;
    } else {
        alert("Invalid move!");
    }
}

function selectMonster(index) {
    if (grid[index].player === playerIndex) {
        selectedMonster = index;
    }
}

function updateGrid(game) {
    game.grid.forEach((cell, index) => {
        document.getElementById(`cell-${index}`).textContent = cell.monster;
        document.getElementById(`cell-${index}`).style.backgroundColor = cell.player !== null ? playerColors[cell.player] : 'white';
    });
    document.getElementById("player1-stats").textContent = `${game.players[0]} Lives: ${game.playerMonsters[0]}`;
    document.getElementById("player2-stats").textContent = `${game.players[1]} Lives: ${game.playerMonsters[1]}`;
    document.getElementById("player3-stats").textContent = `${game.players[2]} Lives: ${game.playerMonsters[2]}`;
    document.getElementById("player4-stats").textContent = `${game.players[3]} Lives: ${game.playerMonsters[3]}`;
    document.getElementById("current-player").textContent = `Current Player: ${game.players[game.currentPlayer]}`;
    currentPlayer = game.currentPlayer;
}

document.getElementById("login-button").addEventListener("click", () => {
    username = document.getElementById("username").value;
    if (username) {
        socket.emit('login', username);
    }
});

socket.on('loginSuccess', ({ gameId, username }) => {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "flex";
    document.getElementById("player-name").textContent = username;
    console.log(`Logged in as ${username} in game ${gameId}`);
    this.gameId = gameId;
    this.username = username;
    socket.emit('joinGame', { gameId, username });
});

socket.on('waitingForPlayer', (message) => {
    alert(message);
});

socket.on('startGame', (game) => {
    document.getElementById("countdown").style.display = "none";
    document.getElementById("grid-container").style.display = "block";
    updateGrid(game);
    playerIndex = game.players.indexOf(username);
});

socket.on('updateGame', (game) => {
    updateGrid(game);
    playerIndex = game.players.indexOf(username);
});

socket.on('countdown', (count) => {
    document.getElementById("countdown").style.display = "block";
    document.getElementById("countdown").textContent = `Starting in ${count} seconds...`;
});

socket.on('updatePlayerList', (players) => {
    let playerStats = "";
    players.forEach((player, index) => {
        playerStats += `<div id="player${index+1}-stats">${player} Lives: 6</div>`;
    });
    document.getElementById("stats").innerHTML = playerStats + `<div id="current-player">Current Player: Player 1</div>`;
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
const showRulesBtn = document.getElementById("show-rules");
const rulesPopup = document.getElementById("rules-popup");
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
