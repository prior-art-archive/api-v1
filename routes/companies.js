import app from '../server';
import { Company } from '../models';

app.get('/companies', (req, res)=> {
	return Company.findOne({
		where: {
			slug: req.query.slug
		}
	})
	.then((companyData)=> {
		return res.status(201).json(companyData);
	})
	.catch((err)=> {
		return res.status(500).json(err);
	});
});
