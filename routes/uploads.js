import request from 'request-promise';
import Kafka from 'no-kafka';
import app from '../server';
import { Upload, Organization } from '../models';

const producer = new Kafka.Producer();
let kafkaProducer;
producer.init().then(()=> {
	kafkaProducer = producer;
});

const underlayUrl = process.env.IS_PRODUCTION_API === 'true'
	? 'https://underlay-api-v1-production.herokuapp.com/assertions'
	: 'https://underlay-api-v1-dev.herokuapp.com/assertions';

const webhookUrl = process.env.IS_PRODUCTION_API === 'true'
	? 'https://prior-art-archive-api-prod.herokuapp.com/handleUnderlayResponse'
	: 'https://prior-art-archive-api-dev.herokuapp.com/handleUnderlayResponse';

app.post('/uploads', (req, res)=> {
	return Organization.findOne({
		where: {
			slug: req.body.organizationSlug
		},
		attributes: ['slug', 'id', 'name'],
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
		const assertions = [{
			type: 'MediaObject',
			name: formattedMetadata.title,
			description: formattedMetadata.description,
			datePublished: formattedMetadata.datePublished,
			author: [formattedMetadata.companyId],
			contentUrl: formattedMetadata.url,
		}];
		const options = {
			method: 'POST',
			uri: underlayUrl,
			body: {
				authentication: {},
				assertions: assertions,
				webhookUri: webhookUrl
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
});

app.post('/handleUnderlayResponse', (req, res)=> {
	if (req.body.status !== 'success') {
		console.log('Underlay Failed', req.body);
		return null;
	}

	const mediaObjectAssertion = req.body.assertions[0];

	return Upload.findOne({
		where: {
			requestId: req.body.requestId
		},
		attributes: ['requestId', 'formattedMetadata']
	})
	.then((uploadObject)=> {
		const formattedMetadata = uploadObject.toJSON().formattedMetadata;
		const underlayMetadata = {
			...formattedMetadata,
			url: mediaObjectAssertion.contentUrl,
			fileId: mediaObjectAssertion.identifier,
			dateUploaded: mediaObjectAssertion.assertionDate
		};
		const updateMetadata = Upload.update({ underlayMetadata: underlayMetadata }, {
			where: {
				requestId: req.body.requestId
			}
		});
		const sendToKafka = kafkaProducer.send({
			topic: 'tennessee-18188.uspto',
			partition: 0,
			message: {
				value: JSON.stringify([underlayMetadata])
			}
		});
		return Promise.all([sendToKafka, updateMetadata]);
	})
	.then(([kafkaResult])=> {
		console.log(`RequestId: ${req.body.requestId}, kafkaResult Success: ${!kafkaResult[0].error}`);
		return res.status(201).json('Success');
	})
	.catch((error)=> {
		console.log('Error in uploads', error, req.body);
		return res.status(400).json('Error in uploads');
	});
});
