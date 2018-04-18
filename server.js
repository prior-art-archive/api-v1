/* eslint-disable global-require */

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import passport from 'passport';

import { sequelize, Company } from './models';

/* -------------------------------- */
/* Initialize development variables */
/* -------------------------------- */
if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
	console.debug = function() {};
}
// console.debug = console.info;
console.debug = function() {};
/* -------------------------------- */
/* -------------------------------- */

const app = express();
export default app;
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

/* -------- */
/* Configure app session */
/* -------- */
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

app.use(session({
	secret: 'sessionsecret',
	resave: false,
	saveUninitialized: false,
	store: new SequelizeStore({
		db: sequelize
	}),
	cookie: {
		path: '/',
		httpOnly: false,
		secure: false,
		maxAge: 30 * 24 * 60 * 60 * 1000// = 30 days.
	},
}));

/* -------- */
/* Configure app CORS */
/* -------- */
const whitelist = [
	// Localhost
	'http://localhost:8080',
	'http://localhost:5000',
	'https://www.priorartarchive.org',
	'https://dev.priorartarchive.org',
];

const corsOptions = {
	origin: function (origin, callback) {
		// This assumes the browser implements CORS.
		// origin being undefined means the request is made on a local route
		// const originIsWhitelisted = whitelist.indexOf(origin) !== -1 || origin === undefined;
		const originIsWhitelisted = true;
		callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
	},
	methods: 'POST, GET, PUT, DELETE, OPTIONS',
	allowHeaders: 'X-Requested-With, Content-Type',
	credentials: true,
};
app.use(cors(corsOptions));

/* ------------------- */
/* Configure app login */
/* ------------------- */
app.use(passport.initialize());
app.use(passport.session());
passport.use(Company.createStrategy());
// Use static serialize and deserialize of model for passport session support
passport.serializeUser(Company.serializeUser());
passport.deserializeUser(Company.deserializeUser());
/* -------------------- */
/* -------------------- */

// require('./generateData.js');

// Catch the browser's favicon request. You can still
// specify one as long as it doesn't have this exact name and path.
app.get('/favicon.ico', (req, res)=> {
	res.writeHead(200, { 'Content-Type': 'image/x-icon' });
	res.end();
});
app.use('/robots.txt', express.static('static/robots.txt'));

// Handle errors.
app.use((err, req, res, next)=> {
	console.log(`Error!  ${err}`);
	next();
});

/* ------------------- */
/* API Endpoints */
/* ------------------- */
require('./routes/assets.js');
require('./routes/companies.js');
require('./routes/cpc.js');
require('./routes/login.js');
require('./routes/logout.js');
// require('./routes/organizations.js');
require('./routes/uploadPolicy.js');
// require('./routes/uploads.js');

/* ------------------- */
/* ------------------- */

const port = process.env.PORT || 9876;
app.listen(port, (err) => {
	if (err) { console.error(err); }
	console.info('----\n==> 🌎  API is running on port %s', port);
	console.info('==> 💻  Send requests to http://localhost:%s', port);
});
