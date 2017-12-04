'use strict';

let chai = require('chai');
let expect = chai.expect;
let TestUtils = require('../../utils/test_utils');

chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

let debug = require('debug')('TEST');

let inventoryTestData = require('./inventory_test_data.json');
let ResponseErrorSet = require('../../conf/response_error_set');
let InventoryLogic = require('../../logic/orders/inventory_logic');
let InventorySet = require('../../conf/inventory_set');

let addItemResponseJsonSchema = {
    type: 'object',
    required: ['sku', 'timestamp'],
    properties: {
        sku: {type: 'string'},
        timestamp: {type: 'integer'}
    }
};

describe('Inventory Add API', function () {

    this.timeout(15000);

    it('Add Item With SKU amazon_gb_1 To Inventory', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = inventoryTestData.inventory_add_item_test_data_amazon_gb_1_1;
                return agent.put(`/inventory`).send(body);
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

    it('Add Another Item With SKU amazon_gb_1 To Inventory', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = inventoryTestData.inventory_add_item_test_data_amazon_gb_1_2;
                return agent.put(`/inventory`).send(body);
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

    it('Add Item With SKU amazon_gb_2 To Inventory', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = inventoryTestData.inventory_add_item_test_data_amazon_gb_2;
                return agent.put(`/inventory`).send(body);
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

    it('Add Item With SKU Property not exists', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = inventoryTestData.inventory_add_item_test_data_sku_not_exist;
                return agent.put(`/inventory`).send(body);
            })
            .catch(err => {
                expect(err.status).to.be.equal(ResponseErrorSet.OrderErrorSet.SKU_PROPERTY_NOT_EXIST.status);
                done();
            });
    });

    it('Add Duplicate Item To Inventory', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                let body = inventoryTestData.inventory_add_item_test_data_duplication;
                return agent.put(`/inventory`).send(body);
            })
            .catch(err => {
                expect(err.status).to.be.equal(500);
                done();
            });
    });
});

let queryInfoSchema = {
    type: 'object',
    'patternProperties' : {
        '(.*)': {
            type: 'object',
            required: ['count'],
            properties: {
                count: {type: 'integer'}
            }
        }
    }
};

describe('Inventory Query API', function () {

    this.timeout(15000);

    it('Query Inventory With SKU', done => {

        TestUtils.loginWithTestUser({})
            .then(agent => {
                return agent.get(`/inventory`).query({sku: inventoryTestData.inventory_add_item_test_data_amazon_gb_1_1.sku});
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

let getItemJsonschema = {
    type: 'object',
    required: ['sku', 'serial', 'status'],
    properties: {
        sku: {type: 'string'},
        serial: {type: 'string'},
        timestamp: {type: 'number'},
        status: {type: 'string'}
    }
};

describe('Inventory  Get Item API', function () {
    this.timeout(8000);

    it('Get Normal Item', done => {
        InventoryLogic.getItem(inventoryTestData.inventory_add_item_test_data_amazon_gb_1_1)
            .then(item => {
                debug(JSON.stringify(item, null, 2));
                expect(item).to.be.jsonSchema(getItemJsonschema);
                done();
            })
            .catch(err => {
                debug(`test error => ${err.stack}`);
                done(err);
            })
    });

    it('Get Item Not Exists', done => {
        InventoryLogic.getItem(inventoryTestData.inventory_add_item_test_data_sku_not_exist)
            .then(item => {
                expect(item).to.not.be.jsonSchema(getItemJsonschema);
                done();
            })
            .catch(err => {
                debug(`test error => ${err.stack}`);
                done(err);
            })
    })
});

let lockedItem1 = {};
let lockedItem2 = {};

describe('Inventory Fetch Available Item API', function () {
    this.timeout(15000);

    it('Fetch Available Item With Empty SKU', done => {
        InventoryLogic.fetchAvailableItemBySku(undefined)
            .then(data => {
                debug(JSON.stringify(data, null, 2));
            })
            .catch(err => {
                debug(JSON.stringify(err, null, 2));
                expect(err.status).to.equal(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR.status);
                done();
            });
    });

    it('Fetch Available Item With Nonexistent SKU', done => {
        InventoryLogic.fetchAvailableItemBySku(inventoryTestData.inventory_add_item_test_data_sku_not_exist.sku)
            .then(data => {
                debug(JSON.stringify(data, null, 2));
            })
            .catch(err => {
                debug(JSON.stringify(err, null, 2));
                expect(err.status).to.equal(ResponseErrorSet.OrderErrorSet.NO_INVENTORY_FOR_SKU.status);
                done();
            });
    });

    it('Fetch Available Item With Normal SKU 1', done => {
        InventoryLogic.fetchAvailableItemBySku(inventoryTestData.inventory_add_item_test_data_amazon_gb_1_1.sku)
            .then(data => {
                debug(JSON.stringify(data, null, 2));
                expect(data.status).to.equal(InventorySet.StatusSet.DELIVERING);
                lockedItem1 = data;
                done();
            })
            .catch(err => {
                debug(`test error => ${err.stack}`);
            });
    });

    it('Fetch Available Item With Normal SKU 2', done => {
        InventoryLogic.fetchAvailableItemBySku(inventoryTestData.inventory_add_item_test_data_amazon_gb_1_2.sku)
            .then(data => {
                debug(JSON.stringify(data, null, 2));
                expect(data.status).to.equal(InventorySet.StatusSet.DELIVERING);
                lockedItem2 = data;
                done();
            })
            .catch(err => {
                debug(`test error => ${err.stack}`);
            });
    });
});

describe('Confirm And Delete Item API', function () {
    this.timeout(15000);

    it('Confirm And Delete Locked Item', done => {
        InventoryLogic.confirmAndDeleteItem(lockedItem1)
            .then(data => {
                debug(JSON.stringify(data, null, 2));
                expect(data.status).to.equal(InventorySet.StatusSet.DELIVERING);
                done();
            })
            .catch(err => {
                debug(`test error => ${err.stack}`);
            });
    });
});

describe('Return Item API', function () {
    this.timeout(15000);

    it('Return Locked Item', done => {
        InventoryLogic.returnItem(lockedItem2)
            .then(data => {
                debug(JSON.stringify(data, null, 2));
                expect(data.status).to.equal(InventorySet.StatusSet.READY);
                done();
            })
            .catch(err => {
                debug(`test error => ${err.stack}`);
            });
    });
});