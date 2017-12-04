import app from '../server';

app.get('/logout', (req, res)=> {
	req.logout();
	res.status(201).json('Logout Successful');
});
