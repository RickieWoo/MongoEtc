/*
 * @Author: wanghaiuri
 * @Date:   2017-08-09 17:41:42
 * @Last Modified by:   wanghairui
 * @Last Modified time: 2017-03-16 02:35:38
 *
 * This file implements the operations with db => gift_event_log
 * Attribute_field of this db is as following:
 *
 */

let AWS = require('../aws_connector');
let utils = require('../../utils/utils');
let InternalErrorSet = require('../../conf/internal_error_set');

class OperationRecordDB {
    constructor() {
        this.hash_key = 'user_name';
        this.range_key = 'timestamp';
        this.table = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: (process.env.NODE_ENV === 'development') ? 'gift_boss_record_dev' : 'gift_boss_record'
            }
        });
        this.boss_reocord_placeholder = 'boss_record';
    }

    queryOperationRecord(queryParams) {
        return new Promise((resolve, reject) => {
            if (queryParams === undefined) {
                queryParams = {};
            }

            let params = {
                KeyConditionExpression: "#boss_record = :boss_record",
                ExpressionAttributeNames: {
                    "#boss_record": 'boss_record',
                },
                ExpressionAttributeValues: {
                    ":boss_record": this.boss_reocord_placeholder,
                },
                IndexName: 'boss_record-timestamp-index',
                ScanIndexForward: false
            };

            if (queryParams.begin_timestamp && queryParams.end_timestamp) {
                params.ExpressionAttributeNames["#timestamp"] = 'timestamp';
                params.ExpressionAttributeValues[":begin_timestamp"] = parseInt(queryParams.begin_timestamp);
                params.ExpressionAttributeValues[":end_timestamp"] = parseInt(queryParams.end_timestamp);
                params.KeyConditionExpression += " and #timestamp between :begin_timestamp and :end_timestamp";
            }

            let filterKeyList = ['user_name', 'menu_id', 'item_name', 'config_item_name', 'env'];

            for (let key of filterKeyList) {
                if (queryParams[key]) {
                    if (params.FilterExpression !== undefined) {
                        params.FilterExpression += ` and #${key} = :${key}`
                    }
                    else {
                        params.FilterExpression = `#${key} = :${key}`;
                    }
                    params.ExpressionAttributeNames[`#${key}`] = `${key}`;
                    params.ExpressionAttributeValues[`:${key}`] = queryParams[`${key}`];
                }
            }

            if (queryParams.ExclusiveStartKey) {
                params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
            }

            let allData = [];

            this.table.query(params).promise()
                .then(result => {
                    this._onQueryOperationRecord(queryParams, result, allData, resolve, reject)
                })
                .catch(error => reject(error));
        });
    }

    _onQueryOperationRecord (queryParams, queryResult, allData, resolve, reject) {
        if (queryResult.Items) {
            allData.push(...queryResult.Items)
        }

        if (queryResult.LastEvaluatedKey !== undefined && allData.length < queryParams.limit) {
            queryParams.ExclusiveStartKey = queryResult.LastEvaluatedKey;
            this.queryOperationRecord(queryParams)
                .then(result => {
                    this._onQueryOperationRecord(queryParams, result, allData, resolve, reject);
                })
                .catch(error => {
                    reject(error)
                });
        }
        else {
            resolve(allData);
        }
    }

    updateOperationRecord(data) {
        if (!data[this.hash_key] || !data[this.range_key]) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }
        data.boss_record = this.boss_reocord_placeholder;

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

module.exports = OperationRecordDB;