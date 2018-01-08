import Promise from 'bluebird';
import Kafka from 'no-kafka';
import { Upload } from '../models';

const producer = new Kafka.Producer();
producer.init().then(()=> {
	const kafkaProducer = producer;
	Upload.findAll({
		where: {
			underlayMetadata: { $ne: null }
		},
		attributes: ['underlayMetadata'],
	})
	.then((uploadData)=> {
		console.log('Got upload data');
		return Promise.map(uploadData, (item)=> {
			const itemJson = item.toJSON();
			const outputItem = {
				...itemJson.underlayMetadata,
				companyName: 'Cisco',
			};
			// return kafkaProducer.send({
			// 	topic: 'tennessee-18188.uspto',
			// 	partition: 0,
			// 	message: {
			// 		value: JSON.stringify([outputItem])
			// 	}
			// });
		}, { concurrency: 5 });
	})
	.then((promiseResults)=> {
		console.log('Finished All Promises', promiseResults);
	})
	.catch((error)=> {
		console.log('Error in uploads', error);
	});
});
