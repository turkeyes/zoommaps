const express = require("express");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const debug = require('debug')('server:server');
const routes = require("./routes/index");

const app = express();

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api', routes);
app.use(express.static(path.join(__dirname, '..', 'datasets', 'images')));
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// database
mongoose.connect(
	process.env.MONGODB_URI || "mongodb://localhost/zoommaps",
	{ useNewUrlParser: true }
);
const connection = mongoose.connection;
connection.on("error", (e) => debug("connection error:", e));
connection.on("connected", () => {});

module.exports = app;
