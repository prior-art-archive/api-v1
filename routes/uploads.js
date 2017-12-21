import request from 'request-promise';
import Kafka from 'no-kafka';
import app from '../server';
import { Upload, Organization } from '../models';

const producer = new Kafka.Producer();

app.post('/uploads', (req, res)=> {
	// console.log('In uploads', req.body);
	return Organization.findOne({
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
		// console.log('Here 1: formattedMetadata', formattedMetadata);
		const assertions = [{
			type: 'MediaObject',
			name: formattedMetadata.title,
			description: formattedMetadata.description,
			datePublished: formattedMetadata.datePublished,
			author: [formattedMetadata.companyId],
			contentUrl: formattedMetadata.url,
		}];
		// console.log('Here 2: assertions', assertions);
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
		// console.log('Here 3: underlayResponse', underlayResponse);
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
});

app.post('/handleUnderlayResponse', (req, res)=> {
	// console.log('Here 4: handling Underlay response', req.body);
	if (req.body.status !== 'success') {
		console.log('Underlay Failed', req.body);
		return null;
	}

	const mediaObjectAssertion = req.body.assertions[0];

	// console.log('Here 5: creativeWorkAssertion', creativeWorkAssertion);
	// console.log('Here 5b: mediaObjectAssertion', mediaObjectAssertion);
	return Upload.findOne({
		where: {
			requestId: req.body.requestId
		}
	})
	.then((uploadObject)=> {
		const formattedMetadata = uploadObject.toJSON().formattedMetadata;
		const underlayMetadata = {
			...formattedMetadata,
			url: mediaObjectAssertion.contentUrl,
			fileId: mediaObjectAssertion.identifier,
			dateUploaded: mediaObjectAssertion.assertionDate
		};
		// console.log('Here 6: new underlayMetadata', underlayMetadata);
		const updateMetadata = Upload.update({ underlayMetadata: underlayMetadata }, {
			where: {
				requestId: req.body.requestId
			}
		});
		return Promise.all([underlayMetadata, updateMetadata]);
	})
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
	.then((kafkaResult)=> {
		console.log('RequestId: ', req.body.requestId, ', kafkaResult Success:', !kafkaResult[0].error);
		// console.log('Here 9: All seems good. Finishing.');
		return res.status(201).json('Success');
	})
	.catch((error)=> {
		console.log('Error in uploads', error, req.body);
		return res.status(400).json('Error in uploads');
	});
});
