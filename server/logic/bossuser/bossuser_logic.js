/**
 * Created by Ruozi on 8/11/17.
 */

'use strict';

let Joi = require('joi');
let ResponseErrorSet = require('../../conf/response_error_set');
let BossUserDB = require('../../models/bossuser/bossuser_db');
let IsEmpty = require('is-empty');
let debug = require('debug')('BOSS_USER');
let RecordLogic = require('../record_logic');
let RecordLogger = require('winston').loggers.get('RecordLogger');
let RecordSet = require('../../conf/record_set');

exports.login = function (params) {
    return new Promise((resolve, reject) => {
        _validateLoginParams(params)
            .then(_getUser)
            .then(user => {

                RecordLogic.recordOperation({
                    user_name: params.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.LOGIN
                })
                    .catch(err => {
                        RecordLogger.error(`[${RecordSet.LOGIN}] Record error => ${err.stack}`);
                    });

                resolve(user);
            })
            .catch(err => {
                reject(err);
            })
    });
};

exports.logout = function (params) {
    return new Promise((resolve, reject) => {
        if (!IsEmpty(params.session) && !IsEmpty(params.session.user)) {
            let userName=params.session.user.user_name;
            params.session.user = null;

            RecordLogic.recordOperation({
                user_name: userName,
                timestamp: Date.now(),
                boss_record: RecordSet.LOGOUT
            })
                .catch(err => {
                    RecordLogger.error(`[${RecordSet.LOGOUT}] Record error => ${err.stack}`);
                });

            resolve({});
        } else {
            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.USER_ALREADY_LOGOUT));
        }
    });
};

exports.getUser = function (params) {
    return new Promise((resolve, reject) => {
        if (IsEmpty(params.user_name)) {
            debug(`no params in url, please try again`);
            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.USER_PARAMS_ERROR));
        }
        BossUserDB.getUserByName(params.user_name)
        .then(result => {
            let user = result.Item;
            if (IsEmpty(user)) {
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.USER_NAME_NOT_EXIST));
            } else {
                delete user.password;
                delete user.update_timestamp;
                delete user.update_date_time;
                // user.auth = JSON.parse(user.auth);
                resolve(user);
            }
        })
        .catch(err => {
            reject(err);
        });

    });
}

exports.getUserList = function (params) {
    return new Promise((resolve, reject) => {
    
        BossUserDB.getUserList({
            Limit: params.limit,
            ExclusiveStartKey: params.startKey,
        })
        .then(BossUserDBQueryData => {

            let userItems = BossUserDBQueryData.Items;

            debug(`query users => ${JSON.stringify(userItems, null, 2)}`);

            let formatteduserItems = userItems.map(item => {
                delete item.password;
                delete item.update_timestamp;
                // delete item.update_date_time;
                item.update_date_time = BossUserDBQueryData.LastEvaluatedKey
                return item;
            });
            resolve({
                users: formatteduserItems,
                nextKey: BossUserDBQueryData.LastEvaluatedKey
            });
        })
        .catch(err => {
            debug(`[Bossuser] get all => ${JSON.stringify(err, null, 2)}`);
            reject(err);
        })
    });
}

exports.newUser = function (params) {
    return new Promise((resolve, reject) => {
        _validateUserParams(params)
            .then(validateParams => {
               BossUserDB.getUserByName(validateParams.user_name)
                .then(result => {
                    if(!IsEmpty(result)){
                        debug(`[add] User already exists`);
                        reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.USER_ALREADY_EXIST));
                    } else {
                        return BossUserDB.addUser(validateParams);
                    }
                })
                .then(userItem => {
                    resolve({
                            user_name: userItem.user_name
                    });
                })
                .catch(err => {
                    reject(err);
                });
            })
            
    });
};

function _getUser(params) {
    return new Promise((resolve, reject) => {
        if (!IsEmpty(params.session.user)) {
            debug(`User session exists. session => ${JSON.stringify(params.session, null, 2)}`);
            resolve(params.session.user);
        } else if (IsEmpty(params.user_name) || IsEmpty(params.password)) {
            debug(`User session not exists. User should login again.`);
            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.USER_SESSION_MISSING));
        } else {
            debug(`User login. login info => ${JSON.stringify(params, null, 2)}`);
            BossUserDB.getUserByName(params.user_name)
                .then(result => {
                    let user = result.Item;

                    if (IsEmpty(user)) {
                        reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.LOGIN_USER_NAME_NOT_EXIST));
                    } else if (params.password !== user.password) {
                        reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.LOGIN_PASSWORD_INCORRECT));
                    } else {
                        delete user.password;
                        user.auth = JSON.parse(user.auth);
                        params.session.user = user;
                        resolve(user);
                    }
                })
                .catch(err => {
                    reject(err);
                });
        }
    });
};

function _updateUser (params) {
    
};
    
function _deleteUser (params) {

};

function _getAllUser (params) {
    
};
    
function _validateLoginParams(params) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_name: Joi.string(),
            password: Joi.string(),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(params, schema, options, (err, value) => {
            if (err) {
                logger.error(`Param error, Params => ${JSON.stringify(params)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.LOGIN_PARAMS_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateNameParams(params) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_name: Joi.string(),
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(params, schema, options, (err, value) => {
            if (err) {
                logger.error(`Param error, Params => ${JSON.stringify(params)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.LOGIN_PARAMS_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}
function _validateUserParams(params) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_name: Joi.string(),
            password: Joi.string(),
            auth: Joi.object(),
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(params, schema, options, (err, value) => {
            if (err) {
                logger.error(`Param error, Params => ${JSON.stringify(params)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.LOGIN_PARAMS_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}