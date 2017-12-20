import request from 'request-promise';
import Kafka from 'no-kafka';
import app from '../server';
import { Upload, Organization } from '../models';

const producer = new Kafka.Producer();

app.post('/handleUnderlayResponse', (req, res)=> {
	if (req.body.status !== 'success') {
		console.log('Underlay Failed', req.body);
		return null;
	}

	const creativeWorkAssertion = req.body.assertions.filter((prev, curr)=> {
		if (curr.type === 'CreativeWork') { return curr; }
		return prev;
	}, undefined);
	const mediaObjectAssertion = req.body.assertions.filter((prev, curr)=> {
		if (curr.type === 'MediaObject') { return curr; }
		return prev;
	}, undefined);


	Upload.findOne({
		where: {
			requestId: req.body.requestId
		}
	})
	.then((uploadObject)=> {
		const formattedMetadata = uploadObject.toJSON().formattedMetadata;
		const underlayMetadata = {
			...formattedMetadata,
			url: mediaObjectAssertion.url,
			fileId: creativeWorkAssertion.identifier,
			dateUploaded: creativeWorkAssertion.assertionDate
		};
		const updateMetadata = Upload.update({ underlayMetadata: underlayMetadata }, {
			where: {
				requestId: req.body.requestId
			}
		});
		return Promise.all([underlayMetadata, updateMetadata]);
	})
	// .then(([underlayResponse, newUploadData])=> {
	// 	const underlayMetadata = {
	// 		...newUploadData.formattedMetadata,
	// 		url: underlayResponse[0].url,
	// 		fileId: underlayResponse[0].identifier,
	// 		dateUploaded: underlayResponse[0].assertionDate
	// 	};
	// 	const updateMetadata = Upload.update({ underlayMetadata: underlayMetadata }, {
	// 		where: {
	// 			id: newUploadData.id
	// 		}
	// 	});
	// 	return Promise.all([underlayMetadata, updateMetadata]);
	// })
	.then(([underlayMetadata])=> {
		return producer.init().then(()=> {
			return producer.send({
				topic: 'tennessee-18188.uspto',
				partition: 0,
				message: {
					value: JSON.stringify([underlayMetadata])
				}
			});
		});
	})
	.then(()=> {
		return res.status(201).json('Success');
	})
	.catch((error)=> {
		console.log('Error in uploads', error, req.body);
		return res.status(400).json('Error in uploads');
	});
});

app.post('/uploads', (req, res)=> {
	console.log('In uploads', req.body);
	// Check for the id of org
	// Store the raw object
	// Post to underlay
	// Update with formattedmetdata
	// When received post to kafka
	Organization.findOne({
		where: {
			slug: req.body.organizationSlug
		}
	})
	.then((organizationData)=> {
		if (!organizationData) { throw new Error('organizationSlug not valid'); }

		const dateString = req.body.pushdate || req.body.date || req.body.uploaddate;
		const formattedMetadata = {
			url: req.body.url,
			title: req.body.title,
			description: req.body.description,
			datePublished: Date.parse(dateString) ? new Date(dateString) : undefined,
			companyId: organizationData.id,
			companyName: organizationData.name,
			// fileId: Comes from underlay
			// dateUploaded: Comes from underlay
		};
		const assertions = [
			{
				type: 'CreativeWork',
				name: formattedMetadata.title,
				description: formattedMetadata.description,
				datePublished: formattedMetadata.datePublished,
				author: [formattedMetadata.companyId]
			},
			{
				type: 'MediaObject',
				contentUrl: formattedMetadata.url,
				datePublished: formattedMetadata.datePublished,
			}
		];
		const options = {
			method: 'POST',
			uri: 'https://underlay-api-v1-dev.herokuapp.com/assertions',
			body: {
				authentication: {},
				assertions: assertions,
				webhookUri: 'https://prior-art-archive-api-dev.herokuapp.com/handleUnderlayResponse'
			},
			json: true
		};

		return Promise.all([request(options), formattedMetadata]);
	})
	.then(([underlayResponse, formattedMetadata])=> {
		return Upload.create({
			rawMetadata: req.body,
			formattedMetadata: formattedMetadata,
			organizationId: formattedMetadata.companyId,
			requestId: underlayResponse.requestId,
		});
	})
	.then(()=> {
		return res.status(201).json('success');
	})
	.catch((error)=> {
		console.log('Error in uploads', error, req.body);
		return res.status(400).json('Error in uploads');
	});
		// const assertion = [
		// 	{
		// 		type: 'CreativeWork',
		// 		name: newUploadData.formattedMetadata.title,
		// 		description: newUploadData.formattedMetadata.description,
		// 		datePublished: newUploadData.formattedMetadata.datePublished,
		// 		author: [newUploadData.organizationId]
		// 	},
		// 	{
		// 		type: 'MediaObject',
		// 		contentUrl: newUploadData.formattedMetadata.url,
		// 		datePublished: newUploadData.formattedMetadata.datePublished,
		// 	}
		// ];
		// const options = {
		// 	method: 'POST',
		// 	uri: 'https://underlay-api-v1-dev.herokuapp.com/assertions',
		// 	body: assertion,
		// 	json: true
		// };
		// return Promise.all([request(options), newUploadData]);
	// })
	// .then(([underlayResponse, newUploadData])=> {
	// 	const underlayMetadata = {
	// 		...newUploadData.formattedMetadata,
	// 		url: underlayResponse[0].url,
	// 		fileId: underlayResponse[0].identifier,
	// 		dateUploaded: underlayResponse[0].assertionDate
	// 	};
	// 	const updateMetadata = Upload.update({ underlayMetadata: underlayMetadata }, {
	// 		where: {
	// 			id: newUploadData.id
	// 		}
	// 	});
	// 	return Promise.all([underlayMetadata, updateMetadata]);
	// })
	// .then(([underlayMetadata])=> {
	// 	return producer.init().then(()=> {
	// 		return producer.send({
	// 			topic: 'tennessee-18188.uspto',
	// 			partition: 0,
	// 			message: {
	// 				value: JSON.stringify([underlayMetadata])
	// 			}
	// 		});
	// 	});
	// })
	// .then((kafkaResult)=> {
	// 	return res.status(201).json('Success');
	// })
	// .catch((error)=> {
	// 	console.log('Error in uploads', error, req.body);
	// 	return res.status(400).json('Error in uploads');
	// });
});
