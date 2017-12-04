/**
 * Created by yshan on 06/09/2017.
 */
'use strict';

let Joi = require('joi');
let config = require('config');
let logger = require('winston').loggers.get('DeliveryLogger');
let ResponseErrorSet = require('../../conf/response_error_set');
let InternalErrorSet = require('../../conf/internal_error_set');
let OrderSet = require('../../conf/order_set');
let OrderDB = require('../../models/orders/order_record_db');
let BossUserDB = require('../../models/bossuser/bossuser_db');
let SkuDB = require('../../models/orders/sku_property_db');
let IsEmpty = require('is-empty');
let debug = require('debug')('ORDER');
let RecordLogic = require('../record_logic');
let MachineClassifyLogic = require('../orders/machine_classify_logic');
let RecordLogger = require('winston').loggers.get('RecordLogger');
let RecordSet = require('../../conf/record_set');
let AGCOD = require('./agcod_logic');
let InventoryLogic = require('../../logic/orders/inventory_logic');
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
                return _autoDeliver(orderItem);
            })
            .then(orderItem => {
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

/***
 *
 * @param queryParams
 *
 * status: S
 * limit: N (optional, default 50)
 * startKey: O (optional)
 *
 * @returns {Promise}
 */
exports.queryManualOrders = function (queryParams) {
    return new Promise((resolve, reject) => {
        _validateQueryManualOrderParams(queryParams)
            .then(value => {
                return OrderDB.queryOrdersByTypeStatusFilter({
                    type_status_filter: `${value.order_type}_${queryParams.status}`,
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

                orderItem.result = updateParams.result;
                orderItem.reason = updateParams.reason;

                return OrderDB.updateOrder(orderItem);
            })
            .then(result => {

                let orderItem = result.Attributes;

                RecordLogic.recordOperation({
                    user_name: updateParams.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.IN_APP_UPDATE_RESULT,
                    order_before: orderBefore,
                    order_after: orderItem
                })
                .catch(err => {
                    RecordLogger.error(`[${RecordSet.IN_APP_UPDATE_RESULT}] Record error => ${err.stack}`);
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
                processParams.order = orderItem;
                return SkuDB.getPropertyBySku(orderItem.sku);
            })
            .then(sku => {
                let skuProperties = sku.Item;

                if (IsEmpty(skuProperties)) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.SKU_PROPERTY_NOT_EXIST));
                } else {
                    debug(`[Deliver] Has got sku properties => ${JSON.stringify(sku, null, 2)}`);
                    switch (skuProperties.category) {
                        case 'amazon_us':
                            return _deliverAmazonUSOrder(skuProperties, processParams.order);
                            break;
                        case 'paypal':
                            return _deliverPaypalOrder(skuProperties, processParams.order);
                            break;
                        default:
                            return _deliverInventoryOrder(skuProperties, processParams.order);
                            break;
                    }
                }
            })
            .then(orderItem => {
                RecordLogic.recordOperation({
                    user_name: deliverParams.session.user.user_name,
                    timestamp: Date.now(),
                    boss_record: RecordSet.IN_APP_DELIVER,
                    delivery: orderItem
                })
                .catch(err => {
                    RecordLogger.error(`[${RecordSet.IN_APP_DELIVER}] Record error => ${err.stack}`);
                });

                orderItem.order_id = orderItem.timestamp;
                delete orderItem.timestamp;

                resolve({
                    order: orderItem
                });
            })
            .catch(err => {
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
                orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.CANCELED}`;
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

function _autoDeliver(orderItem) {
    return new Promise((resolve, reject) => {

        if (orderItem.result === OrderSet.ResultSet.OK){

            SkuDB.getPropertyBySku(orderItem.sku)
                .then(sku => {
                    let skuProperties = sku.Item;
                    debug(`[AutoDeliver] has got sku properties => ${JSON.stringify(sku, null, 2)}`);
                    switch (skuProperties.category) {
                        case 'amazon_us':
                            return _deliverAmazonUSOrder(skuProperties, orderItem);
                            break;
                        case 'paypal':
                            return Promise.resolve(orderItem);
                            break;
                        default:
                            return _deliverInventoryOrder(skuProperties, orderItem);
                            break;
                    }
                })
                .then(orderItem => {
                    resolve(orderItem);
                })
                .catch(err => {
                    reject(err);
                });
        } else {
            resolve(orderItem);
        }
    });
}

function _classifyOrders(orderParams) {
    return new Promise((resolve, reject) => {

        let timestampNow = Date.now();
        let classifyParams = {
            user_id: orderParams.user_id,
            timestamp: timestampNow,
            email: orderParams.email
        };
        let classifyStart = Date.now();

        function _getClassifyResult() {
            switch (orderParams.order_type) {
                case OrderSet.OrderTypeSet.REDEEM:
                    return MachineClassifyLogic.getRedeemOrderResult(classifyParams);
                    break;
                case OrderSet.OrderTypeSet.CRANEMACHINE:
                    return MachineClassifyLogic.getCranemachineOrderResult(classifyParams);
                    break;
                default:
                    return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.INTERMEDIATE_PARAMETER_INVALID));
                    break;
            }
        }

        _getClassifyResult().then(data => {
            let classifyEnd = Date.now();
            logger.info(`[in_app][Classify] time cost => ${(classifyEnd - classifyStart) / 1000} seconds`);
            let orderItem = {
                order_type: orderParams.order_type,
                user_id: orderParams.user_id,
                timestamp: timestampNow,
                client_name: orderParams.client_name,
                client_version: orderParams.client_version,
                ip: orderParams.ip,
                item: orderParams.item,
                sku: orderParams.sku,
                price: orderParams.price,
                email: orderParams.email,
                status: data.result === OrderSet.ResultSet.CHEATED ? OrderSet.StatusSet.CANCELED : OrderSet.StatusSet.ONGOING,
                type_status_filter: `${orderParams.order_type}_${OrderSet.StatusSet.ONGOING}`,
                result: data.result,
                reason: data.reason
            };

            resolve(orderItem);
        })
        .catch(err => {
            logger.error(`[in_app][Classify] err => ${err.stack}`);
            reject(err);
        });
    });
}

function _validateDeliverOrderStatus(orderItem) {
    return new Promise((resolve, reject) => {

        let schema = {
            order_type: Joi.string().valid(Object.values(OrderSet.OrderTypeSet).filter(x => x !== OrderSet.OrderTypeSet.VIP)).required(),
            user_id: Joi.string().required(),
            timestamp: Joi.number().required(),
            price: Joi.number().positive().required(),
            email: Joi.string().email().required(),
            status: Joi.string().valid(OrderSet.StatusSet.ONGOING, OrderSet.StatusSet.ERROR).required(),
            result: Joi.string().valid(OrderSet.ResultSet.OK).required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(orderItem, schema, options, (err, value) => {
            if (err) {
                logger.error(`[in_app] Params error, Params => ${JSON.stringify(orderItem, null, 2)}, err => ${err.stack}`);
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
                logger.error(`[in_app] Param error, Params => ${JSON.stringify(deliverParams, null, 2)}, err => ${err.stack}`);
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
                if (auth.Action.includes('*') || auth.Action.includes('/delivery/*') || auth.Action.includes('/delivery/in_app')) {
                    resolve(params);
                } else {
                    logger.error(`[in_app] bossuser permission error => ${JSON.stringify(data.Item, null, 2)}, params => ${JSON.stringify(params, null, 2)}`);
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
            result: Joi.string().valid(Object.values(OrderSet.ResultSet)).required(),
            reason: Joi.string().required(),
            session: Joi.object().required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(updateParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`[in_app] Param error, Params => ${JSON.stringify(updateParams, null, 2)}, err => ${err.stack}`);
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
            order_type: Joi.string().valid(Object.values(OrderSet.OrderTypeSet).filter(x => x !== OrderSet.OrderTypeSet.VIP)),
            limit: Joi.number(),
            startKey: Joi.object()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(queryParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`[in_app] Param error, Params => ${JSON.stringify(queryParams, null, 2)}, err => ${err.stack}`);
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
            ip: Joi.string().ip().required(),
            item: Joi.object().required(),
            sku: Joi.string().required(),
            email: Joi.string().email(),
            order_type: Joi.string().valid(Object.values(OrderSet.OrderTypeSet).filter(x => x !== OrderSet.OrderTypeSet.VIP))
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(orderParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`[in_app] Params error, Params => ${JSON.stringify(orderParams, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    })
}

function _validateRejectOrderStatus(orderItem) {
    return new Promise((resolve, reject) => {

        let schema = {
            order_type: Joi.string().valid(Object.values(OrderSet.OrderTypeSet).filter(x => x !== OrderSet.OrderTypeSet.VIP)).required(),
            user_id: Joi.string().required(),
            timestamp: Joi.number().required(),
            price: Joi.number().positive().required(),
            email: Joi.string().email(),
            status: Joi.string().valid(OrderSet.StatusSet.ONGOING, OrderSet.StatusSet.ERROR).required(),
            result: Joi.string().valid(OrderSet.ResultSet.CHEATED).required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(orderItem, schema, options, (err, value) => {
            if (err) {
                logger.error(`[in_app] Param error, Params => ${JSON.stringify(orderItem, null, 2)}, err => ${err.stack}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.DELIVER_ORDER_STATUS_INVALID));
            } else {
                resolve(value);
            }
        });
    })
}

function _deliverAmazonUSOrder(skuProperties, orderItem) {
    return new Promise((resolve, reject) => {

        let giftcardItem = {};
        let tempOrderData = {};

        AGCOD.createGiftCard('US', skuProperties.price, config.AGCOD_Sandbox)
            .then(item => {
                giftcardItem = item;
                orderItem.giftcard_items = [giftcardItem];
                orderItem.status = OrderSet.StatusSet.DELIVERING;
                orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.DELIVERING}`;
                debug(`[Deliver] Giftcard purchased. info => ${JSON.stringify(giftcardItem, null, 2)}`);
                return OrderDB.updateOrder(orderItem);
            })
            .then(orderData => {
                let orderItem = orderData.Attributes;
                tempOrderData = orderData;
                debug(`[Deliver] order with giftcard info and status updated.`);
                if (IsEmpty(orderItem.email)) {
                    return Promise.resolve({});
                } else {
                    return Mail.sendGiftCardEmail(orderItem.email, skuProperties.price, [giftcardItem.gcClaimCode]);
                }
            })
            .then(body => {
                if (IsEmpty(body) || IsEmpty(body['id'])) {
                    return Promise.resolve(tempOrderData);
                } else {
                    debug(`[Deliver] Email has been sent successful. response => ${JSON.stringify(body, null, 2)}`);
                    orderItem.mail_id = body['id'];
                    return OrderDB.updateOrder(orderItem);
                }
            })
            .then(orderData => {
                debug(`[Deliver] Email ID has been saved into Order. orderItem => ${JSON.stringify(orderData.Attributes, null, 2)}`);
                orderItem = orderData.Attributes;

                resolve(orderItem);
            })
            .catch(err => {
                if (!IsEmpty(giftcardItem)) {
                    AGCOD.cancelGiftCard(giftcardItem.creationRequestId, 'US', config.AGCOD_Sandbox, giftcardItem.gcId)
                        .then(responseBody => {
                            logger.info(`[in_app] cancel gift card success. gift card info => ${JSON.stringify(giftcardItem)} | response => ${JSON.stringify(responseBody)}`);
                        })
                        .catch(err => {
                            logger.error(`[in_app] cancel gift card error => ${err.stack}`);
                        });
                }

                orderItem.status = OrderSet.StatusSet.ERROR;
                orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.ERROR}`;
                OrderDB.updateOrder(orderItem)
                    .then(orderData => {
                        logger.info(`[in_app] Mark order status error success => ${JSON.stringify(orderData.Attributes, null, 2)}`);
                    })
                    .catch(err => {
                        logger.error(`[in_app] Mark order status error => ${err.stack}`);
                    });

                reject(err);
            })
    })
}

function _deliverPaypalOrder(skuProperties, orderItem) {
    return new Promise((resolve, reject) => {
        orderItem.status = OrderSet.StatusSet.COMPLETE;
        orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.COMPLETE}`;
        orderItem.giftcard_items = [skuProperties];
        debug(`[Deliver] Ready to change state`);
        OrderDB.updateOrder(orderItem)
            .then(orderData => {
                debug(`[Deliver] Status changed to [Complete]. info => ${JSON.stringify(orderData.Attributes, null, 2)}`);

                resolve(orderItem);
            })
            .catch(err => {
                orderItem.status = OrderSet.StatusSet.ERROR;
                orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.ERROR}`;
                OrderDB.updateOrder(orderItem)
                    .then(orderData => {
                        logger.info(`[in_app] Mark order status error success => ${JSON.stringify(orderData.Attributes, null, 2)}`);
                    })
                    .then(err => {
                        logger.error(`[in_app] Mark order status error => ${err.stack}`);
                    });

                reject(err);
            })
    });
}

function _deliverInventoryOrder(skuProperties, orderItem) {
    return new Promise((resolve, reject) => {

        let giftcardItem = {};
        let tempOrderData = {};

        InventoryLogic.fetchAvailableItemBySku(skuProperties.sku)
            .then(item => {
                giftcardItem = {
                    gcClaimCode: item.serial
                };
                orderItem.giftcard_items = [giftcardItem];
                orderItem.status = OrderSet.StatusSet.DELIVERING;
                orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.DELIVERING}`;
                debug(`[Deliver] Giftcard purchased. info => ${JSON.stringify(giftcardItem, null, 2)}`);
                return OrderDB.updateOrder(orderItem);
            })
            .then(orderData => {
                let orderItem = orderData.Attributes;
                tempOrderData = orderData;
                debug(`[Deliver] order with giftcard info and status updated.`);
                if (IsEmpty(orderItem.email)) {
                    return Promise.resolve({});
                } else {
                    return Mail.sendGiftCardEmail(orderItem.email, skuProperties.price, [giftcardItem.gcClaimCode]);
                }
            })
            .then(body => {
                if (IsEmpty(body) || IsEmpty(body['id'])) {
                    return Promise.resolve(tempOrderData);
                } else {
                    debug(`[Deliver] Email has been sent successful. response => ${JSON.stringify(body, null, 2)}`);
                    orderItem.mail_id = body['id'];
                    return OrderDB.updateOrder(orderItem);
                }
            })
            .then(orderData => {
                debug(`[Deliver] Email ID has been saved into Order. orderItem => ${JSON.stringify(orderData.Attributes, null, 2)}`);
                orderItem = orderData.Attributes;
                resolve(orderItem);
            })
            .catch(err => {
                if (!IsEmpty(giftcardItem)) {
                    InventoryLogic.returnItem(giftcardItem)
                        .then(inventoryItem => {
                            logger.info(`[in_app] return inventory success. item => ${JSON.stringify(inventoryItem)}`);
                        })
                        .then(err => {
                            logger.error(`[in_app] return inventory error => ${err.stack}`);
                        });
                }

                orderItem.status = OrderSet.StatusSet.ERROR;
                orderItem.type_status_filter = `${orderItem.order_type}_${OrderSet.StatusSet.ERROR}`;
                OrderDB.updateOrder(orderItem)
                    .then(orderData => {
                        logger.info(`[in_app] Mark order status error success => ${JSON.stringify(orderData.Attributes, null, 2)}`);
                    })
                    .catch(err => {
                        logger.error(`[in_app] Mark order status error => ${err.stack}`);
                    });

                reject(err);
            })
    })
}