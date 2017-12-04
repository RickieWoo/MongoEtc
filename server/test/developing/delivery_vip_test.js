'use strict';

let chai = require('chai');
let expect = require('chai').expect;
let config = require('config');
let orderTestData = require('./order_test_data.json');
let bossUserData = require('../../dev_scripts/local_db_dev/test_user.json');
let ResponseErrorSet = require('../../conf/response_error_set');
let OrderSet = require('../../conf/order_set');
const debug = require('debug')('TEST');
let TestUtils = require('../../utils/test_utils');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

let makeOrderJsonSchema = {
    title: 'Make Order Response JSON Schema v1',
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'order_id', 'status', 'result'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'}
            }
        }
    }
};

describe('Delivery Make Order API', function () {

    this.timeout(15000);

    it('Make Order For VIP Order', done => {

        let body = orderTestData.vip_order_1;

        chai.request(config.BaseUrl)
            .post(`/delivery/vip/makeorder`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`err => ${err.stack}`);
                    done(err);
                } else {
                    expect(res.body).to.be.jsonSchema(makeOrderJsonSchema);
                    debug(JSON.stringify(res.body, null, 2));
                    done();
                }
            });
    });

    it('Make Order For Another VIP Order', done => {

        let body = orderTestData.vip_order_2;

        chai.request(config.BaseUrl)
            .post(`/delivery/vip/makeorder`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`err => ${err.stack}`);
                    done(err);
                } else {
                    expect(res.body).to.be.jsonSchema(makeOrderJsonSchema);
                    debug(JSON.stringify(res.body, null, 2));
                    done();
                }
            });
    });
});

let queryOrderJsonschema = {
    type: 'object',
    required: ['orders'],
    properties: {
        orders: {
            type: 'array',
            minItems: 0,
            uniqueItems: true,
            items: {
                type: 'object',
                required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result', 'reason'],
                properties: {
                    user_id: {type: 'string'},
                    order_id: {type: 'integer'},
                    price: {type: 'integer'},
                    exchange_rate: {type: 'integer'},
                    base_value: {type: 'number'},
                    email: {type: 'string'},
                    status: {type: 'string'},
                    result: {type: 'string'},
                    reason: {type: 'string'},
                    error_msg: {type: 'string'}
                }
            }
        },
        nextKey: {type: 'object'}
    }
};

let orders = {};

describe('Query VIP Order API', function () {

    this.timeout(15000);

    it('Ongoing Orders', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                return agent.post(`/delivery/vip`).send({status: OrderSet.StatusSet.ONGOING});
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(queryOrderJsonschema);
                orders = res.body.orders;
                done();
            })
            .catch(err => {
                done(err);
            });
    });
});

let updateOrderJsonschema = {
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result', 'extra_value', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                exchange_rate: {type: 'integer'},
                base_value: {type: 'number'},
                extra_value: {type: 'number'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'}
            }
        }
    }
};

describe('Update Order Result API', function () {

    this.timeout(15000);

    it('Update Order Result To OK', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = orders[0];
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id,
                    extra_value: 0.5,
                    result: OrderSet.ResultSet.OK,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_OK
                };
                return agent.post(`/delivery/vip/update`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(updateOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it('Update Order Result To Cheated', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = orders[1];
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id,
                    extra_value: -0.5,
                    result: OrderSet.ResultSet.CHEATED,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_CHEATED
                };
                return agent.post(`/delivery/vip/update`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(updateOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it('Update Order Which not exists', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = orders[1];
                let body = {
                    user_id: order.user_id,
                    order_id: Date.now(),
                    extra_value: 0.5,
                    result: OrderSet.ResultSet.CHEATED,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_CHEATED
                };
                return agent.post(`/delivery/vip/update`).send(body);
            })
            .catch(err => {
                expect(err.status).to.be.equal(ResponseErrorSet.OrderErrorSet.ORDER_NOT_EXISTS.status);
                done();
            });
    });
});

let deliverOrderJsonschema = {
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result', 'extra_value', 'giftcard_items', 'mail_id', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                exchange_rate: {type: 'integer'},
                base_value: {type: 'number'},
                extra_value: {type: 'number'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'},
                giftcard_items: {type: 'array'},
                mail_id: {type: 'string'}
            }
        }
    }
};

describe('Deliver VIP Order API', function () {

    this.timeout(80000);

    it('Normal VIP Order', done => {
        debug(`Normal VIP Order`);
        TestUtils.loginWithTestUser(bossUserData)
            .then(agent => {
                let order = orders[0];
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                debug(`Normal VIP Order => ${JSON.stringify(body, null, 2)}`);
                return agent.post(`/delivery/vip/deliver`).send(body);
            })
            .then(res => {
                debug(`Normal VIP Order => ${JSON.stringify(res.body, null, 2)}`);
                expect(res.body).to.be.jsonSchema(deliverOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it('VIP Order With Invalid Status', done => {

        TestUtils.loginWithTestUser(bossUserData)
            .then(agent => {
                let order = orders[1];
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/vip/deliver`).send(body);
            })
            .catch(err => {
                expect(err.status).to.be.equal(ResponseErrorSet.OrderErrorSet.DELIVER_ORDER_STATUS_INVALID.status);
                done();
            });
    });
});

let rejectOrderJsonschema = {
    type: 'object',
    required: ['order'],
    properties: {
        order: {
            type: 'object',
            required: ['user_id', 'order_id', 'price', 'exchange_rate', 'base_value', 'email', 'status', 'result', 'extra_value', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                exchange_rate: {type: 'integer'},
                base_value: {type: 'number'},
                extra_value: {type: 'number'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'}
            }
        }
    }
};

describe('Reject VIP Order API', function () {

    this.timeout(80000);

    it('Normal VIP Order', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = orders[1];
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/vip/reject`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(rejectOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });
});