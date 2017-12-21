/* eslint-disable global-require */

if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const Sequelize = require('sequelize');
const passportLocalSequelize = require('passport-local-sequelize');

const useSSL = process.env.DATABASE_URL.indexOf('localhost:') === -1;
const sequelize = new Sequelize(process.env.DATABASE_URL, {
	logging: false,
	dialectOptions: { ssl: useSSL }
});

// Change to true to update the model in the database.
// NOTE: This being set to true will erase your data.
sequelize.sync({ force: false });

const id = {
	primaryKey: true,
	type: Sequelize.UUID,
	defaultValue: Sequelize.UUIDV4,
};

const Upload = sequelize.define('Upload', {
	id: id,
	rawMetadata: { type: Sequelize.JSONB },
	formattedMetadata: { type: Sequelize.JSONB },
	underlayMetadata: { type: Sequelize.JSONB },
	organizationId: { type: Sequelize.UUID },
	requestId: { type: Sequelize.UUID },
}, {
	indexes: [
		{ fields: ['requestId'], method: 'BTREE' },
	]
});

const Organization = sequelize.define('Organization', {
	id: id,
	slug: {
		type: Sequelize.TEXT,
		unique: true,
		allowNull: false,
		validate: {
			isLowercase: true,
			len: [1, 280],
			is: /^(?=.*[a-zA-Z])[a-zA-Z0-9-]+$/, // Must contain at least one letter, alphanumeric and underscores and hyphens
		},
	},
	name: { type: Sequelize.TEXT, allowNull: false },
	avatar: { type: Sequelize.TEXT },
	bio: { type: Sequelize.TEXT },
	email: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: true,
		validate: {
			isEmail: true,
			isLowercase: true,
		}
	},
	location: { type: Sequelize.TEXT },
	website: { type: Sequelize.TEXT },
	hash: { type: Sequelize.TEXT, allowNull: false },
	salt: { type: Sequelize.TEXT, allowNull: false },
});

passportLocalSequelize.attachToUser(Organization, {
	usernameField: 'slug',
	hashField: 'hash',
	saltField: 'salt',
	digest: 'sha1',
});

const db = {
	Upload: Upload,
	Organization: Organization,
};

db.sequelize = sequelize;

module.exports = db;
