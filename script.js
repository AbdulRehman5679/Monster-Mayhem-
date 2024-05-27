// script.js

// Initialize game variables
let grid = [];
let currentPlayer = 0;
const players = ["Player 1", "Player 2"];
const playerColors = ["rgba(255, 99, 71, 0.8)", "rgba(30, 144, 255, 0.8)"];
const playerMonsters = [10, 10]; // Initial lives set to 10
const monsters = ["V", "W", "G"]; // V for Vampire, W for Werewolf, G for Ghost

// Create the game grid
function createGrid() {
    const gridElement = document.getElementById("grid");
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement("div");
        cell.id = `cell-${i}`;
        cell.addEventListener("click", () => placeMonster(i));
        gridElement.appendChild(cell);
        grid.push({ monster: "", player: null });
    }
}

// Place a monster on the grid
function placeMonster(index) {
    if (grid[index].monster === "") {
        let monster = prompt("Enter V for Vampire, W for Werewolf, G for Ghost:").toUpperCase();
        if (monsters.includes(monster)) {
            grid[index] = { monster: monster, player: currentPlayer };
            document.getElementById(`cell-${index}`).textContent = monster;
            document.getElementById(`cell-${index}`).style.backgroundColor = playerColors[currentPlayer];
            switchPlayer();
        } else {
            alert("Invalid monster type! Please enter V, W, or G.");
        }
    } else {
        alert("Cell is already occupied!");
    }
}

// Move a monster on the grid
function moveMonster(fromIndex, toIndex) {
    if (grid[toIndex].monster === "" || resolveConflict(fromIndex, toIndex)) {
        grid[toIndex] = { ...grid[fromIndex] };
        document.getElementById(`cell-${toIndex}`).textContent = grid[toIndex].monster;
        document.getElementById(`cell-${toIndex}`).style.backgroundColor = playerColors[grid[toIndex].player];
        document.getElementById(`cell-${fromIndex}`).textContent = "";
        document.getElementById(`cell-${fromIndex}`).style.backgroundColor = "white";
        grid[fromIndex] = { monster: "", player: null };
    } else {
        alert("Invalid move!");
    }
}

// Resolve conflict between monsters
function resolveConflict(fromIndex, toIndex) {
    const { monster: monster1, player: player1 } = grid[fromIndex];
    const { monster: monster2, player: player2 } = grid[toIndex];

    if ((monster1 === "V" && monster2 === "W") || 
        (monster1 === "W" && monster2 === "G") || 
        (monster1 === "G" && monster2 === "V")) {
        // Rule-based elimination: monster1 eliminates monster2
        grid[toIndex] = { monster: monster1, player: player1 };
        document.getElementById(`cell-${toIndex}`).textContent = monster1;
        document.getElementById(`cell-${toIndex}`).style.backgroundColor = playerColors[player1];
        playerMonsters[player2]--;
        updateLives();
        checkElimination(player2);
        return true;
    } else if (monster1 === monster2) {
        // Same type monsters eliminate each other
        grid[toIndex] = { monster: "", player: null };
        grid[fromIndex] = { monster: "", player: null };
        document.getElementById(`cell-${toIndex}`).textContent = "";
        document.getElementById(`cell-${toIndex}`).style.backgroundColor = "white";
        document.getElementById(`cell-${fromIndex}`).textContent = "";
        document.getElementById(`cell-${fromIndex}`).style.backgroundColor = "white";
        playerMonsters[player1]--;
        playerMonsters[player2]--;
        updateLives();
        checkElimination(player1);
        checkElimination(player2);
        return true;
    }
    return false;
}

// Check if a player is eliminated
function checkElimination(player) {
    if (playerMonsters[player] <= 0) {
        alert(`${players[player]} is eliminated!`);
        playerMonsters[player] = 0;
    }
}

// Switch to the next player
function switchPlayer() {
    currentPlayer = (currentPlayer + 1) % players.length;
    document.getElementById("current-player").textContent = `Current Player: ${players[currentPlayer]}`;
}

// Update player lives display
function updateLives() {
    document.getElementById("player1-stats").textContent = `Player 1 Lives: ${playerMonsters[0]}`;
    document.getElementById("player2-stats").textContent = `Player 2 Lives: ${playerMonsters[1]}`;
}

// Start the game
document.getElementById("start-game").addEventListener("click", () => {
    grid = [];
    document.getElementById("grid").innerHTML = "";
    createGrid();
    currentPlayer = 0;
    playerMonsters[0] = 10;
    playerMonsters[1] = 10;
    document.getElementById("current-player").textContent = `Current Player: ${players[currentPlayer]}`;
    updateLives();
});

// Initialize the game on page load
window.onload = createGrid;

// Popup rules and tutorial functionality
const showRulesBtn = document.getElementById("show-rules");
const showTutorialBtn = document.getElementById("show-tutorial");
const rulesPopup = document.getElementById("rules-popup");
const tutorialPopup = document.getElementById("tutorial-popup");
const closeBtns = document.getElementsByClassName("close");

showRulesBtn.onclick = function() {
    rulesPopup.style.display = "block";
}

showTutorialBtn.onclick = function() {
    tutorialPopup.style.display = "block";
}

for (let closeBtn of closeBtns) {
    closeBtn.onclick = function() {
        closeBtn.parentElement.parentElement.style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target == rulesPopup) {
        rulesPopup.style.display = "none";
    } else if (event.target == tutorialPopup) {
        tutorialPopup.style.display = "none";
    }
}
