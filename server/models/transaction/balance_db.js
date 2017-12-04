/*
 * @Author: wizardfan
 * @Date:   2017-03-07 15:00:41
 * @Last Modified by: yshan
 * @Last Modified time: 2017-08-24 17:53:21
 *
 * Attribute_field of this db is as following:
 *
 * user_id => hash_key
 * timestamp => range_key
 * balance : N
 * change : N
 * reason : S
 */

let AWS = require('../aws_connector');
let Utils = require('../../utils/utils');
let InternalErrorSet = require('../../conf/internal_error_set');
let config = require('config');

class BalanceDB {
    constructor() {
        this.hash_key = 'user_id';
        this.range_key = 'timestamp';
        this.table = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: 'gift_balance'
            }
        });
        this.legacyTable = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: 'ifun_coins'
            }
        });
    }

    queryBalance(queryParams) {
        if (!queryParams.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id
            },
            ProjectionExpression: queryParams.ProjectionExpression,
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


    queryRecentBalance(queryParams) {
        if (!queryParams.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "user_id = :user_id AND #T >= :timestamp",
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id,
                ":timestamp": queryParams.timestamp
            },
            ExpressionAttributeNames:{
                "#T":"timestamp"
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

    copyLegacyBalanceRecordsByUserId(userID, coinTimes) {
        return new Promise((resolve, reject) => {
            if (!userID) {
                return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
            }

            let params = {
                KeyConditionExpression: "user_id = :user_id",
                ExpressionAttributeValues: {
                    ":user_id": userID
                },
                Limit: 100,
                ScanIndexForward: false
            };

            coinTimes = coinTimes || 1;
            this.legacyTable.query(params).promise()
                .then(sourceResult => {
                    let records = sourceResult.Items;
                    if (!Utils.checkEmpty(records)) {
                        for (let record of records) {
                            this.updateBalance({
                                user_id: record.user_id,
                                timestamp: record.timestamp * 1000,
                                balance: record.balance * coinTimes,
                                reason: record.reason,
                                change: record.change * coinTimes,
                            }).catch(error => {
                                // do nothing
                            })
                        }
                        resolve(records.length);
                    }
                    else {
                        resolve(0);
                    }
                }).catch(error => reject(error))
        })
    }

    updateBalance(data) {
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
                if (!Utils.checkEmpty(value, false)) {
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

module.exports = BalanceDB;
