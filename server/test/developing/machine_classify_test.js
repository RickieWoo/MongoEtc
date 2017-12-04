'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let machineClassifierLogic = require('../../logic/orders/machine_classify_logic');
let orderTestData = require('./order_test_data.json');
const debug = require('debug')('TEST');

chai.use(require('chai-json-schema'));

let classifyJsonSchema = {
    type: 'object',
    required: ['result', 'reason'],
    properties: {
        result: {type: 'string'},
        reason: {type: 'string'}
    }
};

describe('Machine Classify Order Result', function () {
    this.timeout(15000);

    let params = orderTestData.machine_classify_params;

    it('Classify VIP Order', done => {
        machineClassifierLogic.getVIPOrderResult(params)
            .then(data => {
                debug(`[Classify] data => ${JSON.stringify(data, null, 2)}`);
                expect(data).to.be.jsonSchema(classifyJsonSchema);
                done();
            })
            .catch(err => {
                debug(`[Classify] err => ${err.stack}`);
                done(err);
            })
    });

    it('Classify Redeem Order', done => {
        machineClassifierLogic.getRedeemOrderResult(params)
            .then(data => {
                debug(`[Classify] data => ${JSON.stringify(data, null, 2)}`);
                expect(data).to.be.jsonSchema(classifyJsonSchema);
                done();
            })
            .catch(err => {
                debug(`[Classify] err => ${err.stack}`);
                done(err);
            })
    });

    it('Classify Cranemachine Order', done => {
        machineClassifierLogic.getCranemachineOrderResult(params)
            .then(data => {
                debug(`[Classify] data => ${JSON.stringify(data, null, 2)}`);
                expect(data).to.be.jsonSchema(classifyJsonSchema);
                done();
            })
            .catch(err => {
                debug(`[Classify] err => ${err.stack}`);
                done(err);
            })
    });
});