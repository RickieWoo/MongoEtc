'use strict';

let AWS = require('../aws_connector');
let InternalErrorSet = require('../../conf/internal_error_set');
let table = new AWS.DynamoDB.DocumentClient();
let IsEmpty = require('is-empty');
let InventorySet = require('../../conf/inventory_set');
let config = require('config');

const tableName = (process.env.NODE_ENV === 'development') ? 'gift_inventory_dev' : 'gift_inventory';
const hashKey = 'sku';
const rangeKey = 'serial';
const statusIndexName = 'sku-status-index';
const statusIndexRangeKey = 'status';

/**
 *
 * @param inventoryItem
 *
 * sku: S
 * serial: S
 *
 * @returns {Promise.<*>}
 */
exports.getItem = function (inventoryItem) {

    if (IsEmpty(inventoryItem) || IsEmpty(inventoryItem[hashKey]) || IsEmpty(inventoryItem[rangeKey])) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: inventoryItem[hashKey],
            [rangeKey]: inventoryItem[rangeKey]
        }
    };

    return table.get(params).promise();
};

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

    if (IsEmpty(inventoryItem) || IsEmpty(inventoryItem[hashKey]) || IsEmpty(inventoryItem[rangeKey])) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Item: inventoryItem,
        ConditionExpression: `attribute_not_exists(${rangeKey})`
    };

    return table.put(params).promise();
};

exports.queryBySku = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams.sku)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#sku = :sku",
        ExpressionAttributeNames:{
            "#sku": hashKey
        },
        ExpressionAttributeValues: {
            ":sku": queryParams.sku
        }
    };

    params.Limit = parseInt(queryParams.limit) || parseInt(queryParams.Limit) || config.DefaultDBQueryLimit;

    if (undefined !== queryParams.offset) {
        params.ExclusiveStartKey = {
            [hashKey]: queryParams.sku,
            [rangeKey]: queryParams.offset
        };
    }
    else if (queryParams.ExclusiveStartKey) {
        params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
    }

    return table.query(params).promise();
};

exports.queryAvailableItemsBySku = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams.sku)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#sku = :sku AND #status = :status",
        ExpressionAttributeNames:{
            "#sku": hashKey,
            "#status": statusIndexRangeKey
        },
        ExpressionAttributeValues: {
            ":sku": queryParams.sku,
            ":status": InventorySet.StatusSet.READY
        },
        IndexName: statusIndexName
    };

    params.Limit = parseInt(queryParams.limit) || parseInt(queryParams.Limit) || 1;

    if (undefined !== queryParams.offset) {
        params.ExclusiveStartKey = {
            [hashKey]: queryParams.sku,
            [rangeKey]: queryParams.offset
        };
    }
    else if (queryParams.ExclusiveStartKey) {
        params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
    }

    return table.query(params).promise();
};

exports.lockInventoryItem = function (data) {
    if (!data[hashKey] || !data[rangeKey]) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: data[hashKey],
            [rangeKey]: data[rangeKey]
        },
        UpdateExpression: 'set #status = :status',
        ConditionExpression: '#status = :current_status',
        ExpressionAttributeNames:{
            "#status": 'status'
        },
        ExpressionAttributeValues: {
            ":status": InventorySet.StatusSet.DELIVERING,
            ":current_status": InventorySet.StatusSet.READY
        }
    };

    params.ReturnValues = 'ALL_NEW';

    return table.update(params).promise();
};

exports.unlockInventoryItem = function (data) {
    if (!data[hashKey] || !data[rangeKey]) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: data[hashKey],
            [rangeKey]: data[rangeKey]
        },
        UpdateExpression: 'set #status = :status',
        ConditionExpression: '#status = :current_status',
        ExpressionAttributeNames:{
            "#status": 'status'
        },
        ExpressionAttributeValues: {
            ":status": InventorySet.StatusSet.READY,
            ":current_status": InventorySet.StatusSet.DELIVERING
        }
    };

    params.ReturnValues = 'ALL_NEW';

    return table.update(params).promise();
};

exports.confirmAndDeleteInventoryItem = function (data) {
    if (!data[hashKey] || !data[rangeKey]) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: data[hashKey],
            [rangeKey]: data[rangeKey]
        },
        ConditionExpression: '#status = :current_status',
        ExpressionAttributeNames:{
            "#status": 'status'
        },
        ExpressionAttributeValues: {
            ":current_status": InventorySet.StatusSet.DELIVERING
        }
    };

    params.ReturnValues = 'ALL_OLD';

    return table.delete(params).promise();
};

