import Promise from 'bluebird';
import Kafka from 'no-kafka';
import { Upload } from '../models';

const usedFilePaths = new Set([]);

const producer = new Kafka.Producer();
producer.init().then(()=> {
	const kafkaProducer = producer;
	Upload.findAll({
		where: {
			underlayMetadata: { $ne: null }
		},
		attributes: ['rawMetadata', 'underlayMetadata'],
	})
	.then((uploadData)=> {
		console.log('Got upload data');
		console.log('Original', uploadData.length);
		const uniqueUploadData = uploadData.filter((item)=> {
			const ftpUrl = item.rawMetadata.url;
			if (usedFilePaths.has(ftpUrl)) {
				return false;
			} else {
				usedFilePaths.add(ftpUrl);
				return true;
			}
		});
		console.log('Filtered', uniqueUploadData.length);
		
		return Promise.map(uniqueUploadData, (item)=> {
			const itemJson = item.toJSON();
			return kafkaProducer.send({
				topic: 'tennessee-18188.uspto',
				partition: 0,
				message: {
					value: JSON.stringify([itemJson.underlayMetadata])
				}
			});
		}, { concurrency: 5 });
	})
	.then((promiseResults)=> {
		console.log('Finished All Promises', promiseResults);
	})
	.catch((error)=> {
		console.log('Error in uploads', error);
	});
});


// import Promise from 'bluebird';
// import Kafka from 'no-kafka';
// import { Upload } from '../models';

// const usedFilePaths = new Set([]);
// const duplicatedIds = [];

// const producer = new Kafka.Producer();
// producer.init().then(()=> {
// 	const kafkaProducer = producer;
// 	Upload.findAll({
// 		where: {
// 			underlayMetadata: { $ne: null }
// 		},
// 		attributes: ['id', 'rawMetadata', 'underlayMetadata'],
// 	})
// 	.then((uploadData)=> {
// 		console.log('Got upload data');
// 		console.log('Original', uploadData.length);
// 		const uniqueUploadData = uploadData.filter((item)=> {
// 			const ftpUrl = item.rawMetadata.url;
// 			if (usedFilePaths.has(ftpUrl)) {
// 				duplicatedIds.push(item.id);
// 				return false;
// 			} else {
// 				usedFilePaths.add(ftpUrl);
// 				return true;
// 			}
// 		});
// 		console.log('Filtered', uniqueUploadData.length);
// 		console.log('Duplicates', duplicatedIds.length);

// 		return Upload.update({ deleted: true }, {
// 			where: {
// 				id: duplicatedIds
// 			}
// 		});
// 	})
// 	.then((promiseResults)=> {
// 		console.log('Finished All Promises', promiseResults);
// 	})
// 	.catch((error)=> {
// 		console.log('Error in uploads', error);
// 	});
// });
