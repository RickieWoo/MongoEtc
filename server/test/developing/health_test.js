/*
* @Author: wizardfan
* @Date:   2017-03-07 15:06:30
* @Last Modified by:   wizardfan
* @Last Modified time: 2017-03-14 17:48:32
*/

'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let config = require('config');
const debug = require('debug')('TEST');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

describe('Server Health Test', function() {

	it('Health Test', done => {

		chai.request(config.BaseUrl)
			.get(`/all_health`)
			.end((err, res) => {
				debug(res.text);
				expect(res.text).to.be.equal('health');
				done();
			});
	});
});
