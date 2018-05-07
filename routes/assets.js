import Kafka from 'no-kafka';
import app from '../server';
import { Asset } from '../models';

const producer = new Kafka.Producer();
let kafkaProducer;
producer.init().then(()=> {
	kafkaProducer = producer;
});


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
		sourcePath: req.body.sourcePath,
	})
	.then((newAsset)=> {
		return res.status(201).json(newAsset);
	})
	.catch((err)=> {
		return res.status(500).json(err);
	});
});

app.post('/assets/kafka', (req, res)=> {
	return kafkaProducer.send({
		topic: 'tennessee-18188.uspto',
		partition: 0,
		message: {
			value: JSON.stringify([req.body])
		}
	})
	.then(()=> {
		return res.status(201).json('Sent to Kafka');
	})
	.catch((err)=> {
		return res.status(500).json(err);
	});
});
