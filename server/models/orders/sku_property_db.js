'use strict';

let AWS = require('../aws_connector');
let InternalErrorSet = require('../../conf/internal_error_set');
let table = new AWS.DynamoDB.DocumentClient();
let IsEmpty = require('is-empty');

const tableName = (process.env.NODE_ENV === 'development') ? 'gift_inventory_sku_property_dev' : 'gift_inventory_sku_property';
const hashKey = 'sku';
const categoryIndexName = 'category-index';
const categoryIndexHashKey = 'category';

/**
 *
 * @param inventoryItem
 *
 * sku: S
 * serial: S
 *
 * @returns {Promise.<*>}
 */
exports.putItem = function (inventoryItem) {

    if (IsEmpty(inventoryItem) || IsEmpty(inventoryItem[hashKey])) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Item: inventoryItem,
        ConditionExpression: `attribute_not_exists(${hashKey})`
    };

    return table.put(params).promise();
};

exports.getPropertyBySku = function (sku) {

    if (IsEmpty(sku)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: sku
        }
    };

    return table.get(params).promise();
};

exports.queryItemsByCategory = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams.category)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#category = :category",
        ExpressionAttributeNames:{
            "#category": categoryIndexHashKey
        },
        ExpressionAttributeValues: {
            ":category": queryParams.category
        },
        IndexName: categoryIndexName
    };

    return table.query(params).promise();
};

exports.updateSKUProperty = function(data) {

    if (!data[hashKey]) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: data[hashKey]
        }
    };

    for (let [key, value] of Object.entries(data)) {
        if (key !== hashKey) {
            if (!IsEmpty(value)) {
                if (!params.UpdateExpression) {
                    params.UpdateExpression = 'set ';
                }

                if (params.ExpressionAttributeNames === undefined) {
                    params.ExpressionAttributeNames = {};
                }
                if (params.ExpressionAttributeValues === undefined) {
                    params.ExpressionAttributeValues = {};
                }
                params.ExpressionAttributeNames[`#${key}`] = key;
                params.UpdateExpression += `#${key} = :${key}, `;
                params.ExpressionAttributeValues[`:${key}`] = value;
            }
        }
    }

    // 去掉末尾的', '
    if (params.UpdateExpression) {
        params.UpdateExpression = params.UpdateExpression.slice(0, -2);
    }

    params.ReturnValues = 'ALL_NEW';

    return table.update(params).promise();
};

exports.scanSKUProperties = function () {

    let params = {
        TableName: tableName
    };

    return table.scan(params).promise();
};