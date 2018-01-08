import request from 'request-promise';
import Kafka from 'no-kafka';
import app from '../server';
import { Upload, Organization } from '../models';

app.get('/cpc/sitemap', (req, res)=> {
	return Upload.findAll({
		where: {
			underlayMetadata: { $ne: null }
		},
		attributes: ['underlayMetadata'],
	})
	.then((uploadData)=> {
		const formattedUploadData = uploadData.map((item)=> {
			const data = item.underlayMetadata;
			return {
				url: data.url,
				fileId: data.fileId,
				companyName: data.companyName,
				companyId: data.companyId,
				dateUploaded: data.dateUploaded,
			};
		});
		return res.status(201).json(formattedUploadData);
	})
	.catch((error)=> {
		console.log('Error in cpc Sitemap', error);
		return res.status(400).json('Error generating sitemap');
	});
});
