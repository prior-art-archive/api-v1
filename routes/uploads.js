import app from '../server';
// import { Upload, Organization } from '../models';

app.post('/uploads', (req, res)=> {
	console.log('In uploads', req.body);
	return res.status(201).json(req.body);
});
