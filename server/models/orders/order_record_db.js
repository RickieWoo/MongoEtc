/*
* @Author: wizardfan
* @Date:   2017-03-07 14:59:52
* @Last Modified by:   wizardfan
* @Last Modified time: 2017-03-16 02:51:43
*
* user_id => hash_key
* timestamp => range_key
* item : O => ['sku', 'name', 'country', 'price', 'device', 'stock']
* price : N
* sku : S
* status: S => ongoing | complete | cancelled | pending
* country_code: S
* env : O => ['app_name', 'ip', 'client_name', 'platform', 'timestamp', 'client_version']
*/

'use strict';

let AWS = require('../aws_connector');
let table = new AWS.DynamoDB.DocumentClient();
let InternalErrorSet = require('../../conf/internal_error_set');
let config = require('config');
let IsEmpty = require('is-empty');

const tableName = (process.env.NODE_ENV === 'development') ? 'gift_order_record_dev' : 'gift_order_record';
const hashKey = 'user_id';
const rangeKey = 'timestamp';
const orderTypeStatusIndexName = 'type_status-index';
const orderTypeStatusIndexHashKey = 'type_status_filter';
const mailIdIndexHashKey = 'mail_id';
const mailIdIndexName = 'mail_id-index';

exports.getOrderRecord = function (userId, timestamp) {

    if (IsEmpty(userId) || IsEmpty(timestamp)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: userId,
            [rangeKey]: timestamp
        }
    };

    return table.get(params).promise();
};

exports.updateOrder = function (data) {

    if (IsEmpty(data[hashKey]) || IsEmpty(data[rangeKey])) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: data[hashKey],
            [rangeKey]: data[rangeKey]
        }
    };

    for (let [key, value] of Object.entries(data)) {
        if (key !== hashKey && key !== rangeKey) {
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

/**
 *
 * @param queryParams
 * type_status_filter: S
 * Limit: N (optional)
 *
 * ExclusiveStartKey: O (include both key [user_id] and key [timestamp]
 *
 * offset: N (optional)
 * user_id: S (needed when offset is not empty)
 *
 */
exports.queryOrdersByTypeStatusFilter = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams.type_status_filter)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#type_status_filter = :type_status_filter",
        ExpressionAttributeNames:{
            "#type_status_filter": orderTypeStatusIndexHashKey
        },
        ExpressionAttributeValues: {
            ":type_status_filter": queryParams.type_status_filter
        },
        IndexName: orderTypeStatusIndexName
    };

    params.Limit = parseInt(queryParams.limit) || parseInt(queryParams.Limit) || config.DefaultDBQueryLimit;

    if (!IsEmpty(queryParams.offset)) {
        params.ExclusiveStartKey = {
            [hashKey]: queryParams.user_id,
            [rangeKey]: queryParams.offset
        };
    }
    else if (queryParams.ExclusiveStartKey) {
        params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
    }

    return table.query(params).promise();
};

/**
 *
 * @param queryParams
 *
 * user_id: S
 * Limit: N (optional)
 *
 * offset: N (optional)
 *
 * ExclusiveStartKey: O (include both key [user_id] and key [timestamp]
 *
 */
exports.queryOrdersByUserId = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams[hashKey])) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#user_id = :user_id",
        ExpressionAttributeNames:{
            "#user_id": hashKey
        },
        ExpressionAttributeValues: {
            ":user_id": queryParams[hashKey]
        }
    };

    params.Limit = parseInt(queryParams.limit) || parseInt(queryParams.Limit) || config.DefaultDBQueryLimit;

    if (!IsEmpty(queryParams.offset)) {
        params.ExclusiveStartKey = {
            [hashKey]: queryParams[hashKey],
            [rangeKey]: queryParams.offset
        };
    }
    else if (queryParams.ExclusiveStartKey) {
        params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
    }

    return table.query(params).promise();
};

/**
 *
 * @param queryParams
 * mail_id: S
 */
exports.queryOrdersByMailId = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams.mail_id)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#mail_id = :mail_id",
        ExpressionAttributeNames:{
            "#mail_id": mailIdIndexHashKey
        },
        ExpressionAttributeValues: {
            ":mail_id": queryParams.mail_id
        },
        IndexName: mailIdIndexName
    };

    return table.query(params).promise();
};

exports.queryOrdersByTypeStatusAndTimeRange = function (queryParams) {

    if (IsEmpty(queryParams) || IsEmpty(queryParams.typeStatus) || IsEmpty(queryParams.startTime) || IsEmpty(queryParams.endTime)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#type_status_filter = :type_status AND #timestamp BETWEEN :start_time AND :end_time",
        ExpressionAttributeNames:{
            "#type_status_filter": orderTypeStatusIndexHashKey,
            "#timestamp": rangeKey
        },
        ExpressionAttributeValues: {
            ":type_status": queryParams.typeStatus,
            ":start_time": queryParams.startTime,
            ":end_time": queryParams.endTime
        },
        IndexName: orderTypeStatusIndexName
    };

    return table.query(params).promise();
};
