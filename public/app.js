const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require('dotenv');
const app = express();
const port = process.env.PORT || 1818;

mongoose.connect(
  "mongodb+srv://18:18@cluster0.y0trz92.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const gameSchema = new mongoose.Schema({
  image: String,
  title: String,
  content: String,
  releaseDate: Date,
  genre: String,
  addedDate: { type: Date, default: Date.now },
});
require('dotenv').config();


const Game = mongoose.model("Game", gameSchema);
const authenticate = (req, res, next) => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.set("WWW-Authenticate", 'Basic realm="Authorization Required"');
    return res.status(401).send("Authorization Required");
  }

  const auth = Buffer.from(authHeader.split(" ")[1], "base64")
    .toString()
    .split(":");
  const enteredUsername = auth[0];
  const enteredPassword = auth[1];

  if (enteredUsername === username && enteredPassword === password) {
    next();
  } else {
    res.set("WWW-Authenticate", 'Basic realm="Authorization Required"');
    res.status(401).send("Authorization Required");
  }
};
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs"); // Set the view engine to use EJS

app.get("/", async (req, res) => {
  const games = await Game.find();
  res.render("index", { games });
});

app.get("/addgames", authenticate, (req, res) => {
  res.render("addgames"); 
});
app.get("/admin", authenticate, (req, res) => {
  res.render("admin"); 
});

app.post("/addgames", authenticate, async (req, res) => {
  const { image, title, content, releaseDate, genre } = req.body;
  const newGame = new Game({ image, title, content, releaseDate, genre });
  await newGame.save();
  res.redirect("/");
});
app.get("/games/:id", async (req, res) => {
  const gameId = req.params.id;
  const game = await Game.findById(gameId);

  if (!game) {
    res.status(404).send("Game not found");
    return;
  }

  res.render("gamedetails", { game });
});

app.get("/genres", async (req, res) => {
  const distinctGenres = await Game.distinct("genre");
  res.render("genres", { genres: distinctGenres });
});

app.get("/genre/:genre", async (req, res) => {
  const genre = decodeURIComponent(req.params.genre);
  const games = await Game.find({ genre });

  res.render("index", { games, searchQuery: "", selectedGenre: genre });
});
app.get("/delete/:id", async (req, res) => {
  const gameId = req.params.id;

  try {
    // Find the game by ID and remove it from the database
    await Game.findByIdAndRemove(gameId);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Error deleting game");
  }
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
