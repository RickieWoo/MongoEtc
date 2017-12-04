'use strict';

let IsEmpty = require('is-empty');
let debug = require('debug')('STATISTICS');
let OrderDB = require('../../models/orders/order_record_db');
let OrderSet = require('../../conf/order_set');
let SkuDB = require('../../models/orders/sku_property_db');
let logger = require('winston').loggers.get('StatisticsLogger');
let InternalErrorSet = require('../../conf/internal_error_set');
let AGCOD = require('../orders/agcod_logic');
let config = require('config');
let Joi = require('joi');
let moment = require('moment');
let StatisticsDB = require('../../models/statistics/statistics_db');

exports.updateOneHourDeliveryStatistics = function (writeParams) {
    return new Promise((resolve, reject) => {
        let allOrders = [];
        let ordersByType = {};
        let ordersByStatus = {};

        _validateParams(writeParams)
            .then(async params => {
                // get every orders
                let startTime = parseInt(moment(writeParams.dimension).startOf('hour').format('x'));
                let endTime = parseInt(moment(writeParams.dimension).endOf('hour').format('x'));
                if (startTime >= endTime) {
                    logger.error(`[Statistics] params error => ${JSON.stringify(params, null, 2)}`);
                    return Promise.reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.INTERMEDIATE_PARAMETER_INVALID));
                }
                for (let orderType of Object.values(OrderSet.OrderTypeSet)) {
                    for (let status of Object.values(OrderSet.StatusSet)) {
                        let orders = await _queryAllOrdersByTypeStatusAndTimeRange({
                            typeStatus: `${orderType}_${status}`,
                            startTime: startTime,
                            endTime: endTime
                        });
                        ordersByType[`${orderType}`] = (ordersByType[`${orderType}`] || []).concat(orders);
                        ordersByStatus[`${status}`] = (ordersByStatus[`${status}`] || []).concat(orders);
                        allOrders = allOrders.concat(orders);
                    }
                }
                logger.info(`[Statistics] all orders length => ${allOrders.length}`);
                return allOrders;
            })
            .then(async allOrders => {
                // Amazon US card statistics
                let amazonUSCards = {
                    count: 0,
                    amount: 0
                };
                let cardCreatedOrders = ordersByStatus[`${OrderSet.StatusSet.DELIVERING}`].concat(ordersByStatus[`${OrderSet.StatusSet.COMPLETE}`]);
                for (let order of cardCreatedOrders) {
                    let skuProperty = await SkuDB.getPropertyBySku(order.sku);
                    skuProperty = skuProperty.Item;

                    if (IsEmpty(skuProperty)) {
                        logger.error(`[Statistics] sku not exists. order => ${JSON.stringify(order, null, 2)}`);
                        continue;
                    }
                    if (skuProperty.category === 'amazon_us') {
                        let amount = _getOrderCardAmount(order, skuProperty);
                        amazonUSCards.amount += amount;
                        if (order.order_type === OrderSet.OrderTypeSet.VIP) {
                            amazonUSCards.count += Math.ceil(amount / 10);
                        } else {
                            amazonUSCards.count += 1;
                        }
                    }
                }

                logger.info(`[Statistics] amazon us cards => ${JSON.stringify(amazonUSCards, null, 2)}`);
                return StatisticsDB.updateItem({
                    event_name: 'delivery_amazon_us_cards',
                    dimension: moment(writeParams.dimension).startOf('hour').toISOString(),
                    result: amazonUSCards
                });
            })
            .then(async item => {
                logger.info(`[Statistics] put delivery_amazon_us_cards success`);
                // Amazon US API statistics
                let data = await AGCOD.getAllGiftCardActivities('US', config.AGCOD_Sandbox, moment(writeParams.dimension).startOf('hour').toISOString(), moment(writeParams.dimension).endOf('hour').toISOString());
                let agcodAPICards = {};
                let requestIds = {};
                data.forEach(activity => {
                    if (activity.activityStatus === 'Success') {
                        if (!requestIds[activity.requestId]) {
                            requestIds[activity.requestId] = {count: 0};
                        }
                        if (activity.activityType === 'GCCreation') {
                            requestIds[activity.requestId].count++;
                            requestIds[activity.requestId].amount = activity.cardValue.amount;
                        } else if (activity.activityType === 'GCCancellation') {
                            requestIds[activity.requestId].count--;
                        }
                    }
                });
                Object.keys(requestIds).forEach(key => {
                    let request = requestIds[key];
                    if (!agcodAPICards[request.amount]) {
                        agcodAPICards[request.amount] = {
                            create_count: 0,
                            create_amount: 0,
                            cancel_count: 0,
                            new_purchase_count: 0,
                            new_purchase_amount: 0,
                        };
                    }
                    switch (request.count) {
                        case 1:
                            agcodAPICards[request.amount].create_count++;
                            agcodAPICards[request.amount].create_amount += request.amount;
                            agcodAPICards[request.amount].new_purchase_count++;
                            agcodAPICards[request.amount].new_purchase_amount += request.amount;
                            break;
                        case 0:
                            agcodAPICards[request.amount].create_count++;
                            agcodAPICards[request.amount].create_amount += request.amount;
                            agcodAPICards[request.amount].cancel_count++;
                            break;
                        case -1:
                            agcodAPICards[request.amount].cancel_count++;
                            break;
                        default:
                            break;
                    }
                });
                let allInfo = {
                    create_count: 0,
                    create_amount: 0,
                    cancel_count: 0,
                    new_purchase_count: 0,
                    new_purchase_amount: 0,
                };
                Object.keys(agcodAPICards).forEach(key => {
                    let info = agcodAPICards[key];
                    allInfo.create_count += info.create_count;
                    allInfo.create_amount += info.create_amount;
                    allInfo.cancel_count += info.cancel_count;
                    allInfo.new_purchase_amount += info.new_purchase_amount;
                    allInfo.new_purchase_count += info.new_purchase_count;
                });
                agcodAPICards['all'] = allInfo;

                logger.info(`[Statistics] agcod api cards => ${JSON.stringify(agcodAPICards, null, 2)}`);
                return StatisticsDB.updateItem({
                    event_name: 'delivery_agcod_api_cards',
                    dimension: moment(writeParams.dimension).startOf('hour').toISOString(),
                    result: agcodAPICards
                });
            })
            .then(item => {
                logger.info(`[Statistics] put delivery_cards_info success`);
                // delivery info of each status
                let rejectReasonTypes = {};
                ordersByStatus[`${OrderSet.StatusSet.CANCELED}`].forEach(x => rejectReasonTypes[x.result] = (rejectReasonTypes[x.result] || 0) + 1);
                let deliveryStatusInfo = {
                    complete: ordersByStatus[`${OrderSet.StatusSet.COMPLETE}`].length,
                    canceled: ordersByStatus[`${OrderSet.StatusSet.CANCELED}`].length,
                    ongoing: ordersByStatus[`${OrderSet.StatusSet.ONGOING}`].length,
                    error: ordersByStatus[`${OrderSet.StatusSet.ERROR}`].length,
                    delivering: ordersByStatus[`${OrderSet.StatusSet.DELIVERING}`].length,
                    all: allOrders.length,
                    canceled_reasons: rejectReasonTypes
                };

                logger.info(`[Statistics] delivery status info => ${JSON.stringify(deliveryStatusInfo, null, 2)}`);
                return StatisticsDB.updateItem({
                    event_name: 'delivery_status_info',
                    dimension: moment(writeParams.dimension).startOf('hour').toISOString(),
                    result: deliveryStatusInfo
                })
            })
            .then(async item => {
                logger.info(`[Statistics] put delivery_status_info success`);
                // delivery amount of each channel
                let channelAmount = {};
                for (let order of ordersByStatus[`${OrderSet.StatusSet.COMPLETE}`]) {
                    let skuProperty = await SkuDB.getPropertyBySku(order.sku);
                    skuProperty = skuProperty.Item;
                    if (IsEmpty(skuProperty)) {
                        logger.error(`[Statistics] sku not exists. order => ${JSON.stringify(order, null, 2)}`);
                        continue;
                    }

                    let amount = _getOrderCardAmount(order, skuProperty);
                    let channel;
                    if (skuProperty.category === 'amazon_us') {
                        channel = 'amazon_us';
                    } else if (skuProperty.category === 'paypal') {
                        channel = 'paypal';
                    } else {
                        channel = 'inventory';
                    }
                    channelAmount[channel] = (channelAmount[channel] || 0) + amount;
                }

                logger.info(`[Statistics] channel amount => ${JSON.stringify(channelAmount, null, 2)}`);
                return StatisticsDB.updateItem({
                    event_name: 'delivery_channel_amount',
                    dimension: moment(writeParams.dimension).startOf('hour').toISOString(),
                    result: channelAmount
                })
            })
            .then(async item => {
                logger.info(`[Statistics] put delivery_channel_amount success`);
                // delivery info of each Android, iOS app
                let appDelivery = {
                    ios: {
                        all: {}
                    },
                    android: {
                        all: {}
                    }
                };
                for (let order of allOrders) {
                    let platform = order.client_name.split('_')[0].toLowerCase();
                    let gameName = order.client_name.split('_')[1];

                    if (platform === 'ios' || platform === 'android') {
                        if (!appDelivery[platform][gameName]) {
                            appDelivery[platform][gameName] = {};
                        }

                        let skuProperty = await SkuDB.getPropertyBySku(order.sku);
                        skuProperty = skuProperty.Item;
                        if (IsEmpty(skuProperty)) {
                            logger.error(`[Statistics] sku not exists. order => ${JSON.stringify(order, null, 2)}`);
                            continue;
                        }

                        let amount = _getOrderCardAmount(order, skuProperty);
                        appDelivery[platform][gameName][`${order.status}_count`] = (appDelivery[platform][gameName][`${order.status}_count`] || 0) + 1;
                        appDelivery[platform][gameName][`${order.status}_amount`] = (appDelivery[platform][gameName][`${order.status}_amount`] || 0) + amount;
                        appDelivery[platform][gameName].all_count = (appDelivery[platform][gameName].all_count || 0) + 1;
                        appDelivery[platform][gameName].all_amount = (appDelivery[platform][gameName].all_amount || 0) + amount;
                        appDelivery[platform]['all'][`${order.status}_count`] = (appDelivery[platform]['all'][`${order.status}_count`] || 0) + 1;
                        appDelivery[platform]['all'][`${order.status}_amount`] = (appDelivery[platform]['all'][`${order.status}_amount`] || 0) + amount;
                        appDelivery[platform]['all'].all_count = (appDelivery[platform]['all'].all_count || 0) + 1;
                        appDelivery[platform]['all'].all_amount = (appDelivery[platform]['all'].all_amount || 0) + amount;
                    }
                }

                logger.info(`[Statistics] app delivery => ${JSON.stringify(appDelivery, null, 2)}`);
                return StatisticsDB.updateItem({
                    event_name: 'delivery_app_info',
                    dimension: moment(writeParams.dimension).startOf('hour').toISOString(),
                    result: appDelivery
                })
            })
            .then(item => {
                logger.info(`[Statistics] put delivery_app_info success`);
                resolve({});
            })
            .catch(err => {
                logger.error(`[Statistics] err => ${err.stack}`);
                reject(err);
            })
    })
};

function _validateParams(params) {
    return new Promise((resolve, reject) => {
        let schema = {
            dimension: Joi.string().isoDate().required()
        };
        let options = {
            convert: false,
            allowUnknown: true,
        };
        Joi.validate(params, schema, options, (err, value) => {
            if (err) {
                logger.error(`[Statistics] Params error, Params => ${JSON.stringify(params, null, 2)}, err => ${err.stack}`);
                reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.INTERMEDIATE_PARAMETER_INVALID));
            } else {
                resolve(value);
            }
        })
    })
}

async function _queryAllOrdersByTypeStatusAndTimeRange(params) {
    let data = await OrderDB.queryOrdersByTypeStatusAndTimeRange({
        typeStatus: params.typeStatus,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: 1000
    });
    let result = data.Items;
    let startKey = data.LastEvaluatedKey;

    while (!IsEmpty(startKey)) {
        let data = await OrderDB.queryOrdersByTypeStatusAndTimeRange({
            typeStatus: params.typeStatus,
            startTime: params.startTime,
            endTime: params.endTime,
            limit: 1000,
            ExclusiveStartKey: startKey
        });
        result = result.concat(data.Items);
        startKey = data.LastEvaluatedKey;
    }

    return result;
}

function _getOrderCardAmount(order, skuProperty) {
    let amount;
    if (order.order_type === OrderSet.OrderTypeSet.VIP) {
        amount = order.base_value;
        amount += order.extra_value? order.extra_value : 0;
        amount = Math.round(amount * 100) / 100;
    } else if (skuProperty.category === 'paypal') {
        amount = order.price;
    } else {
        amount = skuProperty.price;
    }
    return amount;
}
