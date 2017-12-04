'use strict';

let express = require('express');
let router = express.Router();
let logger = require('winston').loggers.get('/DeliveryLogger');
let deliveryInAppLogic = require('../../logic/orders/delivery_in_app_logic');

router.post('/makeorder', (req, res, next) => {
    let params = {
        user_id: req.body.user_id,
        country_code: req.body.country_code,
        client_name: req.body.client_name,
        client_version: req.body.client_version,
        ip: req.body.ip,
        item: req.body.item,
        price: req.body.price,
        sku: req.body.sku,
        email: req.body.email,
        order_type: req.body.order_type
    };

    deliveryInAppLogic.makeOrder(params)
        .then(result => {
            logger.info(`[in_app][Make Order] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[in_app][Make Order] error => ${err.stack}`);
            next(err);
        });
});

let authorization = require('../../middleware/authorization');
router.use(authorization);

router.post('/', (req, res, next) => {
    let params = {
        status: req.body.status,
        order_type: req.body.order_type,
        limit: req.body.limit,
        startKey: req.body.startKey
    };

    deliveryInAppLogic.queryManualOrders(params)
        .then(result => {
            logger.info(`[in_app][Query] Query orders result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[in_app][Query] Query orders to be delivered error => ${err.stack}`);
            next(err);
        });
});

router.post('/update', (req, res, next) => {
    let params = {
        user_id: req.body.user_id,
        order_id: req.body.order_id,
        result: req.body.result,
        reason: req.body.reason,
        session: req.session
    };

    deliveryInAppLogic.updateOrderStatus(params)
        .then(result => {
            logger.info(`[in_app][Update Status] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[in_app][Update Status] error => ${err.stack}`);
            next(err);
        });
});

router.post('/deliver', (req, res, next) => {
    let params = {
        user_id: req.body.user_id,
        order_id: req.body.order_id,
        session: req.session
    };

    deliveryInAppLogic.deliverOrder(params)
        .then(result => {
            logger.info(`[in_app][Deliver] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[in_app][Deliver] error => ${err.stack}`);
            next(err);
        });
});

router.post('/reject' , (req , res , next) => {
    let params = {
        user_id: req.body.user_id,
        order_id: req.body.order_id,
        session: req.session
    };

    deliveryInAppLogic.rejectOrder(params)
        .then(result => {
            logger.info(`[in_app][Reject] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[in_app][Reject] error => ${err.stack}`);
            next(err);
        });
});

module.exports = router;