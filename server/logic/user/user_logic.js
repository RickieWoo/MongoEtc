/**
 * Created by Ruozi on 9/8/17.
 */

let userDB = new (require('../../models/user/user_db'))();
let utils = require('../../utils/utils');
let IsEmpty = require('is-empty');
let logger = require('winston').loggers.get('UserLogger');
let ResponseErrorSet = require('../../conf/response_error_set');
let RecordLogic = require('../record_logic');
let RecordSet = require('../../conf/record_set');
let RecordLogger = require('winston').loggers.get('RecordLogger');
let Joi = require('joi');
let md5 = require('md5');
let debug = require('debug')('USER');

/**
 *
 * @param newVIPUserParams
 *
 * name: S
 * password: S
 * email: S
 * client_name: S
 * platform: S
 *
 */
exports.createNewVIPUser = function (newVIPUserParams) {

    debug(`start create new vip user, params => ${JSON.stringify(newVIPUserParams, null, 2)}`);

    return new Promise((resolve, reject) => {

        let userItem = {};

        _validateCreateVIPUserParams(newVIPUserParams)
            .then(value => {
                debug(`create new vip user params validated`);
                return Promise.all([_generateUserID(value.client_name), _generateInviteCode()])
            })
            .then(results => {

                let newUserID = results[0];
                let inviteCode = results[1];

                debug(`user_id & invite_code generated. user_id => ${newUserID} | invite_code =>${inviteCode}`);

                userItem = {
                    user_id: newUserID,
                    coins: 0,
                    name: newVIPUserParams.name,
                    platform: newVIPUserParams.platform,
                    register_time: Date.now(),
                    timezone: 0,
                    user_type: 'master',
                    invite_code: inviteCode,
                    email: newVIPUserParams.email,
                    password: md5(`${md5(newVIPUserParams.client_name)}${newVIPUserParams.password}`)
                };

                return userDB.putUser(userItem);
            })
            .then(result => {

                RecordLogic.recordOperation({
                    user_name: newVIPUserParams.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.VIP_USER_SIGNUP,
                    item: JSON.stringify(userItem)
                })
                    .catch(err => {
                        RecordLogger.error(`[${RecordSet.VIP_USER_SIGNUP}] Record error => ${err.stack}`);
                    });

                resolve(userItem);
            })
            .catch(err => {
                debug(`error`);
                reject(err);
            });
    });
};

async function _generateUserID(appName) {

    let retryCountLeft = 10;
    let userId = '';
    while (retryCountLeft > 0) {
        let newUserID = `${appName}_${utils.randomString(10)}`;
        let findUser = await userDB.getUserByUserId(newUserID);
        if (IsEmpty(findUser.Item)) {
            userId = newUserID;
            break;
        }
        retryCountLeft--;
    }

    if (IsEmpty(userId)) {
        return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.UserErrorSet.GENERATE_NEW_USER_ID_ERROR));
    } else {
        return userId;
    }
}

async function _generateInviteCode() {

    let retryCountLeft = 10;
    let inviteCode = '';
    while (retryCountLeft > 0) {
        let newInviteCode = utils.randomString(7, false);
        let userID = await userDB.getUserIDByInviteCode(newInviteCode);
        if (IsEmpty(userID)) {
            inviteCode = newInviteCode;
            break;
        }
        retryCountLeft--;
    }

    if (IsEmpty(inviteCode)) {
        return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.UserErrorSet.GENERATE_NEW_INVITE_CODE_ERROR));
    } else {
        return inviteCode;
    }
}

function _validateCreateVIPUserParams(params) {
    return new Promise((resolve, reject) => {

        let schema = {
            name: Joi.string().required(),
            password: Joi.string().required(),
            email: Joi.string().email().required(),
            client_name: Joi.string().required(),
            platform: Joi.string().required(),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(params, schema, options, (err, value) => {
            if (err) {
                logger.error(`Create VIP user params error, Params => ${JSON.stringify(params)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.UserErrorSet.CREATE_VIP_USER_PARAM_ERROR));
            } else {
                resolve(value);
            }
        })
    })
}
