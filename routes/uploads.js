import app from '../server';
// import { Upload, Organization } from '../models';

app.get('/test', (req, res)=> {
	return res.status(201).json('You got it!');
});

app.post('/uploads', (req, res)=> {
	return res.status(201).json(req.body.json);
});
