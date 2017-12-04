'use strict';

let winston = require('winston');
let logger = winston.loggers.get('InventoryLogger');
let SKUPropertyDB = require('../../models/orders/sku_property_db');
let ResponseErrorSet = require('../../conf/response_error_set');
let debug = require('debug')('INVENTORY');
let RecordLogic = require('../record_logic');
let RecordLogger = require('winston').loggers.get('RecordLogger');
let RecordSet = require('../../conf/record_set');
let IsEmpty = require('is-empty');

let Joi = require('joi');

exports.addSKUPropertyItem = function (params) {
    return new Promise((resolve, reject) => {

        let skuPropertyItem = {};

        _validateAddSKUPropertyParams(params)
            .then(value => {
                skuPropertyItem = value;
                skuPropertyItem.create_timestamp = Date.now();
                delete skuPropertyItem.session;

                return SKUPropertyDB.putItem(skuPropertyItem);
            })
            .then(data => {

                debug(`put success: item => ${JSON.stringify(skuPropertyItem, null, 2)}`);

                RecordLogic.recordOperation({
                    user_name: params.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.SKU_ADD,
                    item: JSON.stringify(skuPropertyItem)
                })
                    .catch(err => {
                        RecordLogger.error(`[${RecordSet.SKU_ADD}] record error, params => ${JSON.stringify(skuPropertyItem)}`);
                        RecordLogger.error(`[${RecordSet.SKU_ADD}] record operation error => ${err.stack}`);
                    });

                resolve(skuPropertyItem);
            })
            .catch(err => {
                reject(err);
            });
    });
};

exports.updateSKUPropertyItem = function (params) {
    return new Promise((resolve, reject) => {

        let skuUpdatePropertyItem = {};

        _validateUpdateSKUPropertyParams(params)
            .then(value => {
                skuUpdatePropertyItem = value;
                skuUpdatePropertyItem.update_timestamp = Date.now();
                delete skuUpdatePropertyItem.session;

                return SKUPropertyDB.updateSKUProperty(skuUpdatePropertyItem);
            })
            .then(data => {

                debug(`update success: item => ${JSON.stringify(skuUpdatePropertyItem, null, 2)}`);

                RecordLogic.recordOperation({
                    user_name: params.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.SKU_UPDATE,
                    item: JSON.stringify(skuUpdatePropertyItem)
                })
                    .catch(err => {
                        RecordLogger.error(`[${RecordSet.SKU_UPDATE}] record error, params => ${JSON.stringify(skuUpdatePropertyItem)}`);
                        RecordLogger.error(`[${RecordSet.SKU_UPDATE}] record operation error => ${err.stack}`);
                    });

                resolve(data.Attributes);
            })
            .catch(err => {
                reject(err);
            });
    });
};

exports.queryItems = function (params) {
    return new Promise((resolve, reject) => {

        _validateQueryParams(params)
            .then(value => {
                return _querySKUProperty(value);
            })
            .then(items => {

                let skuPropertyResult = {};

                items.forEach(item => {
                    let sku = item.sku;
                    delete item.sku;
                    skuPropertyResult[sku] = item;
                });

                resolve(skuPropertyResult);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 *
 * @param params
 *
 * sku: S (optional)
 * category: S (optional)
 *
 * @private
 */
function _querySKUProperty(params) {
    return new Promise((resolve, reject) => {
        if (!IsEmpty(params) && !IsEmpty(params.sku)) {
            SKUPropertyDB.getPropertyBySku(params.sku)
                .then(data => {
                    resolve([data.Item]);
                })
                .catch(err => {
                    reject(err);
                });
        } else if (!IsEmpty(params) && !IsEmpty(params.category)) {
            _queryAllItemsByCategory(params)
                .then(data => {
                    resolve(data);
                })
                .catch(err => {
                    reject(err);
                });
        } else {
            SKUPropertyDB.scanSKUProperties()
                .then(data => {
                    resolve(data.Items);
                })
                .catch(err => {
                    reject(err);
                });
        }
    });
}

async function _queryAllItemsByCategory(params) {
    let data = await SKUPropertyDB.queryItemsByCategory({
        category: params.category,
        limit: 1000
    });
    let items = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await SKUPropertyDB.queryItemsByCategory({
            category: params.category,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        items.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    return items;
}

function _validateQueryParams(queryParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string(),
            category: Joi.string()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(queryParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`query sku property params error, Params => ${JSON.stringify(queryParams)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateUpdateSKUPropertyParams(updateItemParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string().required(),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(updateItemParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`Add sku property error, Params => ${JSON.stringify(updateItemParams)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateAddSKUPropertyParams(addItemParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            sku: Joi.string().required(),
            category: Joi.string().required(),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(addItemParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`Add sku property error, Params => ${JSON.stringify(addItemParams)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

