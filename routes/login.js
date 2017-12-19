import passport from 'passport';
import app from '../server';

function login(req, res) {
	const user = req.user ? req.user.toJSON() : {};
	delete user.hash;
	delete user.salt;
	delete user.createdAt;
	delete user.updatedAt;
	return res.status(201).json(user);
}

app.get('/login', login);
app.post('/login', passport.authenticate('local'), login);
