'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let config = require('config');
let ResponseErrorSet = require('../../conf/response_error_set');
const debug = require('debug')('TEST');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

let bossUserJsonSchema = {
    title: 'Boss User Response JSON Schema v1',
    type: 'object',
    required: ['user_name', 'auth'],
    properties: {
        user_name: {type: 'string'},
        auth: {
            type: "object",
            required: ['Version', 'Action', 'Resource'],
            properties: {
                "Version": {type: "string"},
                "Action": {type: "array"},
                "Resource": {type: "array"}
            }
        }
    }
};

describe('Boss User API', function () {

    this.timeout(15000);

    it('Login', done => {

        let body = {user_name: 'test_user', password: '123456'};

        chai.request(config.BaseUrl)
            .post(`/bossuser/login`)
            .send(body)
            .end((err, res) => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(bossUserJsonSchema);
                done();
            });
    });

    it('Login With User Session', done => {

        let body = {user_name: 'test_user', password: '123456'};

        let agent = chai.request.agent(config.BaseUrl);

        agent
            .post(`/bossuser/login`)
            .send(body)
            .then(res => {
                debug(JSON.stringify(res, null, 2));
                // The `agent` now has the sessionid cookie saved, and will send it
                // back to the server in the next request:
                return agent.post('/bossuser/login')
                    .then(res => {
                        debug(JSON.stringify(res.body, null, 2));
                        expect(res.body).to.be.jsonSchema(bossUserJsonSchema);
                        done();
                    })
            })
    });

    it('Login With Non-Exist Username', done => {

        let body = {user_name: 'non_exist_user', password: '123456'};

        chai.request(config.BaseUrl)
            .post(`/bossuser/login`)
            .send(body)
            .end((err, res) => {
                debug(JSON.stringify(res.body, null, 2));
                expect(err.status).to.equal(ResponseErrorSet.BossUserErrorSet.LOGIN_USER_NAME_NOT_EXIST.status);
                done();
            });
    });

    it('Login With Wrong Password', done => {

        let body = {user_name: 'test_user', password: 'wrong_password'};

        chai.request(config.BaseUrl)
            .post(`/bossuser/login`)
            .send(body)
            .end((err, res) => {
                debug(JSON.stringify(res.body, null, 2));
                expect(err.status).to.equal(ResponseErrorSet.BossUserErrorSet.LOGIN_PASSWORD_INCORRECT.status);
                done();
            });
    });
});

