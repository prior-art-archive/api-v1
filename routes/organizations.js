import Promise from 'bluebird';
import passport from 'passport';
import app from '../server';
import { Organization } from '../models';

app.post('/organizations', (req, res)=> {
	const newUser = {
		slug: req.body.slug.toLowerCase().trim(),
		name: req.body.name,
		email: req.body.email,
	};

	const orgRegister = Promise.promisify(Organization.register, { context: Organization });
	orgRegister(newUser, req.body.password)
	.then(()=> {
		passport.authenticate('local')(req, res, ()=> {
			return res.status(201).json({
				...req.user.toJSON(),
				createdAt: undefined,
				updatedAt: undefined,
				hash: undefined,
				salt: undefined,
			});
		});
	})
	.catch((err)=> {
		console.error('Error in postOrganization: ', err);
		return res.status(500).json(err);
	});
});
