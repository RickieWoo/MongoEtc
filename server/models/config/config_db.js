/**
 * Created by feix on 2017/3/6.
 */

let AWS = require('../aws_connector');
let utils = require('../../utils/utils');
let InternalErrorSet = require('../../conf/internal_error_set');

class ConfigDB {
    constructor(param) {
        this.hash_key = 'item_type';
        this.range_key = 'item_name';

        if (param) {
            if (param.useDevDB) {
                this.table = new AWS.DynamoDB.DocumentClient({
                    params: {
                        TableName: 'gift_config_debug'
                    }
                });
            }
            else {
                this.table = new AWS.DynamoDB.DocumentClient({
                    params: {
                        TableName: 'gift_config'
                    }
                });
            }
        }
    }

    queryConfigs(data) {
        if (!data[this.hash_key]) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "item_type = :item_type",
            ExpressionAttributeValues: {
                ":item_type": data.item_type
            },
            Limit: data.Limit,
            ExclusiveStartKey: data.ExclusiveStartKey,
            ProjectionExpression: data.ProjectionExpression
        };

        return this.table.query(params).promise();
    }

    scanConfigs(data) {
        let params = {};

        if (data) {
            params = {
                Limit: data.Limit,
                ExclusiveStartKey: data.ExclusiveStartKey,
                ProjectionExpression: data.ProjectionExpression
            };
        }

        return this.table.scan(params).promise();
    }

    deleteConfig(data) {
        if (!data.item_type || !data.item_name) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            Key: {
                [this.hash_key]: data[this.hash_key],
                [this.range_key]: data[this.range_key]
            }
        };

        return this.table.delete(params).promise();
    }

    getConfig(data) {
        if (!data.item_type || !data.item_name) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            Key: {
                [this.hash_key]: data[this.hash_key],
                [this.range_key]: data[this.range_key]
            },
            ProjectionExpression: data.ProjectionExpression
        };

        return this.table.get(params).promise();
    }

    updateConfig(data) {
        if (!data[this.hash_key] || !data[this.range_key]) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            Key: {
                [this.hash_key]: data[this.hash_key],
                [this.range_key]: data[this.range_key]
            }
        };

        utils.markTimestamp(data);

        let removeFieldList = [];
        for (let [key, value] of Object.entries(data)) {
            if (key !== this.hash_key && key !== this.range_key) {
                if (!utils.checkEmpty(value, false)) {
                    if (!params.UpdateExpression) {
                        params.UpdateExpression = 'set ';
                    }
                    params.UpdateExpression += `${key} = :${key}, `;

                    if (params.ExpressionAttributeValues === undefined) {
                        params.ExpressionAttributeValues = {};
                    }
                    if (typeof value === 'object') {
                        value = JSON.stringify(value);
                    }
                    params.ExpressionAttributeValues[`:${key}`] = value;
                }
                else {
                    removeFieldList.push(key);
                }
            }
        }

        // remove空数据项
        if (removeFieldList.length !== 0) {
            if (!params.UpdateExpression) {
                params.UpdateExpression = 'remove ';
            }
            else {
                params.UpdateExpression = params.UpdateExpression.slice(0, -2);
                params.UpdateExpression += ' remove ';
            }

            for (let key of removeFieldList) {
                params.UpdateExpression += `${key}, `;
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

module.exports = ConfigDB;