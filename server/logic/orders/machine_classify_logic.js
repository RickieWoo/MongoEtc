/**
 * Created by yshan on 12/10/2017.
 */

'use strict';

let Joi = require('joi');
let logger = require('winston').loggers.get('DeliveryLogger');
let OrderSet = require('../../conf/order_set');
let InternalErrorSet = require('../../conf/internal_error_set');
let userDB = new (require('../../models/user/user_db'))();
let balanceDB = new (require('../../models/transaction/balance_db'))();
let userFriendDB = new (require('../../models/user/user_friend_db'))();
let offerHistoryDB = new (require('../../models/offer/offer_history_db'))();
let SkuDB = require('../../models/orders/sku_property_db');
let OrderDB = require('../../models/orders/order_record_db');
let IsEmpty = require('is-empty');
let debug = require('debug')('ORDER');

exports.getVIPOrderResult = function(params) {
    return _validateClassifyParams(params)
        .then(async params => {
            debug(`[Classify] vip order. params => ${JSON.stringify(params, null, 2)}`);

            params.user = await userDB.getUserByUserId(params.user_id);
            params.balances = await _queryAllBalancesByUserId(params.user_id);
            params.userFriends = await _queryUserAllFriends(params.user_id);

            let cheatedRules = [
                [_checkIOSJailbreak, OrderSet.ReasonSet.IOS_JAILBREAK],
                [_isCountryCodeVN, OrderSet.ReasonSet.INVALID_COUNTRY_CODE]
            ];
            let cheatedFlags = await Promise.all(cheatedRules.map(x => x[0](params)));
            for (let [index, flag] of cheatedFlags.entries()) {
                if (flag) {
                    return {
                        result: OrderSet.ResultSet.CHEATED,
                        reason: cheatedRules[index][1]
                    };
                }
            }

            let reasonList = [];
            let doubtfulRules = [
                [_hasNonAmericanIPFriend, OrderSet.ReasonSet.HAS_NON_US_IP_FRIENDS],
                [_checkSingleOfferIncomeOverLimit, OrderSet.ReasonSet.HAS_SINGLE_OFFER_INCOME_OVER_LIMIT],
                [_hasFriendWithSimilarDevice, OrderSet.ReasonSet.HAS_SIMILAR_DEVICE_FRIENDS],
                [_hasFriendWhoseOffersOverLimit, OrderSet.ReasonSet.HAS_FRIEND_WHOSE_COMPLETED_OFFERS_OVER_LIMIT]
            ];
            let doubtfulFlags = await Promise.all(doubtfulRules.map(x => x[0](params)));
            for (let [index, flag] of doubtfulFlags.entries()) {
                if (flag) {
                    reasonList.push(doubtfulRules[index][1]);
                }
            }
            if (reasonList.length) {
                return {
                    result: OrderSet.ResultSet.DOUBTFUL,
                    reason: reasonList.join(';')
                };
            }

            return {
                result: OrderSet.ResultSet.OK,
                reason: OrderSet.ReasonSet.MACHINE_CHECKED_OK
            };
        });
};

exports.getRedeemOrderResult = function(params) {
    return _validateClassifyParams(params)
        .then(async params => {
            debug(`[Classify] redeem order. params => ${JSON.stringify(params, null, 2)}`);

            params.user = await userDB.getUserByUserId(params.user_id);
            params.balances = await _queryAllBalancesByUserId(params.user_id);
            params.userFriends = await _queryUserAllFriends(params.user_id);

            let cheatedRules = [
                [_checkSamePlatformOffersOverLimit, OrderSet.ReasonSet.SAME_PLATFORM_PER_MINUTE_OFFERS_OVER_LIMIT],
                [_checkSamePlatformSameCoinsOffersOverLimit, OrderSet.ReasonSet.SAME_PLATFORM_SAME_COINS_OVER_LIMIT],
                [_checkIOSJailbreak, OrderSet.ReasonSet.IOS_JAILBREAK],
                [_isCountryCodeVN, OrderSet.ReasonSet.INVALID_COUNTRY_CODE]
            ];
            let cheatedFlags = await Promise.all(cheatedRules.map(x => x[0](params)));
            for (let [index, flag] of cheatedFlags.entries()) {
                if (flag) {
                    return {
                        result: OrderSet.ResultSet.CHEATED,
                        reason: cheatedRules[index][1]
                    };
                }
            }

            let reasonList = [];
            let doubtfulRules = [
                [_hasSensetiveWordsInEmailAddr, OrderSet.ReasonSet.INVALID_EMAIL_ADDRESS],
                [_hasOfferHistory, OrderSet.ReasonSet.HAS_OFFER_HISTORY],
                [_checkSingleIncomeOverLimit, OrderSet.ReasonSet.HAS_SINGLE_INCOME_OVER_LIMIT],
                [_checkFriendsCountOverLimit, OrderSet.ReasonSet.FRIENDS_COUNT_OVER_LIMIT],
                [_checkVpnOrJailbreakOrRoot, OrderSet.ReasonSet.VPN_OR_JAILBREAK_OR_ROOT],
                [_hasRedeemHistoryWithSameEmail, OrderSet.ReasonSet.HAS_REDEEM_HISTORY_WITH_SAME_EMAIL],
                [_hasAnotherAccountInSameAppWithSameEmail, OrderSet.ReasonSet.HAS_ANOTHER_ID_IN_SAME_APP_WITH_SAME_EMAIL]
            ];
            let doubtfulFlags = await Promise.all(doubtfulRules.map(x => x[0](params)));
            for (let [index, flag] of doubtfulFlags.entries()) {
                if (flag) {
                    reasonList.push(doubtfulRules[index][1]);
                }
            }
            if (reasonList.length) {
                return {
                    result: OrderSet.ResultSet.DOUBTFUL,
                    reason: reasonList.join(';')
                };
            }

            return {
                result: OrderSet.ResultSet.OK,
                reason: OrderSet.ReasonSet.MACHINE_CHECKED_OK
            };
        })
};

exports.getCranemachineOrderResult = function (params) {
    return _validateClassifyParams(params)
        .then(async params => {
            debug(`[Classify] cranemachine order. params => ${JSON.stringify(params, null, 2)}`);

            params.user = await userDB.getUserByUserId(params.user_id);
            params.balances = await _queryAllBalancesByUserId(params.user_id);
            params.userFriends = await _queryUserAllFriends(params.user_id);

            let cheatedRules = [
                [_checkSamePlatformOffersOverLimit, OrderSet.ReasonSet.SAME_PLATFORM_PER_MINUTE_OFFERS_OVER_LIMIT],
                [_checkSamePlatformSameCoinsOffersOverLimit, OrderSet.ReasonSet.SAME_PLATFORM_SAME_COINS_OVER_LIMIT],
                [_checkIOSJailbreak, OrderSet.ReasonSet.IOS_JAILBREAK],
                [_isCountryCodeVN, OrderSet.ReasonSet.INVALID_COUNTRY_CODE]
            ];
            let cheatedFlags = await Promise.all(cheatedRules.map(x => x[0](params)));
            for (let [index, flag] of cheatedFlags.entries()) {
                if (flag) {
                    return {
                        result: OrderSet.ResultSet.CHEATED,
                        reason: cheatedRules[index][1]
                    };
                }
            }

            let reasonList = [];
            let doubtfulRules = [
                [_hasSensetiveWordsInEmailAddr, OrderSet.ReasonSet.INVALID_EMAIL_ADDRESS],
                [_hasOfferHistory, OrderSet.ReasonSet.HAS_OFFER_HISTORY],
                [_checkSingleIncomeOverLimit, OrderSet.ReasonSet.HAS_SINGLE_INCOME_OVER_LIMIT],
                [_cardAmountOverLimit, OrderSet.ReasonSet.CARD_AMOUNT_OVER_LIMIT],
                [_cranemachinePerDayOrdersOverTime, OrderSet.ReasonSet.CRANEMACHINE_PER_DAY_ORDERS_OVER_LIMIT],
                [_checkFriendsCountOverLimit, OrderSet.ReasonSet.FRIENDS_COUNT_OVER_LIMIT],
                [_checkVpnOrJailbreakOrRoot, OrderSet.ReasonSet.VPN_OR_JAILBREAK_OR_ROOT],
                [_hasAnotherAccountInSameAppWithSameEmail, OrderSet.ReasonSet.HAS_ANOTHER_ID_IN_SAME_APP_WITH_SAME_EMAIL],
                [_hasRedeemHistoryWithSameEmail, OrderSet.ReasonSet.HAS_REDEEM_HISTORY_WITH_SAME_EMAIL]
            ];
            let doubtfulFlags = await Promise.all(doubtfulRules.map(x => x[0](params)));
            for (let [index, flag] of doubtfulFlags.entries()) {
                if (flag) {
                    reasonList.push(doubtfulRules[index][1]);
                }
            }
            if (reasonList.length) {
                return {
                    result: OrderSet.ResultSet.DOUBTFUL,
                    reason: reasonList.join(';')
                };
            }

            return {
                result: OrderSet.ResultSet.OK,
                reason: OrderSet.ReasonSet.MACHINE_CHECKED_OK
            };
        })
};

function _validateClassifyParams(classifyParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_id: Joi.string().required(),
            timestamp: Joi.number().min(0).required(),
            sku: Joi.string(),
            email: Joi.string().email().required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(classifyParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`[Classify] Params error, Params => ${JSON.stringify(classifyParams, null, 2)}, err => ${err.stack}`);
                reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.INTERMEDIATE_PARAMETER_INVALID));
            } else {
                resolve(value);
            }
        });
    })
}

async function _checkIOSJailbreak(params) {
    let data = params.user;

    if (IsEmpty(data) || IsEmpty(data.Item) || IsEmpty(data.Item.platform)) {
        return false;
    } else {
        return data.Item.platform.toUpperCase() === 'IOS' && data.Item.jail_broken;
    }
}

async function _isCountryCodeVN(params) {
    let data = params.user;
    if (IsEmpty(params) || IsEmpty(data) || IsEmpty(data.Item.country_code)) {
        return false;
    } else {
        return OrderSet.ClassifyConfigSet.INVALID_COUNTRY_CODE.includes(data.Item.country_code.toUpperCase());
    }
}

async function _checkSamePlatformOffersOverLimit(params) {
    let oneMinuteAgoTimestamp = params.timestamp - 60000; // 1000 ms * 60 = 1 minute
    let data = await balanceDB.queryRecentBalance({
        user_id: params.user_id,
        timestamp: oneMinuteAgoTimestamp,
        limit: 1000
    });
    let balances = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await balanceDB.queryRecentBalance({
            user_id: params.user_id,
            timestamp: oneMinuteAgoTimestamp,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        balances = balances.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    let result = balances.filter(element => element.reason.endsWith('_offer_complete'));
    let counts = {};
    result.forEach(x => counts[x.reason] = (counts[x.reason] || 0) + 1);
    let flag = Math.max(...Object.values(counts)) > OrderSet.ClassifyConfigSet.SAME_PLATFORM_PER_MINUTE_OFFERS_MAX_LIMIT;
    debug(`[Classify] _checkSamePlatformOffersOverLimit return => ${flag}`);
    return flag;
}

async function _checkSamePlatformSameCoinsOffersOverLimit(params) {
    let balances = params.balances;
    let result = balances.map((element, index, balances) => [element, (index + 1 < balances.length) ? balances[index + 1] : null])
            .filter((element, i) => {
                return i + 1 < balances.length
                    && element[0].reason.endsWith('_offer_complete')
                    && element[0].reason === element[1].reason
                    && element[0].change === element[1].change;
            });
    let flag = result.length > 0;
    debug(`[Classify] _checkSamePlatformSameCoinsOffersOverLimit return => ${flag}`);
    return flag;
}

async function _hasSensetiveWordsInEmailAddr(params) {

    if (IsEmpty(params.email)) {
        return false;
    } else {
        return OrderSet.ClassifyConfigSet.EMAIL_ADDR_SENSITIVE_WORDS.filter(x => params.email.includes(x)).length > 0;
    }
}

async function _hasOfferHistory(params) {
    let data = await offerHistoryDB.queryUserOfferHistory({
        user_id: params.user_id,
        limit: 1000
    });
    let history = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await offerHistoryDB.queryUserOfferHistory({
            user_id: params.user_id,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        history = history.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    return history.length > 0;
}

async function _checkSingleIncomeOverLimit(params) {
    let balances = params.balances;
    let result = balances.filter(element => element.change >= OrderSet.ClassifyConfigSet.SINGLE_INCOME_MAX_LIMIT && element.reason.indexOf('signup') < 0);
    return result.length > 0;
}

async function _checkFriendsCountOverLimit(params) {
    let friends = params.userFriends;
    return friends.length > OrderSet.ClassifyConfigSet.FRIENDS_COUNT_MAX_LIMIT;
}

async function _checkVpnOrJailbreakOrRoot(params) {
    let data = params.user;
    if (IsEmpty(data) || IsEmpty(data.Item)) {
        return false;
    } else {
        return data.Item.use_vpn_or_proxy || data.Item.jail_broken;
    }
}

async function _hasRedeemHistoryWithSameEmail(params) {
    return false;
}

async function _hasAnotherAccountInSameAppWithSameEmail(params) {
    return false;
}

async function _cardAmountOverLimit(params) {
    let data = await SkuDB.getPropertyBySku(params.sku);
    let skuProperties = data.Item;

    if (IsEmpty(skuProperties) || IsEmpty(skuProperties.price)) {
        return false;
    } else {
        return skuProperties.price > OrderSet.ClassifyConfigSet.CARD_AMOUNT_MAX_LIMIT && skuProperties.currency_code.toUpperCase() === 'USD';
    }
}

async function _cranemachinePerDayOrdersOverTime(params) {

    return false;
    // let yesterday = params.timestamp - 86400000; // 24 * 60 * 60 * 1000 = 86400000(one day's ms counts)
    // let data = await OrderDB.queryOrdersByUserId({
    //     user_id: params.user_id,
    //     limit: 200
    // });
    // let orders = data.Items;
    //
    // let startKey = data.LastEvaluatedKey;
    //
    // while (!IsEmpty(startKey)) {
    //     let data = await OrderDB.queryOrders({
    //         user_id: params.user_id,
    //         order_type: OrderSet.OrderTypeSet.CRANEMACHINE,
    //         timestamp: yesterday,
    //         limit: 1000,
    //         ExclusiveStartKey: startKey
    //     });
    //
    //     orders = orders.concat(data.Items);
    //     startKey = data.LastEvaluatedKey;
    // }
    //
    // return orders.length > OrderSet.ClassifyConfigSet.CRANEMACHINE_PER_DAY_ORDERS_MAX_LIMIT;
}

async function _hasNonAmericanIPFriend(params) {
    let userFriends = params.userFriends;
    for (let userFriend of userFriends) {
        let friendData = await userDB.getUserByUserId(userFriend.friend_user_id);
        let friend = friendData.Item;
        if (friend.country_code.toUpperCase() !== 'US') {
            debug(`[Classify] _hasNonAmericanIPFriend return => true`);
            return true;
        }
    }
    debug(`[Classify] _hasNonAmericanIPFriend return => false`);
    return false;
}

async function _checkSingleOfferIncomeOverLimit(params) {
    let balances = params.balances;
    let result = balances.filter(element =>
        element.change > OrderSet.ClassifyConfigSet.SINGLE_OFFER_INCOME_MAX_LIMIT && element.reason.endsWith('_offer_complete'));
    let flag = result.length > 0;
    debug(`[Classify] _checkSingleOfferIncomeOverLimit => ${flag}`);
    return flag;
}

async function _hasFriendWithSimilarDevice(params) {
    return false;
}

async function _hasFriendWhoseOffersOverLimit(params) {
    let userFriends = params.userFriends;
    for (let userFriend of userFriends) {
        let offers = await _queryAllBalancesByUserId(userFriend.friend_user_id);
        let completedOffers = offers.filter(x => x.reason.endsWith('_offer_complete'));
        if (completedOffers.length > OrderSet.ClassifyConfigSet.FRIENDS_COMPLETED_ORDERS_MAX_LIMIT) {
            debug(`[Classify] _hasFriendWhoseOffersOverLimit return => true`);
            return true;
        }
    }
    debug(`[Classify] _hasFriendWhoseOffersOverLimit return => false`);
    return false;
}

async function _queryAllBalancesByUserId(user_id) {
    let data = await balanceDB.queryBalance({
        user_id: user_id,
        limit: 1000
    });
    let balances = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await balanceDB.queryBalance({
            user_id: user_id,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        balances = balances.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    return balances;
}

async function _queryUserAllFriends(user_id) {
    let data = await userFriendDB.queryUserFriends({
        user_id: user_id,
        limit: 1000
    });
    let friends = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await userFriendDB.queryUserFriends({
            user_id: user_id,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        friends = friends.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    return friends;
}