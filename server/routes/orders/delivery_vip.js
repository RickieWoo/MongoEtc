'use strict';

let express = require('express');
let router = express.Router();
let logger = require('winston').loggers.get('DeliveryLogger');
let deliveryVIPLogic = require('../../logic/orders/delivery_vip_logic');

router.post('/makeorder' , (req , res , next) => {
	let params = { 
		user_id: req.body.user_id,
        client_name: req.body.client_name,
        client_version: req.body.client_version,
        price: req.body.price,
        exchange_rate: req.body.exchange_rate,
        email: req.body.email
	};

	deliveryVIPLogic.makeOrder(params)
		.then(result => {
            logger.info(`[VIP][Make Order] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
		})
		.catch(err => {
			logger.error(`[VIP][Make Order] error => ${err.stack}`);
			next(err);
		});
});

let authorization = require('../../middleware/authorization');
router.use(authorization);

router.post('/' , (req , res , next) => {
	let params = {
        status: req.body.status,
        limit: req.body.limit,
        startKey: req.body.startKey
	};

	deliveryVIPLogic.queryManualOrders(params)
		.then(result => {
            logger.info(`[VIP][Query] Query orders result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
		})
		.catch(err => {
			logger.error(`[VIP][Query] Query orders to be delivered error => ${err.stack}`);
			next(err);
		});
});

router.post('/update' , (req , res , next) => {
    let params = {
        user_id: req.body.user_id,
        order_id: req.body.order_id,
        result: req.body.result,
		extra_value: req.body.extra_value,
		reason: req.body.reason,
        session: req.session
    };

    deliveryVIPLogic.updateOrderStatus(params)
        .then(result => {
            logger.info(`[VIP][Update Status] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[VIP][Update Status] error => ${err.stack}`);
            next(err);
        });
});

router.post('/deliver' , (req , res , next) => {
    let params = {
        user_id: req.body.user_id,
        order_id: req.body.order_id,
        session: req.session
    };

    deliveryVIPLogic.deliverOrder(params)
        .then(result => {
            logger.info(`[VIP][Deliver] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[VIP][Deliver] error => ${err.stack}`);
            next(err);
        });
});

router.post('/reject' , (req , res , next) => {
    let params = {
        user_id: req.body.user_id,
        order_id: req.body.order_id,
        session: req.session
    };

    deliveryVIPLogic.rejectOrder(params)
        .then(result => {
            logger.info(`[VIP][Reject] result => ${JSON.stringify(result, null, 2)}`);
            res.json(result);
        })
        .catch(err => {
            logger.error(`[VIP][Reject] error => ${err.stack}`);
            next(err);
        });
});

module.exports = router;