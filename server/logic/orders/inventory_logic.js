'use strict';

let winston = require('winston');
let logger = winston.loggers.get('InventoryLogger');
let ResponseErrorSet = require('../../conf/response_error_set');
let InventorySet = require('../../conf/inventory_set');
let InventoryDB = require('../../models/orders/inventory_db');
let SKUPropertyDB = require('../../models/orders/sku_property_db');
let debug = require('debug')('INVENTORY');
let RecordLogic = require('../record_logic');
let RecordLogger = require('winston').loggers.get('RecordLogger');
let RecordSet = require('../../conf/record_set');
let IsEmpty = require('is-empty');
let Joi = require('joi');

exports.addItem = function (params) {
    return new Promise((resolve, reject) => {

        let inventoryItem = {};

        _validateAddOrGetItemParams(params)
            .then(value => {
                return SKUPropertyDB.getPropertyBySku(value.sku);
            })
            .then(skuPropertyData => {

                if (IsEmpty(skuPropertyData.Item)) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.SKU_PROPERTY_NOT_EXIST));
                }

                inventoryItem = {
                    sku: params.sku,
                    serial: params.serial,
                    timestamp: Date.now(),
                    status: InventorySet.StatusSet.READY
                };

                return InventoryDB.putItem(inventoryItem);
            })
            .then(data => {

                debug(`put success: item => ${JSON.stringify(inventoryItem, null, 2)}`);

                RecordLogic.recordOperation({
                    user_name: params.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.PURCHASE,
                    item: JSON.stringify(inventoryItem)
                })
                    .catch(err => {
                        RecordLogger.error(`[${RecordSet.PURCHASE}] record error, params => ${JSON.stringify(params)}`);
                        RecordLogger.error(`[${RecordSet.PURCHASE}] record operation error => ${err.stack}`);
                    });

                resolve({
                    sku: inventoryItem.sku,
                    timestamp: inventoryItem.timestamp
                });
            })
            .catch(err => {
                reject(err);
            });
    });
};

exports.getItem = function (params) {
    return new Promise((resolve, reject) => {
        _validateAddOrGetItemParams(params)
            .then(params => {
                return InventoryDB.getItem(params);
            })
            .then(data => {
                resolve(data.Item);
            })
            .catch(err => {
                reject(err);
            })
    })
};

exports.queryItems = function (params) {
    return new Promise((resolve, reject) => {

        _validateQueryParams(params)
            .then(value => {
                return _queryInventoryCountBySku(value.sku);
            })
            .then(len => {

                debug(`query by sku items count => ${len}`);

                resolve({
                    [params.sku]: {
                        count: len
                    }
                })
            })
            .catch(err => {
                reject(err);
            });
    });
};

exports.fetchAvailableItemBySku = function (sku) {
    return new Promise((resolve, reject) => {

        if (IsEmpty(sku)) {
            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
        } else {
            _queryAllAvailableItemsBySku(sku)
                .then(items => {
                    let inventoryItem = items[0];
                    if (IsEmpty(inventoryItem)) {
                        return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.NO_INVENTORY_FOR_SKU));
                    }
                    debug(`fetchAvailableItemBySku inventoryItem => ${inventoryItem}`);

                    return InventoryDB.lockInventoryItem(inventoryItem);
                })
                .then(inventoryItemData => {
                    let updatedInventoryItem = inventoryItemData.Attributes;
                    debug(`fetchAvailableItemBySku updatedInventoryItem => ${updatedInventoryItem}`);
                    resolve(updatedInventoryItem);
                })
                .catch(err => {
                    reject(err);
                });
        }
    });
};

/**
 * confirm and delete an item in inventory.
 * PS: This item must be fetched before.
 * @param confirmParams
 */
exports.confirmAndDeleteItem = function (confirmParams) {
    return new Promise((resolve, reject) => {

        _validateConfirmItemParams(confirmParams)
            .then(value => {
                return InventoryDB.confirmAndDeleteInventoryItem(value);
            })
            .then(data => {
                resolve(data.Attributes);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * return an item to inventory.
 * PS: This item must be fetched before.
 * @param returnParams
 */
exports.returnItem = function (returnParams) {
    return new Promise((resolve, reject) => {

        _validateReturnItemParams(returnParams)
            .then(value => {
                return InventoryDB.unlockInventoryItem(value);
            })
            .then(data => {
                resolve(data.Attributes);
            })
            .catch(err => {
                reject(err);
            });
    });
};

async function _queryInventoryCountBySku(sku) {

    let inventoryQueryData = await InventoryDB.queryBySku({sku: sku});
    let len = inventoryQueryData.Items.length;

    while(!IsEmpty(inventoryQueryData.LastEvaluatedKey)) {
        inventoryQueryData = await InventoryDB.queryBySku({sku: sku, offset: inventoryQueryData.LastEvaluatedKey.serial});
        len += inventoryQueryData.Items.length;
    }

    return len;
}

async function _queryAllAvailableItemsBySku(sku) {
    let data = await InventoryDB.queryAvailableItemsBySku({
        sku: sku,
        limit: 1000
    });
    let items = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await InventoryDB.queryAvailableItemsBySku({
            sku: sku,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        items = items.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    return items;
}

function _validateQueryParams(addItemsParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(addItemsParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`Add items param error, Params => ${JSON.stringify(params)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateAddOrGetItemParams(addItemParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string().required(),
            serial: Joi.string().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(addItemParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`Add/Get item params error, Params => ${JSON.stringify(addItemParams)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateConfirmItemParams(confirmParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string().required(),
            serial: Joi.string().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(confirmParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`confirm item params error, Params => ${JSON.stringify(confirmParams)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateReturnItemParams(returnParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string().required(),
            serial: Joi.string().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(returnParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`fetch item params error, Params => ${JSON.stringify(returnParams)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

/* =========================== Main Start ========================== */
if (typeof require !== 'undefined' && require.main === module) {
}
/* =========================== Main End ========================== */

