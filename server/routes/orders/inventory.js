'use strict';

let express = require('express');
let router = express.Router();
let winston = require('winston');
let logger = winston.loggers.get('InventoryLogger');
let InventoryLogic = require('../../logic/orders/inventory_logic');

let authorization = require('../../middleware/authorization');
router.use(authorization);

router.put('/' , (req , res , next) => {
	let params = {
	    sku: req.body.sku,
		serial: req.body.serial,
		session: req.session
	};

	InventoryLogic.addItem(params)
		.then(result => {
		    res.json(result);
		})
		.catch(err => {
			logger.error(`[Inventory] Add item error => ${err.stack}`);
			next(err);
		})
});

router.get('/' , (req , res , next) => {
	let params = {
		sku: req.query.sku
	};

	InventoryLogic.queryItems(params)
		.then(result => {
			res.json(result);
		})
		.catch(err => {
			logger.error(`[Inventory] Query inventory information error => ${err.stack}`);
			next(err);
		});
});

module.exports = router;