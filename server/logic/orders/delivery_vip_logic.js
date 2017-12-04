/**
 * Created by Ruozi on 8/18/17.
 */
'use strict';

let Joi = require('joi');
let config = require('config');
let deliveryLogger = require('winston').loggers.get('DeliveryLogger');
let agcodErrorLogger = require('winston').loggers.get('AGCODCriticalErrorLogger');
let ResponseErrorSet = require('../../conf/response_error_set');
let InternalErrorSet = require('../../conf/internal_error_set');
let OrderSet = require('../../conf/order_set');
let OrderDB = require('../../models/orders/order_record_db');
let BossUserDB = require('../../models/bossuser/bossuser_db');
let IsEmpty = require('is-empty');
let debug = require('debug')('ORDER');
let RecordLogic = require('../record_logic');
let MachineClassifyLogic = require('../orders/machine_classify_logic');
let RecordLogger = require('winston').loggers.get('RecordLogger');
let RecordSet = require('../../conf/record_set');
let AGCOD = require('./agcod_logic');
let Mail = require('../mail_logic');

exports.makeOrder = function (orderParams) {
    return new Promise((resolve, reject) => {

        _validateMakeOrderParams(orderParams)
            .then(value => {
                return _classifyOrders(value);
            })
            .then(orderItem => {
                return OrderDB.updateOrder(orderItem);
            })
            .then(orderDBItem => {

                let orderItem = orderDBItem.Attributes;

                resolve({
                    order: {
                        user_id: orderItem.user_id,
                        order_id: orderItem.timestamp,
                        status: orderItem.status,
                        result: orderItem.result,
                        reason: orderItem.reason
                    }
                });
            })
            .catch(err => {
                reject(err);
            });
    });
};

exports.queryManualOrders = function (queryParams) {
    return new Promise((resolve, reject) => {
        _validateQueryManualOrderParams(queryParams)
            .then(value => {
                return OrderDB.queryOrdersByTypeStatusFilter({
                    type_status_filter: `${OrderSet.OrderTypeSet.VIP}_${queryParams.status}`,
                    Limit: value.limit,
                    ExclusiveStartKey: value.startKey,
                });
            })
            .then(orderDBQueryData => {

                let orderItems = orderDBQueryData.Items;

                debug(`query orders => ${JSON.stringify(orderItems, null, 2)}`);

                let formattedOrderItems = orderItems.map(item => {
                    item.order_id = item.timestamp;
                    delete item.timestamp;
                    return item;
                });

                resolve({
                    orders: formattedOrderItems,
                    nextKey: orderDBQueryData.LastEvaluatedKey
                });
            })
            .catch(err => {
                reject(err);
            })
    });
};

exports.updateOrderStatus = function (updateParams) {
    return new Promise((resolve, reject) => {

        let orderBefore = {};

        _validateOrderStatusUpdatingParams(updateParams)
            .then(updateParams => {
                return _validateUserPermission(updateParams);
            })
            .then(value => {
                return OrderDB.getOrderRecord(value.user_id, value.order_id);
            })
            .then(order => {

                let orderItem = order.Item;

                if (IsEmpty(orderItem)) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.ORDER_NOT_EXISTS));
                }

                debug(`order to be updated exists. order => ${JSON.stringify(orderItem, null, 2)}`);

                Object.assign(orderBefore, orderItem);

                orderItem.extra_value = updateParams.extra_value;
                orderItem.result = updateParams.result;
                orderItem.reason = updateParams.reason;

                return OrderDB.updateOrder(orderItem);
            })
            .then(result => {

                let orderItem = result.Attributes;

                RecordLogic.recordOperation({
                    user_name: updateParams.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.VIP_UPDATE_RESULT,
                    order_before: orderBefore,
                    order_after: orderItem
                })
                    .catch(err => {
                        RecordLogger.error(`[${RecordSet.VIP_UPDATE_RESULT}] Record error => ${err.stack}`);
                    });

                orderItem.order_id = orderItem.timestamp;
                delete orderItem.timestamp;

                resolve({
                    order: orderItem
                })
            })
            .catch(err => {
                reject(err);
            })
    });
};

exports.deliverOrder = function(deliverParams) {
    return new Promise((resolve, reject) => {

        let processParams = {};
        _validateOrderDeliverOrRejectParams(deliverParams)
            .then(deliverParams => {
                debug(`[Deliver] validated deliver params`);
                return _validateUserPermission(deliverParams);
            })
            .then(value => {
                debug(`[Deliver] validated bossuser permission`);
                return OrderDB.getOrderRecord(value.user_id, value.order_id);
            })
            .then(order => {
                let orderItem = order.Item;
                debug(`[Deliver] get order => ${JSON.stringify(orderItem, null, 2)}`);

                if (IsEmpty(orderItem)) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.ORDER_NOT_EXISTS));
                }

                return _validateDeliverOrderStatus(orderItem);
            })
            .then(orderItem => {
                // Mark order status
                orderItem.status = OrderSet.StatusSet.DELIVERING;
                orderItem.type_status_filter = `${OrderSet.OrderTypeSet.VIP}_${OrderSet.StatusSet.DELIVERING}`;
                debug(`[Deliver] Ready to change state`);
                return OrderDB.updateOrder(orderItem);
            })
            .then(orderData => {
                let orderItem = orderData.Attributes;
                processParams.order = orderItem;
                debug(`[Deliver] Status changed to [Delivering]`);
                let value = orderItem.base_value;
                debug(`[Deliver] base value => ${value}`);
                value += orderItem.extra_value? orderItem.extra_value : 0;
                value = Math.round(value * 100) / 100;
                debug(`[Deliver] total value => ${value}`);
                return _createAgcodGiftCards('US', value, config.AGCOD_Sandbox);
            })
            .then(giftcardItems => {
                processParams.giftcard = giftcardItems;
                processParams.order.giftcard_items = giftcardItems;
                debug(`[Deliver] Giftcard purchased. info => ${JSON.stringify(giftcardItems, null, 2)}`);
                return OrderDB.updateOrder(processParams.order);
            })
            .then(orderData => {
                let orderItem = orderData.Attributes;
                debug(`[Deliver] order with giftcard info updated.`);
                let value = orderItem.base_value;
                value += orderItem.extra_value? orderItem.extra_value : 0;
                value = Math.round(value * 100) / 100;
                processParams.order = orderItem;
                return Mail.sendGiftCardEmail(orderItem.email, value, Array.apply(null, new Array(processParams.giftcard.length)).map(function(item, i) {
                    return processParams.giftcard[i].gcClaimCode;
                }))
            })
            .then(body => {
                debug(`[Deliver] Email has been sent successful.`);
                processParams.order.mail_id = body['id'];
                return OrderDB.updateOrder(processParams.order);
            })
            .then(orderData => {
                // Waiting for mail callback
                debug(`[Deliver] Mail ID has been saved into order.`);
                processParams.order = orderData.Attributes;
                let orderItem = processParams.order;
                orderItem.order_id = orderItem.timestamp;
                delete orderItem.timestamp;

                RecordLogic.recordOperation({
                    user_name: deliverParams.session.user.user_name,
                    timestamp: orderItem.order_id,
                    boss_record: RecordSet.VIP_DELIVER,
                    delivery: orderItem
                })
                .catch(err => {
                    RecordLogger.error(`[${RecordSet.VIP_DELIVER}] Record error => ${err.stack}`);
                });

                resolve({order: orderItem});
            })
            .catch(err => {

                let giftcardItem = processParams.giftcard;
                if (!IsEmpty(giftcardItem)) {
                    _cancelAgcodGiftCards(giftcardItem, 'US', config.AGCOD_Sandbox);
                }

                let orderItem = processParams.order;
                if (!IsEmpty(orderItem)) {
                    orderItem.status = OrderSet.StatusSet.ERROR;
                    OrderDB.updateOrder(orderItem)
                        .then(orderData => {
                            deliveryLogger.info(`[vip] Mark order status error success => ${JSON.stringify(orderData.Attributes, null, 2)}`);
                        })
                        .catch(err => {
                            deliveryLogger.error(`[vip] Mark order status error error => ${err.stack}`);
                        });
                }

                reject(err);
            });
    });
};

exports.rejectOrder = function (rejectParams) {
    return new Promise((resolve, reject) => {

       _validateOrderDeliverOrRejectParams(rejectParams)
           .then(rejectParams => {
               return _validateUserPermission(rejectParams);
           })
           .then(value => {
               debug(`[Reject] validated deliver params`);
               return OrderDB.getOrderRecord(value.user_id, value.order_id);
           })
           .then(order => {
               let orderItem = order.Item;
               debug(`[Reject] get order => ${JSON.stringify(orderItem, null, 2)}`);

               if (IsEmpty(orderItem)) {
                   return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.ORDER_NOT_EXISTS));
               }

               return _validateRejectOrderStatus(orderItem);
           })
           .then(orderItem => {
               orderItem.status = OrderSet.StatusSet.CANCELED;
               orderItem.type_status_filter = `${OrderSet.OrderTypeSet.REDEEM}_${OrderSet.StatusSet.CANCELED}`;
               debug(`[Reject] Ready to change state`);
               return OrderDB.updateOrder(orderItem);
           })
           .then(orderData => {
               let orderItem = orderData.Attributes;
               orderItem.order_id = orderItem.timestamp;
               delete orderItem.timestamp;

               resolve({order: orderItem});
           })
           .catch(err => {
               reject(err);
           })
    });
};



function _classifyOrders(orderParams) {
    return new Promise((resolve, reject) => {

        let orderItem = {};

        if (orderParams) {
            let now = Date.now();
            let classifyParams = {
                user_id: orderParams.user_id,
                timestamp: now,
                email: orderParams.email
            };

            let baseValue = Math.round(orderParams.price / orderParams.exchange_rate * 600 / 550 * 100) / 100;

            if (baseValue < 100) {
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.VIP_ORDER_TOO_SMALL));
            } else {
                let classifyStart = Date.now();
                MachineClassifyLogic.getVIPOrderResult(classifyParams)
                    .then(data => {
                        let classifyEnd = Date.now();
                        deliveryLogger.info(`[VIP][Classify] time cost => ${(classifyEnd - classifyStart) / 1000} seconds`);
                        orderItem = {
                            order_type: OrderSet.OrderTypeSet.VIP,
                            user_id: orderParams.user_id,
                            timestamp: now,
                            client_name: orderParams.client_name,
                            client_version: orderParams.client_version,
                            price: orderParams.price,
                            exchange_rate: Math.round(orderParams.exchange_rate * 550 / 600),
                            base_value: baseValue,
                            email: orderParams.email,
                            status: OrderSet.StatusSet.ONGOING,
                            type_status_filter: `${OrderSet.OrderTypeSet.VIP}_${OrderSet.StatusSet.ONGOING}`,
                            result: data.result,
                            reason: data.reason
                        };

                        resolve(orderItem);
                    })
                    .catch(err => {
                        deliveryLogger.error(`[VIP][Classify] err => ${err.stack}`);
                        reject(err);
                    });
            }
        } else {
            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.ORDER_CLASSIFY_PARAM_ERROR));
        }
    });
}

function _validateDeliverOrderStatus(orderItem) {
    return new Promise((resolve, reject) => {

        let schema = {
            order_type: Joi.string().valid(OrderSet.OrderTypeSet.VIP),
            user_id: Joi.string().required(),
            timestamp: Joi.number().required(),
            price: Joi.number().positive().required(),
            exchange_rate: Joi.number().positive().required(),
            base_value: Joi.number().positive().required(),
            extra_value: Joi.number(),
            email: Joi.string().email(),
            status: Joi.string().valid(OrderSet.StatusSet.ONGOING, OrderSet.StatusSet.ERROR),
            result: Joi.string().valid(OrderSet.ResultSet.OK)
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(orderItem, schema, options, (err, value) => {
            if (err) {
                deliveryLogger.error(`[VIP][Deliver check] Param error, Params => ${JSON.stringify(orderItem, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.DELIVER_ORDER_STATUS_INVALID));
            } else {
                resolve(value);
            }
        });
    })
}

function _validateRejectOrderStatus(orderItem) {
    return new Promise((resolve, reject) => {

        let schema = {
            order_type: Joi.string().valid(OrderSet.OrderTypeSet.VIP),
            user_id: Joi.string().required(),
            timestamp: Joi.number().required(),
            price: Joi.number().positive().required(),
            exchange_rate: Joi.number().positive().required(),
            base_value: Joi.number().positive().required(),
            extra_value: Joi.number(),
            email: Joi.string().email(),
            status: Joi.string().valid(OrderSet.StatusSet.ONGOING, OrderSet.StatusSet.ERROR),
            result: Joi.string().valid(OrderSet.ResultSet.CHEATED)
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(orderItem, schema, options, (err, value) => {
            if (err) {
                deliveryLogger.error(`[VIP][Reject] Param error, Params => ${JSON.stringify(orderItem, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.DELIVER_ORDER_STATUS_INVALID));
            } else {
                resolve(value);
            }
        });
    })
}

function _validateOrderDeliverOrRejectParams(deliverParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_id: Joi.string().required(),
            order_id: Joi.number().required(),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(deliverParams, schema, options, (err, value) => {
            if (err) {
                deliveryLogger.error(`[Deliver/Reject] Param error, Params => ${JSON.stringify(deliverParams, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    })
}

function _validateUserPermission(params) {
    return new Promise((resolve, reject) => {
        BossUserDB.getUserByName(params.session.user.user_name)
            .then(data => {
                if (IsEmpty(data.Item)) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
                }
                let auth = JSON.parse(data.Item.auth);
                if (auth.Action.includes('*') || auth.Action.includes('/delivery/*') || auth.Action.includes('/delivery/vip')) {
                    resolve(params);
                } else {
                    deliveryLogger.error(`[VIP][Deliver] bossuser permission error => ${JSON.stringify(data.Item, null, 2)}, params => ${JSON.stringify(params, null, 2)}`);
                    reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
                }
            })
            .catch(err => {
                reject(err);
            })
    });
}

function _validateOrderStatusUpdatingParams(updateParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_id: Joi.string().required(),
            order_id: Joi.number().required(),
            extra_value: Joi.number(),
            reason: Joi.when('result', {is: OrderSet.ResultSet.CHEATED, then: Joi.string().required()}),
            result: Joi.string().valid(Object.values(OrderSet.ResultSet)),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(updateParams, schema, options, (err, value) => {
            if (err) {
                deliveryLogger.error(`[Update Status] Param error, Params => ${JSON.stringify(updateParams, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    })
}

function _validateQueryManualOrderParams(queryParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            status: Joi.string().valid(Object.values(OrderSet.StatusSet)).required(),
            Limit: Joi.number(),
            startKey: Joi.object()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(queryParams, schema, options, (err, value) => {
            if (err) {
                deliveryLogger.error(`[redeem] Param error, Params => ${JSON.stringify(queryParams, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    })
}

function _validateMakeOrderParams(orderParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_id: Joi.string().required(),
            client_name: Joi.string().required(),
            client_version: Joi.string().required(),
            price: Joi.number().required(),
            exchange_rate: Joi.number().required(),
            email: Joi.string().email()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(orderParams, schema, options, (err, value) => {
            if (err) {
                deliveryLogger.error(`[Make Order][VIP] Params error, Params => ${JSON.stringify(orderParams, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    })
}

async function _createAgcodGiftCards(countryCode, amount, isSandbox) {
    let cards = [];
    let price10Num = parseInt(amount / 10);
    let restPrice = Math.round(amount % 10 * 100) / 100;

    try {
        for (let i = 0; i < price10Num; i++) {
            let giftcard = await AGCOD.createGiftCard(countryCode, 10, isSandbox);
            debug(`[AGCOD giftcard] created card => ${JSON.stringify(giftcard, null, 2)}`);
            cards.push(giftcard);
        }
        let giftcard = await AGCOD.createGiftCard(countryCode, restPrice, isSandbox);
        debug(`[AGCOD giftcard] created card => ${JSON.stringify(giftcard, null, 2)}`);
        cards.push(giftcard);
    } catch (err) {
        deliveryLogger.error(`[AGCOD giftcard] create card error => ${err.stack}`);
        await _cancelAgcodGiftCards(cards, 'US', config.AGCOD_Sandbox);
        deliveryLogger.error(`[AGCOD giftcard] created cards have been cancelled. cards => ${JSON.stringify(cards, null, 2)}`);
        throw InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.LOGIC_LAYER_ERROR);
    }

    return cards;
}

async function _cancelAgcodGiftCards(giftCardItems, countryCode, isSandbox) {
    // assume that all cancel actions will be successful, and check agcodErrorLogger's output to cancel cards manually.
    let unhandledCards = giftCardItems.slice();
    try {
        for (let [index, item] of giftCardItems.entries()) {
            if (!IsEmpty(item)) {
                let giftcard = await AGCOD.cancelGiftCard(item.creationRequestId, countryCode, isSandbox, item.gcId);
                debug(`[AGCOD giftcard] cancelled card => ${JSON.stringify(giftcard, null, 2)}`);
                delete unhandledCards[index];
            }
        }
    } catch (err) {
        agcodErrorLogger.error(`[AGCOD giftcard] cancel card error => ${err.stack}. uncancelled cards => ${JSON.stringify(unhandledCards, null, 2)}`);
    }
}