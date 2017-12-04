'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let config = require('config');
let bossUserData = require('../../dev_scripts/local_db_dev/test_user.json');
let ResponseErrorSet = require('../../conf/response_error_set');
const debug = require('debug')('TEST');
let TestUtils = require('../../utils/test_utils');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

const requestUrl = config.BaseUrl;

let getAllUserJsonSchema = {
	type: 'object', 
	required: ['users'],
	properties: {
		users: {
			type: 'array', 
			items: {
				type: 'object', 
				required: [	'user_name','auth'],
				properties: {
					user_name: {type: 'string'},
					auth: {
						type: 'object', 
						properties: {
							Version: {type: 'string'}, 
							Action: {
								type: 'array', 
								items: {type: 'string'}
							}, 
							Resource: {
								type: 'array', 
								items: {type: 'string'}
							}  
						}
					}
				}
			}
		},
		nextKey: {type: 'object'}
	},
};

let getUserSchema = {
	type: 'object', 
	required: ['user_name', 'auth'],
	properties: {
		user_name: {type: 'string'},
		auth: {
			type: 'object', 
			properties: {
				Version: {type: 'string'}, 
				Action: {
					type: 'array', 
					items: {type: 'string'}
				}, 
				Resource: {
					type: 'array', 
					items: {type: 'string'}
				}
			}
		}
	}
};

let returnSchema = {
	type: 'object',
	properties: {
		user: {
			type: 'object',
			required: [	'user_name'],
			properties: {
			    user_name: {type: 'string'}
			}
		}
	}
};

describe('Boss Users Get All: ', function(){
	this.timeout(15000);

	it('should Get all users ', done => {
		chai.request(requestUrl)
			.post('/bossuser/userlist')
			.send({
				limit: 2
			})
			.then(res => {
				// debug(JSON.stringify(res.body, null, 2));
				expect(res.body).to.be.jsonSchema(getAllUserJsonSchema);
				done();
			})
			.catch(err => {
				debug(JSON.stringify(err, null, 2));
				done(err);
			});
	});

});

describe('Boss Users Add: ', function(){
	this.timeout(15000);

	it('should add a user ', done =>{
		chai.request(requestUrl)
			.put('/bossuser/newuser')
			.send({
				user_name: 'test_user_a',
				password: '123454',
				auth:{
					VERSION: "2017-09-27",
					ACTION: ['*'],
					RESOURCE: [	
						"order/*",
						"user/*"
					]
				}
			})
			.then(res => {
				expect(res).to.have.status(200);
				debug(JSON.stringify(res.body, null, 2));
				expect(res.body).to.be.jsonSchema(returnSchema);
				done();
			})
			.catch(err => {
				debug(JSON.stringify(err.stack, null, 2));
				done(err);
			});
	});
  
	it('should add another user ', done =>{
		chai.request(requestUrl)
			.put('/bossuser/newuser')
			.send({
				user_name: 'test_user_b',
				password: '123454',
				auth:{
					VERSION: "2017-09-27",
					ACTION: ['*'],
					RESOURCE: [	
						"order/*",
						"user/*"
					]
				}
			})
			.then(res => {
				expect(res).to.have.status(200);
				expect(res.body).to.be.jsonSchema(returnSchema);
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('should add a user who is already exist and return ERROR', done =>{
		chai.request(requestUrl)
			.put('/bossuser/newuser')
			.send({
				user_name: 'test_user',
				password: '123454',
				auth:{
					VERSION: "2017-09-27",
					ACTION: ['*'],
					RESOURCE: [	
						"order/*",
						"user/*"
					]
				}
			})
			.end((res,err) => {
				debug(JSON.stringify(err, null, 2));
				expect(err).to.have.status(ResponseErrorSet.BossUserErrorSet.USER_ALREADY_EXIST.status);
				done();
			});
	});

});

describe('Boss Users Update：', function(){
	this.timeout(15000);

	it('should update a user ', done =>{
		chai.request(requestUrl)
			.post('/bossuser/updateuser')
			.send({
				user_name: 'test_user_a',
				password: '123454',
				auth:{
					VERSION: "2070-02-10",
					ACTION: ['*'],
					RESOURCE: [	
						"order/*",
						"user/*"
					]
				}
			})
			.then(res => {
				expect(res).to.have.status(200);
				expect(res.body).to.be.jsonSchema(returnSchema);
				debug(JSON.stringify(res.body, null, 2));
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('should update a user who not exists and return ERROR', done =>{
		chai.request(requestUrl)
			.post('/bossuser/updateuser')
			.send({
				user_name: 'test_user_not_exist',
				password: '123454',
				auth:{
					VERSION: "2017-09-27",
					ACTION: ['*'],
					RESOURCE: [	
						"order/*",
						"user/*"
					]
				}
			})
			.end((res,err) => {
				expect(err).to.have.status(ResponseErrorSet.BossUserErrorSet.USER_NAME_NOT_EXIST.status);
				debug(JSON.stringify((err), null, 2));
				done();
			});
	});

});

describe('Boss Users Get:', function(){
	this.timeout(15000);

	it('should get one user ', done =>{
		chai.request(requestUrl)
			.get('/bossuser/user')
			.query({
				user_name: bossUserData.user_name,
			})
			.then(res => {
				expect(res).to.have.status(200);
				expect(res.body).to.be.jsonSchema(getUserSchema);
				done();
			})
			.catch(err => {
				done(err);
				debug(err.stack);
			});
	});

	it('should get a Non-exist user and return ERROR', done =>{
		chai.request(requestUrl)
			.get('/bossuser/user')
			.query({
				user_name:'test_user_not_exist'
			})
			.end((res,err) => {
				expect(err).to.have.status(ResponseErrorSet.BossUserErrorSet.USER_NAME_NOT_EXIST.status);
				debug(JSON.stringify((err), null, 2));
				done();
			});
	});

});

describe('Boss Users Delete：', function(){
	this.timeout(15000);

	it('should delete a user ', done =>{
		chai.request(requestUrl)
			.delete('/bossuser/deleteuser')
			.send({
				user_name: 'test_user_a',
			})
			.then(res => {
				expect(res).to.have.status(200);
				expect(res.body).to.be.jsonSchema(returnSchema);
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('should delete a user who not exists and return ERROR', done =>{
		chai.request(requestUrl)
			.delete('/bossuser/deleteuser')
			.send({
				user_name: 'test_user_not_exist'
			})
			.end((res,err) => {
				expect(err).to.have.status(ResponseErrorSet.BossUserErrorSet.USER_NAME_NOT_EXIST.status);
				debug(JSON.stringify((err), null, 2));
				done();
			});
	});
 
	// // todo
	// it('should delete a admin return ERROR', done =>{
	// 	chai.request(requestUrl)
	// 		.delete('/bossuser/deleteuser')
	// 		.send({
	// 			user_name: 'admin'
	// 		})
	// 		.end((res,err) => {
	// 			expect(err).to.have.status(ResponseErrorSet.BossUserErrorSet.USER_NAME_NOT_EXIST.status);
	// 			debug(JSON.stringify((err), null, 2));
	// 			done();
	// 		});
	// });
 
});
