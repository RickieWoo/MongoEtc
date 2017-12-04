'use strict';

let chai = require('chai');
let DataStatisticsLogic = require('../../logic/statistics/data_statistics_logic');
let debug = require('debug')('TEST');
let expect = require('chai').expect;
let moment = require('moment');
chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

describe('Data Statistics', function () {
    this.timeout(1500000);
    it('Get', done => {
        DataStatisticsLogic.updateOneHourDeliveryStatistics({
            dimension: new Date(Date.now() - (1000 * 60 * 60)).toISOString()
        })
        .then(result => {
            expect(result).to.be.empty;
            debug(`[Statistics] result => ${JSON.stringify(result, null, 2)}`);
            done();
        })
        .catch(err => {
            debug(`[Statistics] error => ${err.stack}`);
            done(err);
        })
    })
});