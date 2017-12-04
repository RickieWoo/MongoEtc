
'use strict';

let AWS = require('../aws_connector');
let InternalErrorSet = require('../../conf/internal_error_set');
let utils = require('../../utils/utils');

class UserFriendDB {
    constructor() {
        this.hash_key = 'user_id';
        this.range_key = 'friend_user_id';
        this.table = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: 'gift_user_friend'
            }
        });
    }

    queryUserFriends(queryParams) {
        if (!queryParams[this.hash_key]) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id
            },
            Limit: queryParams.Limit || queryParams.limit,
            ProjectionExpression: queryParams.ProjectionExpression,
            ScanIndexForward: false
        };

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

    queryUserFriendsByTimestamp(queryParams) {
        if (!queryParams[this.hash_key]) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": queryParams.user_id
            },
            Limit: queryParams.Limit || queryParams.limit,
            ProjectionExpression: queryParams.ProjectionExpression,
            IndexName: "user_id-timestamp-index",
            ScanIndexForward: false
        };

        if (undefined !== queryParams.offset) {
            params.ExclusiveStartKey = {
                [this.hash_key]: queryParams.user_id,
                timestamp: queryParams.offset
            };
        }
        else if (queryParams.ExclusiveStartKey) {
            params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
        }

        return this.table.query(params).promise();
    }

    updateUserFriend(data) {
        if (!(data[this.hash_key] && [this.range_key])) {
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

module.exports = UserFriendDB;