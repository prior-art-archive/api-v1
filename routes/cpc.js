import request from 'request';
import app from '../server';

app.get('/cpc/sitemap', (req, res)=> {
	request('https://s3.amazonaws.com/prior-art-archive-sftp/_priorArtArchive/sitemap.txt').pipe(res);
});
