'use strict';

let express = require('express');
let router = express.Router();
let winston = require('winston');
let logger = winston.loggers.get('InventoryLogger');
let SKUPropertyLogic = require('../../logic/orders/sku_property_logic');

let authorization = require('../../middleware/authorization');
router.use(authorization);

router.put('/' , (req , res , next) => {
	let params = req.body;
	params.session = req.session;

	SKUPropertyLogic.addSKUPropertyItem(params)
		.then(result => {
		    res.json(result);
		})
		.catch(err => {
			logger.error(`[SKU] Add item error => ${err.stack}`);
			next(err);
		})
});

router.post('/' , (req , res , next) => {
    let params = req.body;
    params.session = req.session;

    SKUPropertyLogic.updateSKUPropertyItem(params)
        .then(result => {
            res.json(result);
        })
        .catch(err => {
            logger.error(`[SKU] Update item error => ${err.stack}`);
            next(err);
        })
});

router.get('/' , (req , res , next) => {
	let params = {
		sku: req.query.sku,
		category: req.query.category
	};

	SKUPropertyLogic.queryItems(params)
		.then(result => {
			res.json(result);
		})
		.catch(err => {
			logger.error(`[SKU] Query inventory information error => ${err.stack}`);
			next(err);
		});
});

module.exports = router;