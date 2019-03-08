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
app.use(express.static(path.join(__dirname, 'images')));
if (process.env.NODE_ENV === 'production') {
	app.use(express.static(path.join(__dirname, 'dist')));
	app.get('*', (req, res) => {
		res.sendFile(path.join(__dirname, 'dist', 'index.html'));
	});
} else {
	const webpack = require('webpack');
	const webpackDevMiddleware = require('webpack-dev-middleware');
	const config = require('./webpack.dev');
	const supertest = require('supertest');
	const compiler = webpack(config);
	const request = supertest(app);
	app.use(webpackDevMiddleware(compiler, {
		publicPath: config.output.publicPath
	}));
	app.get('*', (req, res) => {
		request.get('/').end((err, { text: html }) => {
			if (err) {
				res.status(500).send(err);
			} else {
				res.send(html);
			}
		});
	});
}

// database
mongoose.connect(
	process.env.MONGODB_URI || "mongodb://localhost/diviz",
	{ useNewUrlParser: true }
);
const connection = mongoose.connection;
connection.on("error", (e) => debug("connection error:", e));
connection.on("connected", () => {});

module.exports = app;
