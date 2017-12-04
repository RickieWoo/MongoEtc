'use strict';

let chai = require('chai');
let expect = chai.expect;
let TestUtils = require('../../utils/test_utils');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

let debug = require('debug')('TEST');

let skuPropertyTestData = require('./sku_test_data.json');

let addItemResponseJsonSchema = {
    type: 'object',
    required: ['sku', 'create_timestamp'],
    properties: {
        sku: {type: 'string'},
        create_timestamp: {type: 'integer'}
    }
};

let updateItemResponseJsonSchema = {
    type: 'object',
    required: ['sku', 'update_timestamp'],
    properties: {
        sku: {type: 'string'},
        update_timestamp: {type: 'integer'}
    }
};

let queryInfoSchema = {
	type: 'object',
	'patternProperties' : {
		'(.*)': {
			type: 'object',
            required: ['category', 'price' , 'currency_code'],
			properties: {
                category: {type: 'string'},
				price: {type: 'number'},
				currency_code: {type: 'string'}
			}
		}
	}
};

describe('SKU Property Add API', function () {

    this.timeout(15000);

    it('Add SKU amazon_gb_1 Property', done => {
        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_add_item_test_data_amazon_gb_1;
                return agent.put(`/sku`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(addItemResponseJsonSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });


    it('Add SKU amazon_gb_2 Property', done => {
        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_add_item_test_data_amazon_gb_2;
                return agent.put(`/sku`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(addItemResponseJsonSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });

    it('Add SKU amazon_us Property', done => {
        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_add_item_test_data_amazon_us;
                return agent.put(`/sku`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(addItemResponseJsonSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });

    it('Add SKU paypal Property', done => {
        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_add_item_test_data_paypal;
                return agent.put(`/sku`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(addItemResponseJsonSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });

    it('Add SKU google_us_2 Property', done => {
        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_add_item_test_data_google_us_2;
                return agent.put(`/sku`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(addItemResponseJsonSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });

    it('Add Duplicate SKU Property', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_add_item_test_data_amazon_gb_2;
                return agent.put(`/sku`).send(body);
            })
            .catch(err => {
                expect(err.status).to.be.equal(500);
                done();
            });
    });
});

describe('SKU Property Update API', function () {

    this.timeout(15000);

    it('Update SKU amazon_gb_2 Property', done => {
        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = skuPropertyTestData.sku_update_item_test_data_amazon_gb_2;
                return agent.post(`/sku`).send(body);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(updateItemResponseJsonSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });
});

describe('SKU Property Query API', function () {

    this.timeout(15000);

    it('Query SKU Property By SKU', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                return agent.get(`/sku`).query({sku: skuPropertyTestData.sku_update_item_test_data_amazon_gb_2.sku});
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(queryInfoSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });

    it('Query SKU Property By Category', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                return agent.get(`/sku`).query({category: skuPropertyTestData.sku_update_item_test_data_amazon_gb_2.category});
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(queryInfoSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });

    it('Query ALL SKU Property', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                return agent.get(`/sku`);
            })
            .then(res => {
                debug(JSON.stringify(res.body, null, 2));
                expect(res.body).to.be.jsonSchema(queryInfoSchema);
                done();
            })
            .catch(err => {
                debug(`test error: ${err.stack}`);
            });
    });
});

