'use strict';

let express = require('express');
let router = express.Router();
let logger = require('winston').loggers.get('UserLogger');
let UserLogic = require('../../logic/user/user_logic');
let debug = require('debug')('USER');

router.post('/vip/signup' , (req , res , next) => {
	let params = {
	    name: req.body.name,
		password: req.body.password,
        email: req.body.email,
		client_name: req.body.client_name,
		platform: req.body.platform,
		session: req.session
	};

	debug(`master signup params => ${JSON.stringify(params, null, 2)}`);

	UserLogic.createNewVIPUser(params)
		.then(VIPUser => {
            debug(`create vip user => ${JSON.stringify(VIPUser, null, 2)}`);
		    res.json(VIPUser);
		})
		.catch(err => {
		    logger.error(`[VIP] master user create error => ${err.stack}`);
		    next(err);
		});
});

module.exports = router;
