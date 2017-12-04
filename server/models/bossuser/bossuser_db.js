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
let InternalErrorSet = require('../../conf/internal_error_set');
let config = require('../../conf/internal_error_set');
let table = new AWS.DynamoDB.DocumentClient();
let IsEmpty = require('is-empty');

let tableName = 'gift_boss_user';
exports.getUserByName = function (userName) {

	if (IsEmpty(userName)) {
		return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
	}

	let params = {
		TableName: tableName,
		Key: {
			user_name: userName
		}
	};

	return table.get(params).promise();
};

exports.addUser = function (userItem) {
    
		if (IsEmpty(userItem.user_name || userItem.password || userItem.auth)) {
        return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
    }

    let params = {
        TableName: tableName,
        Item: userItem,
    };

    return table.put(params).promise();
};

exports.updateUser = function (userItem) {
	
	if (IsEmpty(userItem.user_name)) {
			return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
	}

	let params = {
			TableName: tableName,
			Item: userItem,
	};

	return table.put(params).promise();
};

exports.deleteUser = function (userName) {
	
	if (IsEmpty(userName)) {
			return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.DB_OPERATION_PARAM_MISSING));
	}

	let params = {
			TableName: tableName,
			user_name: userName
	};

	return table.delete(params).promise();
};

exports.getUserList = function (queryParams) {

	let params = {
			TableName: tableName,
	};

	params.Limit = parseInt(queryParams.limit) || config.DefaultDBQueryLimit;

	if (!IsEmpty(queryParams.offset)) {
			params.ExclusiveStartKey = {
					[hashKey]: queryParams.user_name,
			};
	}
	else if (queryParams.ExclusiveStartKey) {
			params.ExclusiveStartKey = queryParams.ExclusiveStartKey;
	}

	return table.scan(params).promise();

};

