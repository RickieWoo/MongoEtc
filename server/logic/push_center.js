'use strict';

let request = require('request');
let config = require('config');
let Joi = require('joi');
let UserDB = require('../models/user/user_db');
let userDB = new UserDB();
let InternalErrorSet = require('../conf/internal_error_set');
let ResponseErrorSet = require('../conf/response_error_set');
let PushTypes = require('../conf/push_types');
let logger = require('winston').loggers.get('PushLogger');
let utils = require('../utils/utils');
let debug = require('debug')('PUSH');

exports.pushForOfferWallCallBack = function (balanceItem) {
    let pushData = {
        user_id: balanceItem.user_id,
        aps: {
            type: PushTypes.OFFERWALL_CALLBACK_RECEIVED,
            balance: {
                change: balanceItem.change,
                reason: balanceItem.reason
            },
            alert: `♥Congratulations♥ You've got ${balanceItem.change} coins from task.`,
            sound: 'gain_coins.aiff',
            badge: 'Increment'
        },
        production_mode: true,
        description: `Offerwall callback received push for user: ${balanceItem.user_id}`
    };
    return _push(pushData);
};

exports.pushForOrderCompleted = function (orderItem) {

    let pushData = {
        user_id: orderItem.user_id,
        aps: {
            type: PushTypes.REDEEM_CARD_COMPLETE,
            order: {
                item: {
                    sku: JSON.parse(orderItem.item).sku,
                    name: JSON.parse(orderItem.item).name,
                    price: parseInt(JSON.parse(orderItem.item).price)
                },
                timestamp: orderItem.timestamp
            },
            alert: `Your ♥gift♥ has been delivered. Check your email now.`,
            sound: 'gain_coins.aiff',
            badge: 'Increment'
        },
        production_mode: true,
        description: `gift card sending push for user: ${orderItem.user_id}`
    };

    return _push(pushData);
};

exports.pushForOfferBonus = function (offerTripleKillBonusItem) {

    let pushData = {
        user_id: offerTripleKillBonusItem.user_id,
        aps: {
            type: PushTypes.OFFER_BONUS,
            bonus: {
                change: offerTripleKillBonusItem.change,
                reason: offerTripleKillBonusItem.reason
            },
            alert: `🏅Great🏅 You've ${offerTripleKillBonusItem.change} bonus coins. Complete more tasks to get your gift`,
            sound: 'gain_coins.aiff',
            badge: 'Increment'
        },
        production_mode: true,
        description: `Offerwall callback received push for user: ${offerTripleKillBonusItem.user_id}`
    };
    return _push(pushData);
};

/*
 * push for ios, pushData includes following properties:
 *
 * user_id : S
 * aps : S => message object
 * production_mode : B
 * description : S
 *
 */
function _push(pushData) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_id: Joi.string().required(),
            aps: Joi.object().keys({
                type: Joi.string().required().valid(Object.values(PushTypes)),
                balance: Joi.object().keys({
                    change: Joi.number().required(),
                    reason: Joi.string().required()
                }),
                order: Joi.object().keys({
                    item: Joi.object().keys({
                        sku: Joi.string().required(),
                        name: Joi.string().required(),
                        price: Joi.number().required()
                    }),
                    timestamp: Joi.number().required()
                }),
                bonus: Joi.object().keys({
                    change: Joi.number().required(),
                    reason: Joi.string().required()
                }),
                alert: Joi.string().required(),
                sound: Joi.string(),
                badge: Joi.string().valid('Increment')
            }),
            production_mode: Joi.boolean(),
            description: Joi.string()
        };

        let options = {convert: false};

        Joi.validate(pushData, schema, options, (err, value) => {
            if (err) {
                logger.error(`[push] push to user [${pushData.user_id}] failed, error => ${err.stack}`);
                reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.PUSH_IOS_PARAM_ERROR));
            } else {
                userDB.getUserByUserId(value.user_id)
                    .then(data => {
                        let user = data.Item;
                        if (utils.checkEmpty(user) || undefined === user.device_token || undefined === user.message_name) {
                            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.PushErrorSet.PUSH_IOS_USER_INFO_NOT_FOUND));
                        } else {

                            debug(`Push for user => ${JSON.stringify(user, null, 2)}`);

                            if (user.platform.toUpperCase() === 'IOS') {

                                let pushParams = {
                                    appname: user.message_name,
                                    device_tokens: user.device_token,
                                    aps: pushData.aps,
                                    production_mode: pushData.production_mode,
                                    description: pushData.description
                                };

                                let pushOptions = {
                                    method: 'post',
                                    body: pushParams,
                                    json: true,
                                    url: config.PushURL.iOS
                                };

                                request(pushOptions, (err, res, body) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(body);
                                    }
                                });

                            } else if (user.platform.toUpperCase() === 'ANDROID') {
                                let pushParams = {
                                    appname: user.message_name,
                                    device_tokens: user.device_token,
                                    body: {
                                        custom: pushData.aps
                                    },
                                    production_mode: pushData.production_mode,
                                    description: pushData.description,
                                    display_type: "message"
                                };

                                let pushOptions = {
                                    method: 'post',
                                    body: pushParams,
                                    json: true,
                                    url: config.PushURL.android
                                };
                                request(pushOptions, (err, res, body) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(body);
                                    }
                                });
                            }
                        }
                    })
                    .catch(err => {
                        logger.error(`[Push] Get user push info error => ${err.stack}`);
                        reject(err);
                    })
            }
        });
    });
}



