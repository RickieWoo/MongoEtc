'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let config = require('config');
const debug = require('debug')('TEST');
let TestUtils = require('../../utils/test_utils');
let md5 = require('md5');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

let VIPUserSignupResponseSchema = {
    type: 'object',
    required: ['user_id', 'invite_code'],
    properties: {
        user_id: {type: 'string'},
        invite_code: {type: 'string'}
    }
};


describe('VIP Master Signup API', function () {

    this.timeout(15000);

    it('Signup', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = {
                    name: 'ruozi',
                    password: md5('password'),
                    email: 'fan_zhang@pinssible.com',
                    client_name: 'snapfilters',
                    platform: 'iOS'
                };
                return agent.post(`/user/vip/signup`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(VIPUserSignupResponseSchema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });
});

