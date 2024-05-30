const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

let users = [];
let games = {};
let currentGameId = 1;
let playerStats = {};

const initialMonsters = ["V", "W", "G", "V", "W", "G"]; // 2 Vampires, 2 Werewolves, 2 Ghosts

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('login', (username) => {
        console.log(`User ${username} logged in with socket id ${socket.id}`);
        users.push({ id: socket.id, username });
        if (!playerStats[username]) {
            playerStats[username] = { wins: 0, losses: 0 };
        }
        let assignedGame = null;

        // Check if there is an available game with fewer than 4 players
        for (const [gameId, game] of Object.entries(games)) {
            if (game.players.length < 4) {
                assignedGame = gameId;
                game.players.push(username);
                placeInitialMonsters(game, game.players.length - 1);
                break;
            }
        }

        // If no available game, create a new one
        if (!assignedGame) {
            assignedGame = `game-${currentGameId++}`;
            games[assignedGame] = {
                grid: Array(100).fill(null).map(() => ({ monster: "", player: null })),
                players: [username],
                currentPlayer: 0,
                playerMonsters: [6, 6, 6, 6], // Each player starts with 6 monsters
                gameStatus: 'waiting',
            };
            placeInitialMonsters(games[assignedGame], 0);
        }

        socket.join(assignedGame);
        socket.emit('loginSuccess', { gameId: assignedGame, username });
        io.to(assignedGame).emit('updatePlayerList', games[assignedGame].players);

        if (games[assignedGame].players.length < 4) {
            io.to(assignedGame).emit('waitingForPlayer', 'Waiting for other players...');
        } else {
            startGameCountdown(assignedGame);
        }
    });

    const startGameCountdown = (gameId) => {
        let countdown = 3;
        const countdownInterval = setInterval(() => {
            io.to(gameId).emit('countdown', countdown);
            countdown--;
            if (countdown < 0) {
                clearInterval(countdownInterval);
                games[gameId].gameStatus = 'started';
                io.to(gameId).emit('startGame', games[gameId]);
                io.to(gameId).emit('updateGame', games[gameId]);
            }
        }, 1000);
    };

    socket.on('moveMonster', ({ gameId, username, fromIndex, toIndex }) => {
        console.log(`Move monster request from ${username} in game ${gameId} from ${fromIndex} to ${toIndex}`);
        const game = games[gameId]; // Ensure gameId is not null and game is defined
        if (!game) {
            socket.emit('error', 'Invalid game ID');
            return;
        }
        const playerIndex = game.players.indexOf(username);
        if (game && game.players.includes(username) && game.gameStatus === 'started') {
            const fromMonster = game.grid[fromIndex];
            const toMonster = game.grid[toIndex];
            if (fromMonster.player === playerIndex && (toMonster.monster === "" || resolveConflict(game, fromIndex, toIndex))) {
                game.grid[toIndex] = { ...fromMonster };
                game.grid[fromIndex] = { monster: "", player: null };
                game.currentPlayer = getNextPlayer(game);
                io.to(gameId).emit('updateGame', game);
                console.log(`Monster moved from ${fromIndex} to ${toIndex}`);
            } else {
                socket.emit('error', 'Invalid move');
                console.log(`Invalid move from ${fromIndex} to ${toIndex}`);
            }
        } else {
            socket.emit('error', 'Invalid game or player');
            console.log(`Invalid game or player: ${username}`);
        }
    });

    const placeInitialMonsters = (game, playerIndex) => {
        const gridSize = 10;
        const monstersPerPlayer = initialMonsters.length;

        // Calculate starting positions for each player
        const positions = [
            Array.from({ length: monstersPerPlayer }, (_, i) => i + 2), // Top row center
            Array.from({ length: monstersPerPlayer }, (_, i) => (i + 2) * gridSize + (gridSize - 1)), // Right column center
            Array.from({ length: monstersPerPlayer }, (_, i) => gridSize * (gridSize - 1) + i + 2), // Bottom row center
            Array.from({ length: monstersPerPlayer }, (_, i) => i * gridSize + 2) // Left column center
        ];

        for (let i = 0; i < monstersPerPlayer; i++) {
            const index = positions[playerIndex][i];
            game.grid[index] = { monster: initialMonsters[i], player: playerIndex };
        }
    };

    const resolveConflict = (game, fromIndex, toIndex) => {
        const { monster: monster1, player: player1 } = game.grid[fromIndex];
        const { monster: monster2, player: player2 } = game.grid[toIndex];

        if ((monster1 === "V" && monster2 === "W") ||
            (monster1 === "W" && monster2 === "G") ||
            (monster1 === "G" && monster2 === "V")) {
            game.playerMonsters[player2]--;
            checkGameOver(game, player2);
            return true;
        } else if (monster1 === monster2) {
            game.playerMonsters[player1]--;
            game.playerMonsters[player2]--;
            game.grid[toIndex] = { monster: "", player: null };
            checkGameOver(game, player1);
            checkGameOver(game, player2);
            return true;
        }
        return false;
    };

    const checkGameOver = (game, playerIndex) => {
        if (game.playerMonsters[playerIndex] <= 0) {
            const remainingPlayers = game.players.filter((_, index) => game.playerMonsters[index] > 0);
            if (remainingPlayers.length === 1) {
                const winner = remainingPlayers[0];
                io.to(winner).emit('gameOver', `${winner} wins!`);
                game.players.forEach(player => {
                    io.to(player).emit('gameOver', `${winner} wins!`);
                    if (player === winner) {
                        playerStats[player].wins++;
                    } else {
                        playerStats[player].losses++;
                    }
                });
                updatePlayerStats();
            }
        }
    };

    const getNextPlayer = (game) => {
        const activePlayers = game.players.map((player, index) => ({ player, index, count: game.grid.filter(cell => cell.player === index).length }));
        activePlayers.sort((a, b) => a.count - b.count || Math.random() - 0.5); // Sort by count, randomize ties
        return activePlayers[0].index;
    };

    const updatePlayerStats = () => {
        io.emit('updatePlayerStats', playerStats);
    };

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        users = users.filter(user => user.id !== socket.id);
    });
});

app.use(express.static('public'));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
