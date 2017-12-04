'use strict';

let Joi = require('joi');
let config = require('config');
let mailLogger = require('winston').loggers.get('MailLogger');
let agcodErrorLogger = require('winston').loggers.get('AGCODCriticalErrorLogger');
let ResponseErrorSet = require('../../conf/response_error_set');
let OrderSet = require('../../conf/order_set');
let OrderDB = require('../../models/orders/order_record_db');
let InventoryLogic = require('../../logic/orders/inventory_logic');
let SkuDB = require('../../models/orders/sku_property_db');
let IsEmpty = require('is-empty');
let debug = require('debug')('ORDER');
let crypto = require('crypto');
let AGCOD = require('./agcod_logic');

exports.handleOrderMailSuccess = function (params) {
    return new Promise((resolve, reject) => {
        _validateMailSuccessParams(params)
            .then(params => {
                return _validateMailgunSignature(params);
            })
            .then(params => {
                debug(`[MailgunWebhook] handleOrderMailSuccess request params => ${JSON.stringify(params, null, 2)}`);
                return OrderDB.queryOrdersByMailId({
                    mail_id: params.mail_id
                });
            })
            .then(result => {
                if (IsEmpty(result.Items) || IsEmpty(result.Items[0])) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.ORDER_NOT_EXISTS));
                }
                let order = result.Items[0];
                debug(`[MailgunWebhook] handleOrderMailSuccess order => ${JSON.stringify(order, null, 2)}`);
                if (order.order_type === OrderSet.OrderTypeSet.VIP) {
                    return _handleVipOrderMailSuccess(order);
                } else {
                    return _handleNonVipOrderMailSuccess(order);
                }
            })
            .then(orderData => {
                let result = {order: orderData.Attributes};
                result.order.order_id = result.order.timestamp;
                delete result.order.timestamp;

                debug(`[MailgunWebhook] order status changed to complete => ${JSON.stringify(result, null, 2)}`);
                resolve(result);
            })
            .catch(err => {
                if (err.status !== ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR.status) {
                    debug(`[MailgunWebhook] err => ${err.stack}`);
                    // mailgun webhook stop request when receives 406
                    let rejectError = new Error();
                    rejectError.status = 406;
                    rejectError.msg = 'mailgun webhook unacceptable';
                    reject(rejectError);
                }
                reject(err);
            })
    });
};

exports.handleOrderMailFailure = function (params) {
    return new Promise((resolve, reject) => {
        _validateMailFailureParams(params)
            .then(params => {
                // get mail_id from message_headers
                let mailIdItem = params.message_headers.find(item => item[0] === "Message-Id");
                if (IsEmpty(mailIdItem)) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
                }
                params.mail_id = mailIdItem[1];
                delete params.message_headers;
                debug(`[MailgunWebhook] handleOrderMailFailure get mail_id. params => ${JSON.stringify(params, null, 2)}`);
                return params;
            })
            .then(params => {
                return _validateMailgunSignature(params);
            })
            .then(params => {
                debug(`[MailgunWebhook] handleOrderMailFailure request params => ${JSON.stringify(params, null, 2)}`);
                return OrderDB.queryOrdersByMailId({
                    mail_id: params.mail_id
                });
            })
            .then(result => {
                if (IsEmpty(result.Items) || IsEmpty(result.Items[0])) {
                    return Promise.reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.ORDER_NOT_EXISTS));
                }
                let order = result.Items[0];
                debug(`[MailgunWebhook] handleOrderMailFailure order => ${JSON.stringify(order, null, 2)}`);
                if (order.order_type === OrderSet.OrderTypeSet.VIP) {
                    return _handleVipOrderMailFailure(order);
                } else {
                    return _handleNonVipOrderMailFailure(order);
                }
            })
            .then(orderData => {
                let result = {order: orderData.Attributes};
                result.order.order_id = result.order.timestamp;
                delete result.order.timestamp;

                debug(`[MailgunWebhook] order status changed to cancelled => ${JSON.stringify(result, null, 2)}`);
                resolve(result);
            })
            .catch(err => {
                if (err.status !== ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR.status) {
                    debug(`[MailgunWebhook] err => ${err.stack}`);
                    // mailgun webhook stop request when receives 406
                    let rejectError = new Error();
                    rejectError.status = 406;
                    rejectError.msg = 'mailgun webhook unacceptable';
                    reject(rejectError);
                }
                reject(err);
            })
    });
};

function _validateMailSuccessParams(params) {
    return new Promise((resolve, reject) => {
        let jsonSchema = {
            mail_id: Joi.string().required(),
            event: Joi.string().valid(OrderSet.MailgunEventSet.DELIVERED).required(),
            signature: Joi.string().required(),
            timestamp: Joi.string().required(),
            token: Joi.string().required()
        };
        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(params, jsonSchema, options, (err, value) => {
            if (err) {
                mailLogger.error(`[MailgunWebhook] Params error, Params => ${JSON.stringify(params, null, 2)}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateMailFailureParams(params) {
    return new Promise((resolve, reject) => {
        let jsonSchema = {
            message_headers: Joi.array().required(),
            event: Joi.string().valid(OrderSet.MailgunEventSet.DROPPED, OrderSet.MailgunEventSet.BOUNCED, OrderSet.MailgunEventSet.COMPLAINED).required(),
            signature: Joi.string().required(),
            timestamp: Joi.string().required(),
            token: Joi.string().required()
        };
        let options = {
            convert: false,
            allowUnknown: true
        };

        Joi.validate(params, jsonSchema, options, (err, value) => {
            if (err) {
                mailLogger.error(`[MailgunWebhook] Params error, Params => ${JSON.stringify(params, null, 2)}`);
                reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
            } else {
                resolve(value);
            }
        });
    });
}

function _validateMailgunSignature(params) {
    return new Promise((resolve, reject) => {
        let currentSignature = crypto.createHmac('sha256', config.get('MailgunApiKey'))
            .update(params.timestamp.concat(params.token))
            .digest('hex');
        debug(`[MailgunWebhook] validate signature => current: ${currentSignature} previous: ${params.signature}`);
        if (params.signature === currentSignature) {
            resolve(params);
        } else {
            reject(ResponseErrorSet.createResponseError(ResponseErrorSet.OrderErrorSet.REQUEST_PARAMETER_ERROR));
        }
    });
}

function _handleVipOrderMailSuccess(order) {
    return _handleAmazonUSCardOrderMailSuccess(order);
}

function _handleNonVipOrderMailSuccess(order) {
    return SkuDB.getPropertyBySku(order.sku)
        .then(result => {
            let skuProperties = result.Item;
            debug(`[MailgunWebhook] _handleNonVipOrderMailSuccess skuProperties => ${JSON.stringify(skuProperties, null, 2)}`);
            if (skuProperties.category === 'amazon_us') {
                return _handleAmazonUSCardOrderMailSuccess(order);
            } else {
                return _handleInventoryCardOrderMailSuccess(order);
            }
        })
}

function _handleAmazonUSCardOrderMailSuccess(order) {
    order.status = OrderSet.StatusSet.COMPLETE;
    order.type_status_filter = `${order.type_status_filter.split('_')[0]}_${OrderSet.StatusSet.COMPLETE}`;
    return OrderDB.updateOrder(order);
}

function _handleInventoryCardOrderMailSuccess(order) {
    return InventoryLogic.getItem(order.giftcard_item[0])
        .then(inventoryItem => {
            return InventoryLogic.confirmAndDeleteItem(inventoryItem);
        })
        .then(inventoryItem => {
            debug(`[MailgunWebhook] _handleInventoryCardOrderMailSuccess deleted inventoryItem => ${JSON.stringify(inventoryItem, null, 2)}`);
            order.status = OrderSet.StatusSet.COMPLETE;
            order.type_status_filter = `${order.type_status_filter.split('_')[0]}_${OrderSet.StatusSet.COMPLETE}`;
            return OrderDB.updateOrder(order);
        });
}

function _handleVipOrderMailFailure(order) {
    return _cancelAgcodGiftCards(order.giftcard_item, 'US', config.AGCOD_Sandbox)
            .then(data => {
                debug(`[MailgunWebhook] _handleVipOrderMailFailure AGCOD cancel card => ${JSON.stringify(data, null, 2)}`);
                order.status = OrderSet.StatusSet.ERROR;
                order.type_status_filter = `${order.type_status_filter.split('_')[0]}_${OrderSet.StatusSet.ERROR}`;
                return OrderDB.updateOrder(order);
            });
}

async function _cancelAgcodGiftCards(giftCardItems, countryCode, isSandbox) {
    // assume that all cancel actions will be successful, and check agcodErrorLogger's output to cancel cards manually.
    let unhandledCards = giftCardItems.slice();
    try {
        for (let [index, item] of giftCardItems.entries()) {
            if (!IsEmpty(item)) {
                let giftcard = await AGCOD.cancelGiftCard(item.creationRequestId, countryCode, isSandbox, item.gcId);
                debug(`[AGCOD giftcard] _cancelAgcodGiftCards cancelled card => ${JSON.stringify(giftcard, null, 2)}`);
                delete unhandledCards[index];
            }
        }
    } catch (err) {
        agcodErrorLogger.error(`[AGCOD giftcard] cancel card error => ${err.stack}. uncancelled cards => ${JSON.stringify(unhandledCards, null, 2)}`);
    }

    return giftCardItems;
}

function _handleNonVipOrderMailFailure(order) {
    return SkuDB.getPropertyBySku(order.sku)
        .then(result => {
            let skuProperties = result.Item;
            debug(`[MailgunWebhook] _handleNonVipOrderMailFailure skuProperties => ${JSON.stringify(skuProperties, null, 2)}`);
            if (skuProperties.category === 'amazon_us') {
                return _handleAmazonUSCardOrderMailFailure(order);
            } else {
                return _handleInventoryCardOrderMailFailure(order);
            }
        })
}

function _handleAmazonUSCardOrderMailFailure(order) {
    return AGCOD.cancelGiftCard(order.giftcard_item[0].creationRequestId, 'US', config.AGCOD_Sandbox, order.giftcard_item[0].gcId)
        .then(data => {
            debug(`[MailgunWebhook] _handleAmazonUSCardOrderMailFailure AGCOD cancel card => ${JSON.stringify(data, null, 2)}`);
            order.status = OrderSet.StatusSet.ERROR;
            order.type_status_filter = `${order.type_status_filter.split('_')[0]}_${OrderSet.StatusSet.ERROR}`;
            return OrderDB.updateOrder(order);
        })
}

function _handleInventoryCardOrderMailFailure(order) {
    return InventoryLogic.getItem(order.giftcard_item[0])
        .then(inventoryItem => {
            return InventoryLogic.returnItem(inventoryItem);
        })
        .then(inventoryItem => {
            debug(`[MailgunWebhook] _handleInventoryCardOrderMailFailure unlocked inventoryItem => ${JSON.stringify(inventoryItem, null, 2)}`);
            order.status = OrderSet.StatusSet.ERROR;
            order.type_status_filter = `${order.type_status_filter.split('_')[0]}_${OrderSet.StatusSet.ERROR}`;
            return OrderDB.updateOrder(order);
        });
}