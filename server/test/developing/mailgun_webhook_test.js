'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let config = require('config');
let orderTestData = require('./order_test_data.json');
let ResponseErrorSet = require('../../conf/response_error_set');
const debug = require('debug')('TEST');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

describe('Mailgun Webhook Success API', function () {
    this.timeout(15000);

    it('Mailgun Redeem Amazon_US Webhook Success', done => {
        let body = orderTestData.redeem_amazon_us_order_mailgun_webhook_success;
        chai.request(config.BaseUrl)
            .post(`/mailgun/success`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`[MailgunWebhook] redeem amazon_us order webhook error => ${JSON.stringify(err.stack, null, 2)}`);
                    done(err);
                } else {
                    debug(`[MailgunWebhook] redeem amazon_us order webhook ok => ${JSON.stringify(res.body, null, 2)}`);
                    expect(res.body).to.be.empty;
                    done();
                }
            });
    });

    it('Mailgun Redeem Inventory Webhook Success', done => {
        let body = orderTestData.redeem_inventory_order_mailgun_webhook_success;
        chai.request(config.BaseUrl)
            .post(`/mailgun/success`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`[MailgunWebhook] redeem inventory order webhook error => ${JSON.stringify(err.stack, null, 2)}`);
                    done(err);
                } else {
                    debug(`[MailgunWebhook] redeem inventory order webhook ok => ${JSON.stringify(res.body, null, 2)}`);
                    expect(res.body).to.be.empty;
                    done();
                }
            });
    });

    it('Mailgun VIP Webhook Success', done => {
        let body = orderTestData.vip_order_mailgun_webhook_success;
        chai.request(config.BaseUrl)
            .post(`/mailgun/success`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`[MailgunWebhook] vip order webhook error => ${JSON.stringify(err.stack, null, 2)}`);
                    done(err);
                } else {
                    debug(`[MailgunWebhook] vip order webhook ok => ${JSON.stringify(res.body, null, 2)}`);
                    expect(res.body).to.be.empty;
                    done();
                }
            });
    });

    it('Mailgun Webhook Success Wrong Signature', done => {
        let body = orderTestData.mailgun_webhook_success_wrong_signature;
        chai.request(config.BaseUrl)
            .post(`/mailgun/success`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    expect(err.status).to.be.equal(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR.status);
                    done();
                } else {
                    debug(`should return error. body => ${JSON.stringify(res.body, null, 2)}`);
                }
            })
    })
});

describe('Mailgun Webhook Failure API', function() {
    this.timeout(30000);

    it('Mailgun Redeem Amazon_US Webhook Failure', done => {
        let body = orderTestData.redeem_amazon_us_order_mailgun_webhook_failure;
        chai.request(config.BaseUrl)
            .post(`/mailgun/failure`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`[MailgunWebhook] redeem amazon_us order webhook error => ${JSON.stringify(err.stack, null, 2)}`);
                    done(err);
                } else {
                    debug(`[MailgunWebhook] redeem amazon_us order webhook ok => ${JSON.stringify(res.body, null, 2)}`);
                    expect(res.body).to.be.empty;
                    done();
                }
            });
    });

    it('Mailgun Redeem Inventory Webhook Failure', done => {
        let body = orderTestData.redeem_inventory_order_mailgun_webhook_failure;
        chai.request(config.BaseUrl)
            .post(`/mailgun/failure`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`[MailgunWebhook] redeem inventory order webhook error => ${JSON.stringify(err.stack, null, 2)}`);
                    done(err);
                } else {
                    debug(`[MailgunWebhook] redeem inventory order webhook ok => ${JSON.stringify(res.body, null, 2)}`);
                    expect(res.body).to.be.empty;
                    done();
                }
            });
    });

    it('Mailgun VIP Webhook Failure', done => {
        let body = orderTestData.vip_order_mailgun_webhook_failure;
        chai.request(config.BaseUrl)
            .post(`/mailgun/failure`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`[MailgunWebhook] vip order webhook error => ${JSON.stringify(err.stack, null, 2)}`);
                    done(err);
                } else {
                    debug(`[MailgunWebhook] vip order webhook ok => ${JSON.stringify(res.body, null, 2)}`);
                    expect(res.body).to.be.empty;
                    done();
                }
            });
    });

    it('Mailgun Webhook Failure Wrong Signature', done => {
        let body = orderTestData.mailgun_webhook_failure_wrong_signature;
        chai.request(config.BaseUrl)
            .post(`/mailgun/failure`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    expect(err.status).to.be.equal(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR.status);
                    done();
                } else {
                    debug(`should return error. body => ${JSON.stringify(res.body, null, 2)}`);
                }
            })
    })
});