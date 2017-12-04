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

let inventoryOrder = {};
let anotherInventoryOrder = {};
let amazonUSOrder = {};
let paypalOrder = {};

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

    it('Make Order For Redeem Inventory Order', done => {

        let body = orderTestData.redeem_normal_order_1;

        chai.request(config.BaseUrl)
            .post(`/delivery/in_app/makeorder`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`err => ${err.stack}`);
                    done(err);
                } else {
                    expect(res.body).to.be.jsonSchema(makeOrderJsonSchema);
                    debug(JSON.stringify(res.body, null, 2));
                    inventoryOrder = res.body.order;
                    done();
                }
            });
    });

    it('Make Order For Redeem Another Inventory Order', done => {

        let body = orderTestData.redeem_normal_order_2;

        chai.request(config.BaseUrl)
            .post(`/delivery/in_app/makeorder`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`err => ${err.stack}`);
                    done(err);
                } else {
                    expect(res.body).to.be.jsonSchema(makeOrderJsonSchema);
                    debug(JSON.stringify(res.body, null, 2));
                    anotherInventoryOrder = res.body.order;
                    done();
                }
            });
    });

    it('Make Order For Redeem Amazon_US Order', done => {

        let body = orderTestData.redeem_amazon_us_order;

        chai.request(config.BaseUrl)
            .post(`/delivery/in_app/makeorder`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`err => ${err.stack}`);
                    done(err);
                } else {
                    expect(res.body).to.be.jsonSchema(makeOrderJsonSchema);
                    debug(JSON.stringify(res.body, null, 2));
                    amazonUSOrder = res.body.order;
                    done();
                }
            });
    });

    it('Make Order For Redeem Paypal Order', done => {

        let body = orderTestData.redeem_paypal_order;

        chai.request(config.BaseUrl)
            .post(`/delivery/in_app/makeorder`)
            .send(body)
            .end((err, res) => {
                if (err) {
                    debug(`err => ${err.stack}`);
                    done(err);
                } else {
                    expect(res.body).to.be.jsonSchema(makeOrderJsonSchema);
                    debug(JSON.stringify(res.body, null, 2));
                    paypalOrder = res.body.order;
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
                required: ['user_id', 'order_id', 'price', 'status', 'result', 'reason'],
                properties: {
                    user_id: {type: 'string'},
                    order_id: {type: 'integer'},
                    price: {type: 'integer'},
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

describe('Query redeem Order API', function () {

    this.timeout(15000);

    it('Ongoing Orders', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                return agent.post(`/delivery/in_app`).send({
                    status: OrderSet.StatusSet.ONGOING,
                    order_type: OrderSet.OrderTypeSet.REDEEM,
                    limit: 2
                });
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(queryOrderJsonschema);
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
            required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
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

    it('Update Inventory Order Result To OK', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = inventoryOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id,
                    result: OrderSet.ResultSet.OK,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_OK
                };
                return agent.post(`/delivery/in_app/update`).send(body);
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

    it('Update Another Inventory Order Result To CHEATED', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = anotherInventoryOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id,
                    result: OrderSet.ResultSet.CHEATED,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_CHEATED
                };
                return agent.post(`/delivery/in_app/update`).send(body);
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

    it('Update Amazon_US Order Result To OK', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = amazonUSOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id,
                    result: OrderSet.ResultSet.OK,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_OK
                };
                return agent.post(`/delivery/in_app/update`).send(body);
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

    it('Update Paypal Order Result To OK', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = paypalOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id,
                    result: OrderSet.ResultSet.OK,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_OK
                };
                return agent.post(`/delivery/in_app/update`).send(body);
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
                let order = amazonUSOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: Date.now(),
                    result: OrderSet.ResultSet.CHEATED,
                    reason: OrderSet.ReasonSet.HUMAN_CHECKED_CHEATED
                };
                return agent.post(`/delivery/in_app/update`).send(body);
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
            required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason', 'giftcard_items'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'},
                giftcard_items: {type: 'array'},
                mail_id: {type: 'string'}          // not required because paypal order does not send email
            }
        }
    }
};

describe('Deliver redeem Order API', function () {

    this.timeout(80000);

    it('Deliver Inventory Redeem Order', done => {

        TestUtils.loginWithTestUser(bossUserData)
            .then(agent => {
                let order = inventoryOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/in_app/deliver`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(deliverOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it('Deliver Amazon_US Redeem Order', done => {

        TestUtils.loginWithTestUser(bossUserData)
            .then(agent => {
                let order = amazonUSOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/in_app/deliver`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(deliverOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it('Deliver Paypal Redeem Order', done => {

        TestUtils.loginWithTestUser(bossUserData)
            .then(agent => {
                let order = paypalOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/in_app/deliver`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(deliverOrderJsonschema);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it('Deliver Redeem Order With Invalid Status', done => {

        TestUtils.loginWithTestUser(bossUserData)
            .then(agent => {
                let order = amazonUSOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/in_app/deliver`).send(body);
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
            required: ['user_id', 'order_id', 'price', 'email', 'status', 'result', 'reason'],
            properties: {
                user_id: {type: 'string'},
                order_id: {type: 'integer'},
                price: {type: 'integer'},
                email: {type: 'string'},
                status: {type: 'string'},
                result: {type: 'string'},
                reason: {type: 'string'},
                error_msg: {type: 'string'}
            }
        }
    }
};

describe('Reject Redeem Order API', function () {

    this.timeout(80000);

    it('Normal Redeem Order', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let order = anotherInventoryOrder;
                let body = {
                    user_id: order.user_id,
                    order_id: order.order_id
                };
                return agent.post(`/delivery/in_app/reject`).send(body);
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