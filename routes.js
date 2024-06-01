const router = require("express").Router();
const passport = require("passport");
const User = require("./schema/user");
const Game = require("./schema/game");

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/game");
  }
  const errorMessage = req.flash("error");
  return res.render("login", { errorMessage });
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
    failureMessage: true,
  }),
  function (req, res) {
    res.redirect("/game");
  }
);

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log("Error logging out: ", err);
    }
    res.redirect("/");
  });
});

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) res.redirect("/game");
  res.render("register", {
    errorMessage: null,
  });
});

router.post("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/game");
  }
  const newUser = new User({
    name: req.body.name,
    username: req.body.username,
  });
  User.register(newUser, req.body.password, (err) => {
    if (err) {
      if (err.name === "MissingUsernameError") {
        return res.render("register", {
          errorMessage: "Please enter a username",
        });
      } else if (err.name === "MissingPasswordError") {
        return res.render("register", {
          errorMessage: "Please enter a password",
        });
      } else if (err.name === "UserExistsError") {
        return res.render("register", {
          errorMessage: "This username already exists",
        });
      } else {
        return res.render("register", { errorMessage: "An error occurred" });
      }
    }
    passport.authenticate("local")(req, res, () => {
      return res.redirect("/game");
    });
  });
});

router.get("/game", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const user = req.user;
  let game = await Game.findOne({
    status: "ongoing",
    players: { $size: 1 },
  });

  if (game) {
    if (game.players[0]._id.toString() === user._id.toString()) {
      game = await game.populate("players");
      return res.render("game", { user, game });
    }
    game.players.push(user._id);
    await game.save();
  } else {
    game = new Game({
      players: [user._id],
      grid: Array(10)
        .fill()
        .map(() => Array(10).fill({ monster: null })),
    });
    await game.save();
    game = await Game.findById(game._id);
  }

  if (game.players.length === 2) {
    const monsterTypes = ["vampire", "werewolf", "ghost"];
    const player1MonsterCount = 10;
    const player2MonsterCount = 10;

    for (let i = 0; i < player1MonsterCount; i++) {
      const row = 0;
      const randomCol = Math.floor(Math.random() * 10);
      if (!game.grid[row][randomCol].monster) {
        const randomMonsterType =
          monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        game.grid[row][randomCol].monster = {
          type: randomMonsterType,
          player: game.players[0]._id,
        };
      } else {
        i--;
      }
    }

    for (let i = 0; i < player2MonsterCount; i++) {
      const row = 9;
      const randomCol = Math.floor(Math.random() * 10);
      if (!game.grid[row][randomCol].monster) {
        const randomMonsterType =
          monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        game.grid[row][randomCol].monster = {
          type: randomMonsterType,
          player: game.players[1]._id,
        };
      } else {
        i--;
      }
    }

    game.turn = game.players[Math.floor(Math.random() * game.players.length)]._id;
    await game.save();
  }

  game = await game.populate("players");
  return res.render("game", { user, game });
});

router.get("/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const user = req.user;
  console.log(user);
  res.render("profile", { user });
});

module.exports = router;
