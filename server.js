const express = require("express");
const bodyParser = require("body-parser");
require("ejs");
const http = require("http");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const User = require("./schema/user");
const flash = require("connect-flash");
const { Server } = require("socket.io");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const mongoConnect = require("./mongoConnect");
const Game = require("./schema/game");
mongoConnect();

app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

const store = new MongoDBStore({
  mongoUrl: process.env.MONGO_URI,
  collection: "sessions",
});

store.on("error", function (error) {
  console.log("Session store error:", error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const LocalStrategy = require("passport-local").Strategy;
passport.use(new LocalStrategy(User.authenticate()));

app.use("/", require("./routes"));

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}. http://localhost:${PORT}/`);
});

const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("joinGame", ({ gameId }) => {
    socket.join(gameId);
  });
  socket.on("game", ({ gameId, game }) => {
    io.to(gameId).emit("game", game);
  });
  socket.on("result", ({ gameId, players, winner }) => {
    updatePlayers(players, winner);
    updateGame(gameId);
  });

  socket.on("monsterEliminated", async ({ gameId, player }) => {
    const game = await Game.findById(gameId);
    if (player === game.players[0]._id.toString()) {
      game.eliminatedMonsters.player1 += 1;
      if (game.eliminatedMonsters.player1 >= 10) {
        game.status = "finished";
        await game.save();
        io.to(gameId).emit("result", { gameId, players: game.players, winner: game.players[1] });
        return;
      }
    } else {
      game.eliminatedMonsters.player2 += 1;
      if (game.eliminatedMonsters.player2 >= 10) {
        game.status = "finished";
        await game.save();
        io.to(gameId).emit("result", { gameId, players: game.players, winner: game.players[0] });
        return;
      }
    }
    await game.save();
    io.to(gameId).emit("game", game);
  });
});

async function updatePlayers(players, winner) {
  const player0 = await User.findById(players[0]);
  const player1 = await User.findById(players[1]);
  if (winner) {
    if (winner === players[0]) {
      player0.gamesWon++;
      player1.gamesLost++;
    } else {
      player1.gamesWon++;
      player0.gamesLost++;
    }
  } else {
    player0.gamesDrawn++;
    player1.gamesDrawn++;
  }
  await player0.save();
  await player1.save();
}

async function updateGame(gameId) {
  const game = await Game.findById(gameId);
  game.status = "finished";
  await game.save();
}
