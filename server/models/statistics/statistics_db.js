'use strict';

let AWS = require('../aws_connector');
let InternalErrorSet = require('../../conf/internal_error_set');
let table = new AWS.DynamoDB.DocumentClient();
let IsEmpty = require('is-empty');
let config = require('config');

const tableName = (process.env.NODE_ENV === 'development') ? 'gift_statistics_dev' : 'gift_statistics';
const hashKey = 'event_name';
const rangeKey = 'dimension';

exports.getItem = function (getParams) {

    if (IsEmpty(getParams) || IsEmpty(getParams[hashKey]) || IsEmpty(getParams[rangeKey])) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: getParams[hashKey],
            [rangeKey]: getParams[rangeKey]
        }
    };

    return table.get(params).promise();
};

exports.updateItem = function (data) {

    if (IsEmpty(data) || IsEmpty(data[hashKey]) || IsEmpty(data[rangeKey])) {
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

exports.queryItems = function(queryParams) {
    if (IsEmpty(queryParams) || IsEmpty(queryParams[hashKey]) || IsEmpty(queryParams.startDimension || IsEmpty(queryParams.endDimension))) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        KeyConditionExpression: "#event_name = :event_name AND #dimension BETWEEN :start_dimension AND :end_dimension",
        ExpressionAttributeNames:{
            "#event_name": hashKey,
            "#dimension": rangeKey
        },
        ExpressionAttributeValues: {
            ":event_name": queryParams[hashKey],
            ":start_dimension": queryParams.startDimension,
            ":end_dimension": queryParams.endDimension
        }
    };

    params.Limit = parseInt(queryParams.limit) || parseInt(queryParams.Limit) || config.DefaultDBQueryLimit;

    if (undefined !== queryParams.offset) {
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