import request from 'request-promise';
import Kafka from 'no-kafka';
import app from '../server';
import { Upload, Organization } from '../models';

const producer = new Kafka.Producer();

app.post('/uploads', (req, res)=> {
	console.log('In uploads', req.body);
	// Check for the id of org
	// Store the raw object
	// Post to underlay
	// Update with formattedmetdata
	// When received post to kafka
	console.time('uploadsRunTime');
	Organization.findOne({
		where: {
			slug: req.body.organizationSlug
		}
	})
	.then((organizationData)=> {
		console.log('In then 1');
		if (!organizationData) { throw new Error('organizationSlug not valid'); }

		const dateString = req.body.pushdate || req.body.date || req.body.uploaddate;
		const formattedMetadata = {
			url: req.body.url,
			title: req.body.title,
			description: req.body.description,
			datePublished: Date.parse(dateString) ? new Date(dateString) : undefined,
			organizationId: organizationData.id,
			organizationName: organizationData.name,
			// fileId: Comes from underlay
			// dateUploaded: Comes from underlay
		};
		return Upload.create({
			rawMetadata: req.body,
			formattedMetadata: formattedMetadata,
			organizationId: organizationData.id,
		});
	})
	.then((newUploadData)=> {
		console.log('In then 2');
		const assertion = [{
			type: 'CreativeWork',
			name: newUploadData.formattedMetadata.title,
			description: newUploadData.formattedMetadata.description,
			datePublished: newUploadData.formattedMetadata.datePublished,
			author: [newUploadData.organizationId]
		}];
		console.log('In then 2b');
		const options = {
			method: 'POST',
			uri: 'https://underlay-api-v1-dev.herokuapp.com/assertions',
			body: assertion,
			json: true
		};
		console.log('In then 2c');
		return Promise.all([request(options), newUploadData]);
	})
	.then(([underlayResponse, newUploadData])=> {
		console.log('In then 3');
		console.log('Underlay response is', JSON.stringify(underlayResponse, null, 2));
		const underlayMetadata = {
			...newUploadData.formattedMetadata,
			fileId: underlayResponse[0].identifier,
			dateUploaded: underlayResponse[0].assertionDate
		};
		console.log('In then 3a');
		const updateMetadata = Upload.update({ underlayMetadata: underlayMetadata }, {
			where: {
				id: newUploadData.id
			}
		});
		console.log('In then 3b');
		return Promise.all([underlayMetadata, updateMetadata]);
	})
	.then(([underlayMetadata])=> {
		console.log('In then 4');
		console.log('Lets send this to kafka!', underlayMetadata);
		return producer.init().then(()=> {
			return producer.send({
				topic: 'tennessee-18188.uspto',
				partition: 0,
				message: underlayMetadata
			});
		});
	})
	.then((kafkaResult)=> {
		console.log('In then 5');
		console.log('Got kafka result: ', kafkaResult);
		console.timeEnd('uploadsRunTime');
		return res.status(201).json('Success');
	})
	.catch((error)=> {
		console.log('Error in uploads', error, req.body);
		return res.status(400).json('Error in uploads');
	});
});
