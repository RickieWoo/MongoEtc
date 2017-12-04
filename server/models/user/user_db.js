/*
 * @Author: wizardfan
 * @Date:   2017-03-08 15:55:04
 * @Last Modified by:   wizardfan
 * @Last Modified time: 2017-03-16 02:12:49
 *
 * This file implements the operations with db => ifun_users
 * Attribute_field of this db is as following:
 *
 * user_id => hash_key
 * coins : N
 * country_code : S
 * device_id : S
 * email : S
 * invite_code : S
 * name : S
 * show_invitation : N
 * total_earned_coins : N
 * total_recharged_coins : N
 * register_time : N
 */

'use strict';

let AWS = require('../aws_connector');
let utils = require('../../utils/utils');
let InternalErrorSet = require('../../conf/internal_error_set');
let BalanceReason = require('../../conf/balance_reasons');

class UsersDB {
    constructor() {
        this.hash_key = 'user_id';
        this.table = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: 'gift_user'
            }
        });
        this.legacyTable = new AWS.DynamoDB.DocumentClient({
            params: {
                TableName: 'ifun_users'
            }
        });
    }

    getUserByUserId(userID) {
        return this.table.get({
            Key: {
                [this.hash_key]: userID
            }
        }).promise();
    }

    putUser(user) {
        return this.table.put({
            Item: user,
            ConditionExpression: `attribute_not_exists(${this.hash_key})`
        }).promise();
    }

    deleteUserByUserId(userID) {
        return this.table.delete({
            Key: {
                [this.hash_key]: userID
            }
        }).promise();
    }

    retrieveLegacyUserByUserId(userID) {
        return this.legacyTable.get({
            Key: {
                [this.hash_key]: userID
            }
        }).promise();
    }

    getUserByName(data) {
        let userName = data.name;
        let appName = data.app_name;

        if (!userName || !appName) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        return new Promise((resolve, reject) => {
            let params = {
                KeyConditionExpression: "#name = :name",
                ExpressionAttributeValues: {
                    ":name": userName
                },
                ExpressionAttributeNames: {
                    "#name": "name"
                },
                IndexName: "name-index",
            };

            this.table.query(params).promise()
                .then(result => {
                    let candidateUserList = result.Items;
                    let foundUser = false;
                    for (let user of candidateUserList) {
                        let userAppName = user.user_id.split('_')[0];
                        if (userAppName == appName) {
                            foundUser = true;
                            this.getUserByUserId(user.user_id)
                                .then(result => resolve(result))
                                .catch(error => reject(error));
                            break;
                        }
                    }
                    if (!foundUser) {
                        resolve({});
                    }
                })
                .catch(error => {
                    reject(error);
                });
        })
    }

    retrieveLegacyUserByName(data) {
        let userName = data.name;
        let appName = data.app_name;

        if (!userName || !appName) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        return new Promise((resolve, reject) => {
            let params = {
                KeyConditionExpression: "#name = :name",
                ExpressionAttributeValues: {
                    ":name": userName
                },
                ExpressionAttributeNames: {
                    "#name": "name"
                },
                IndexName: "unique_name-index",
            };

            this.legacyTable.query(params).promise()
                .then(result => {
                    let candidateUserList = result.Items;
                    let foundUser = false;
                    for (let user of candidateUserList) {
                        let userAppName = user.user_id.split('_')[0];
                        if (userAppName == appName) {
                            foundUser = true;
                            this.retrieveLegacyUserByUserId(user.user_id)
                                .then(result => resolve(result))
                                .catch(error => {
                                    reject(error);
                                });
                            break;
                        }
                    }
                    if (!foundUser) {
                        resolve({});
                    }
                })
                .catch(error => {
                    reject(error);
                });
        })
    }

    getUserIDByInviteCode(inviteCode) {
        if (!inviteCode) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        return new Promise((resolve, reject) => {
            let params = {
                KeyConditionExpression: "#invite_code = :invite_code",
                ExpressionAttributeValues: {
                    ":invite_code": inviteCode
                },
                ExpressionAttributeNames: {
                    "#invite_code": "invite_code"
                },
                IndexName: "invite_code-index",
            };

            this.table.query(params).promise()
                .then(result => {
                    if (!utils.checkEmpty(result.Items)) {
                        resolve(result.Items[0].user_id);
                    }
                    else {
                        resolve();
                    }
                })
                .catch(error => {
                    reject(error);
                });
        })
    }

    getUserByInviteCode(inviteCode) {
        if (!inviteCode) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        return new Promise((resolve, reject) => {
            let params = {
                KeyConditionExpression: "#invite_code = :invite_code",
                ExpressionAttributeValues: {
                    ":invite_code": inviteCode
                },
                ExpressionAttributeNames: {
                    "#invite_code": "invite_code"
                },
                IndexName: "invite_code-index",
            };

            this.table.query(params).promise()
                .then(result => {
                    if (!utils.checkEmpty(result.Items)) {
                        this.getUserByUserId(result.Items[0].user_id)
                            .then(result => resolve(result))
                            .catch(error => reject(error));
                    }
                    else {
                        resolve();
                    }
                })
                .catch(error => {
                    reject(error);
                });
        })
    }

    getUserSNSProfileBySNSID(data) {
        let snsID = data.sns_id;
        let appName = data.app_name;

        if (!snsID || !appName) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        return new Promise((resolve, reject) => {
            let params = {
                KeyConditionExpression: "sns_id = :sns_id",
                ExpressionAttributeValues: {
                    ":sns_id": snsID
                },
                IndexName: 'sns_id-user_id-index',
                ScanIndexForward: false
            };

            this.table.query(params).promise()
                .then(result => {
                    let candidateUserList = result.Items;
                    let foundUser;
                    for (let user of candidateUserList) {
                        let userAppName = user.user_id.split('_')[0];
                        if (userAppName == appName) {
                            foundUser = user;
                            break;
                        }
                    }
                    resolve(foundUser);
                })
                .catch(error => {
                    reject(error);
                });
        })
    }

    markLegacyUser(userID) {
        if (!userID) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let param = {
            Key: {
                [this.hash_key]: userID
            },
            ExpressionAttributeValues: {
                ':transfer_to_gift': 1
            },
            UpdateExpression: 'set transfer_to_gift = :transfer_to_gift'
        };

        return this.legacyTable.update(param).promise();
    }

    updateUser(data) {
        if (!data.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let params = {
            Key: {
                [this.hash_key]: data[this.hash_key]
            }
        };

        let removeFieldList = [];
        for (let [key, value] of Object.entries(data)) {
            if (key !== this.hash_key) {
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

    updateUserCoins(data, options) {
        if (!data.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let param = {
            Key: {
                [this.hash_key]: data.user_id
            },
            ExpressionAttributeValues: {
                ':coin_change': data.coin_change
            },
            ReturnValues: 'UPDATED_NEW'
        };
        if (options) {
            param.ReturnValues = options.ReturnValues;
        }

        let updateExpression = 'add coins :coin_change';
        if (data.coin_change > 0) {
            updateExpression += ', total_earned_coins :coin_change';
        }
        else if (data.coin_change < 0 && data.reason && data.reason.startsWith(BalanceReason.CostCoinsReasons.REDEEM_CARD_PREFIX)) {
            param.ExpressionAttributeValues[':coin_recharged'] = -data.coin_change;
            updateExpression += ', total_recharged_coins :coin_recharged';
        }
        param.UpdateExpression = updateExpression;

        return this.table.update(param).promise();
    }

    updateUserExp(data, options) {
        if (!data.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }
        let param = {
            Key: {
                [this.hash_key]: data.user_id
            },
            updateExpression: 'add exp :exp_change',
            ExpressionAttributeValues: {
                ':exp_change': data.coin_change
            },
            ReturnValues: 'UPDATED_NEW'
        };
        if (options) {
            param.ReturnValues = options.ReturnValues;
        }
        return this.table.update(param).promise();
    }

    updateInviterFriendInfo(data) {
        if (!data.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let param = {
            Key: {
                [this.hash_key]: data.user_id
            },
            ExpressionAttributeValues: {
                ':coin_change': data.coin_change,
                ':add_friend_count': 1
            },
            UpdateExpression: 'add coins_from_friends :coin_change, friends_count :add_friend_count',
            ReturnValues: data.ReturnValues || 'UPDATED_NEW'
        };

        return this.table.update(param).promise();
    }

    updateUserOfferInfo(data) {
        if (!data.user_id) {
            return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
        }

        let param = {
            Key: {
                [this.hash_key]: data.user_id
            },
            ExpressionAttributeValues: {
                ':coin_change': data.coin_change,
                ':add_offer_count': 1
            },
            UpdateExpression: 'add coins_from_offer :coin_change, offer_count :add_offer_count',
            ReturnValues: data.ReturnValues || 'ALL_NEW'
        };

        return this.table.update(param).promise();
    }
}

module.exports = UsersDB;