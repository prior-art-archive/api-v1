import fs from 'fs';
import tmp from 'tmp-promise';
import Promise from 'bluebird';
import AWS from 'aws-sdk';
import { Upload, Organization } from '../models';

AWS.config.region = 'us-east-1';
AWS.config.setPromisesDependency(Promise);
const fsReadFile = Promise.promisify(fs.readFile);
const fsWriteFile = Promise.promisify(fs.writeFile);

tmp.setGracefulCleanup();

function uploadLocalFile(filePath) {
	const filename = '_priorArtArchive/sitemap.txt';

	return fsReadFile(filePath)
	.then((file)=> {
		const s3bucket = new AWS.S3({ params: { Bucket: 'prior-art-archive-sftp' } });
		const params = {
			Key: filename,
			Body: file,
			ACL: 'public-read',
		};
		return s3bucket.putObject(params).promise();
	})
	.then(()=> {
		return `https://assets.pubpub.org/${filename}`;
	})
	.catch((error)=> {
		console.log('Error uploading data: ', error);
	});
}


const findUploads = Upload.findAll({
	where: {
		underlayMetadata: { $ne: null }
	},
	attributes: ['underlayMetadata'],
});
const findOrganizations = Organization.findAll({
	attributes: ['id', 'name']
});

Promise.all([findUploads, findOrganizations])
.then(([uploadData, organizationData])=> {
	const companyIdToName = {};
	organizationData.forEach((item)=> {
		companyIdToName[item.id] = item.name;
	});
	const formattedUploadData = uploadData.map((item)=> {
		const data = item.underlayMetadata;
		return {
			url: data.url,
			fileId: data.fileId,
			companyName: companyIdToName[data.companyId],
			companyId: data.companyId,
			title: data.title,
			dateUploaded: data.dateUploaded,
		};
	}).sort((foo, bar)=> {
		if (foo.dateUploaded > bar.dateUploaded) { return -1; }
		if (foo.dateUploaded < bar.dateUploaded) { return 1; }
		return 0;
	});
	return Promise.all([tmp.file({ postfix: '.txt' }), formattedUploadData]);
	// return res.status(201).json(formattedUploadData);
	// console.log(formattedUploadData.length);
})
.then(([fileObject, formattedUploadData])=> {
	if (fileObject) {
		const content = formattedUploadData.reduce((prev, curr)=> {
			return `${prev}${JSON.stringify(curr)}\n`;
		}, '');
		return fsWriteFile(fileObject.path, content, 'utf-8')
		.then(()=> {
			return uploadLocalFile(fileObject.path);
		})
		.catch((err)=> {
			console.log('Error generating and saving file', err);
		});
	}
	return null;
})
.then(()=> {
	console.log('Succesfully generated new sitemap');
})
.catch((error)=> {
	console.log('Error in cpc Sitemap', error);
	// return res.status(400).json('Error generating sitemap');
})
.finally(()=> {
	process.exit();
});
