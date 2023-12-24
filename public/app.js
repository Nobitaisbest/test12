const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const app = express();
const port = process.env.PORT || 1818;
app.set("views", path.join(__dirname, "views"));
mongoose.connect(
  "mongodb+srv://18:18@cluster0.y0trz92.mongodb.net/?retryWrites=true&w=majority"
);

const gameSchema = new mongoose.Schema({
  image: String,
  title: String,
  content: String,
  releaseDate: Date,
  genre: String,
  addedDate: { type: Date, default: Date.now },
});
require("dotenv").config();

console.log("using nodemon");
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

app.set("view engine", "ejs");
const parseHyperlinks = (text) => {
  const regex = /\[(.*?)\]\{(.*?)\}/g;

  return text.replace(regex, '<a href="$2" target="_blank">$1</a>');
};
app.get("/", async (req, res) => {
  const searchQuery = req.query.q || "";
  const parseHyperlinks = (text) => {
    const regex = /\[(.*?)\]\{(.*?)\}/g;

    return text.replace(regex, '<a href="$2" target="_blank">$1</a>');
  };
  const games = await Game.find();
  res.render("index", { games, parseHyperlinks , searchQuery });
});

app.get("/addgames", authenticate, (req, res) => {
  res.render("addgames");
});
app.get("/admin", authenticate, async (req, res) => {
  const games = await Game.find();
  res.render("admin", { games });
});

app.post("/addgames", authenticate, async (req, res) => {
  const { image, title, content, releaseDate, genre } = req.body;

  const formattedContent = parseHyperlinks(content);

  const newGame = new Game({
    image,
    title,
    content: formattedContent,
    releaseDate,
    genre,
  });

  await newGame.save();
  res.redirect("/");
});
app.get("/search", async (req, res) => {
  try {
    const searchQuery = req.query.q || "";
    const games = await Game.find({
      $or: [
        { title: { $regex: searchQuery, $options: "i" } }, 
        { content: { $regex: searchQuery, $options: "i" } }, 
        { genre: { $regex: searchQuery, $options: "i" } },
      ],
    });

    res.render("index", { games, searchQuery, parseHyperlinks });
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/games/:id", async (req, res) => {
  const gameId = req.params.id;
  const game = await Game.findById(gameId);
  const parseHyperlinks = (text) => {
    const regex = /\[(.*?)\]\{(.*?)\}/g;

    return text.replace(regex, '<a href="$2" target="_blank">$1</a>');
  };
  if (!game) {
    res.status(404).send("Game not found");
    return;
  }

  res.render("gamedetails", { game , parseHyperlinks });
});
// GENRE
app.get("/genres", async (req, res) => {
  const distinctGenres = await Game.distinct("genre");
  res.render("genres", { genres: distinctGenres });
});

app.get("/genre/:genre", async (req, res) => {
  const genre = decodeURIComponent(req.params.genre);
  const games = await Game.find({ genre });

  res.render("index", { games, searchQuery: "", selectedGenre: genre });
});
// DELETING
app.get("/delete/:id", async (req, res) => {
  const gameId = req.params.id;

  try {
    // Find the game by ID and remove it from the database
    const deletedGame = await Game.findByIdAndDelete(gameId);

    if (!deletedGame) {
      return res.status(404).send("Game not found");
    }

    res.redirect("/");
  } catch (error) {
    console.error(error);  // Log the error for debugging
    res.status(500).send(`Error deleting game: ${error.message}`);
  }
});
// EDITING
app.get("/edit/:id", async (req, res) => {
  const gameId = req.params.id;

  try {
    const game = await Game.findById(gameId);

    if (!game) {
      res.status(404).send("Game not found");
      return;
    }

    res.render("editgames", { game });
  } catch (error) {
    res.status(500).send("Error fetching game details");
  }
});

app.post("/edit/:id", async (req, res) => {
  const gameId = req.params.id;
  const { title, content, releaseDate, genre } = req.body;

  try {
    await Game.findByIdAndUpdate(gameId, {
      title,
      content,
      releaseDate,
      genre,
    });

    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Error updating game details");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
