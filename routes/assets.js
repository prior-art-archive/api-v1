import app from '../server';
import { Asset, Company } from '../models';

app.get('/assets', (req, res)=> {
	return Asset.findOne({
		where: {
			md5Hash: req.query.hash
		}
	})
	.then((assetData)=> {
		return res.status(201).json(assetData);
	})
	.catch((err)=> {
		return res.status(500).json(err);
	});
});

app.post('/assets', (req, res)=> {
	return Asset.create({
		originalFilename: req.body.originalFilename,
		title: req.body.title,
		url: req.body.url,
		description: req.body.description,
		md5Hash: req.body.md5Hash,
		datePublished: req.body.datePublished,
		companyId: req.body.companyId,
	})
	.then((newAsset)=> {
		return res.status(201).json(newAsset);
	})
	.catch((err)=> {
		return res.status(500).json(err);
	});
});
