require('./config.js');
const Kafka = require('no-kafka');

const consumer = new Kafka.SimpleConsumer();

// data handler function can return a Promise
const dataHandler = function (messageSet, topic, partition) {
	messageSet.forEach((m)=> {
		console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
	});
};

return consumer.init().then(()=> {
	return consumer.subscribe('tennessee-18188.uspto', dataHandler);
});
