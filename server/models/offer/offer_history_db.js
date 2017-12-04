/*
* @Author: wizardfan
* @Date:   2017-03-17 10:40:42
* @Last Modified by:   wizardfan
* @Last Modified time: 2017-03-17 18:19:15
*/

'use strict';

let AWS = require('../aws_connector');
let utils = require('../../utils/utils');
let InternalErrorSet = require('../../conf/internal_error_set');
let config = require('config');

class OfferHistoryDB {
    constructor() {
        this.hash_key = 'user_id';
        this.range_key = 'timestamp';
        this.table = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: 'gift_offer_history'
            }
        });
    }

    queryUserOfferHistory(queryParams) {
        let params = {
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id
            },
            ScanIndexForward: false
        };

        params.Limit = parseInt(queryParams.limit) || parseInt(queryParams.Limit) || config.DefaultDBQueryLimit;

        if (undefined !== queryParams.offset) {
            params.ExclusiveStartKey = {
                [this.hash_key]: queryParams.user_id,
                [this.range_key]: queryParams.offset
            };
        }
        else if (queryParams.ExclusiveStartKey) {
            params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
        }

        return this.table.query(params).promise();
    }

    queryUserOfferHistoryByOfferId(queryParams) {
        if (undefined === queryParams || undefined === queryParams.user_id || undefined === queryParams.offer_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "#user_id = :user_id AND #offer_id = :offer_id",
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id,
                ":offer_id": queryParams.offer_id
            },
            ExpressionAttributeNames: {
                "#user_id": "user_id",
                "#offer_id": "offer_id"
            },
            IndexName: "user_id-offer_id-index"
        };

        return this.table.query(params).promise();
    }

    queryUserOfferHistoryByOfferIdList(queryParams) {
        if (undefined === queryParams || undefined === queryParams.user_id || undefined === queryParams.offer_id_list) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "#user_id = :user_id",
            ConditionExpression: `offer_id IN (${queryParams.offer_id_list.toString()})`,
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id,
            },
            ExpressionAttributeNames: {
                "#user_id": "user_id"
            },
            IndexName: "user_id-offer_id-index"
        };

        return this.table.query(params).promise();
    }

    updateOfferHistory(data) {
        if (!data[this.hash_key] || !data[this.range_key]) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            Key: {
                [this.hash_key]: data[this.hash_key],
                [this.range_key]: data[this.range_key]
            }
        };

        for (let [key, value] of Object.entries(data)) {
            if (key !== this.hash_key && key !== this.range_key) {
                if (!utils.checkEmpty(value, false)) {
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

        return this.table.update(params).promise();
    }
}

module.exports = OfferHistoryDB;