'use strict';

let express = require('express');
let router = express.Router();
let winston = require('winston');
let logger = winston.loggers.get('MailLogger');

let authorization = require('../../middleware/authorization');
router.use(authorization);

let mailgunWebhookLogic = require('../../logic/orders/mailgun_webhook_logic');

router.post('/success' , (req , res , next) => {
    let params = {
    	mail_id: req.body["Message-Id"],
		event: req.body['event'],
		signature: req.body['signature'],
		timestamp: req.body['timestamp'],
		token: req.body['token']
	};
    // record mailgun post request
	logger.info(`[MailgunWebhook] success. request => ${JSON.stringify(req.body, null, 2)}`);
    mailgunWebhookLogic.handleOrderMailSuccess(params)
		.then(result => {
			res.json({});
		})
		.catch(err => {
			logger.error(`[MailgunWebhook] error => ${err.stack}`);
			next(err);
		})
});

router.post('/failure', (req, res, next) => {
    let params = {
        message_headers: req.body["message-headers"],
        event: req.body['event'],
        signature: req.body['signature'],
        timestamp: req.body['timestamp'],
        token: req.body['token']
    };
    // record mailgun post request
    logger.info(`[MailgunWebhook] failure. request => ${JSON.stringify(req.body, null, 2)}`);
	mailgunWebhookLogic.handleOrderMailFailure(params)
		.then(result => {
			res.json({});
		})
		.catch(err => {
            logger.error(`[MailgunWebhook] error => ${err.stack}`);
            next(err);
		})
});

module.exports = router;