'use strict';

let express = require('express');
let router = express.Router();
let winston = require('winston');
let logger = winston.loggers.get('BossUserLogger');
let BossUser = require('../../logic/bossuser/bossuser_logic');
let debug = require('debug')('BOSS_USER');
let BossUserSet = require('../../conf/bossuser_set');
router.post('/login' , (req , res , next) => {
	let params = {
	    user_name: req.body.user_name,
		password: req.body.password,
		session: req.session
	};

	debug(`login session before => ${JSON.stringify(req.session, null, 2)}`);

	BossUser.login(params)
		.then(bossUser => {
			debug(`login session after => ${JSON.stringify(req.session, null, 2)}`);
		    res.json(bossUser);
		})
		.catch(err => {
		    logger.error(`[Login] Boss user login error => ${err.stack}`);
		    next(err);
		});
});

router.post('/logout' , (req , res , next) => {
	let params = {
		session: req.session
	};

	debug(`logout session before => ${JSON.stringify(req.session, null, 2)}`);

	BossUser.logout(params)
		.then(data => {
			debug(`logout session after => ${JSON.stringify(req.session, null, 2)}`);
			res.json(data);
		})
		.catch(err => {
			logger.error(`[Logout] Boss user logout error => ${err.stack}`);
			next(err);
		});
});

router.post('/userlist' , (req , res , next) => {
    let params = {
        limit: req.body.limit || BossUserSet.ListSet.LIMIT,
    };
    BossUser.getUserList(params)
    .then(data => {
        debug(`[post] new user => ${JSON.stringify(res.body, null, 2)}`);
        res.json(data);
    })
    .catch(err => {
        logger.error(`[post] add user error => ${JSON.stringify(err.stack, null ,2)}`);
        next(err);
    });
});

router.get('/user' , (req , res , next) => {
	let params = {
		user_name: req.query.user_name,
	};
	BossUser.getUser(params)
		.then(data => {
			debug(`[get] one user => ${JSON.stringify(req.body, null, 2)}`);
			res.json(data);
		})
		.catch(err => {
			logger.error(`[get] one user error => ${JSON.stringify(err.stack)}`);
			next(err);
		});
});

router.post('/updateuser' , (req , res , next) => {
    let params = {
        user_name: req.body.user_name,
        password: req.body.password,
        auth: req.body.auth
		};
		BossUser.updateUser(params)
		.then(data => {
				debug(`[delete] delete user => ${JSON.stringify(res.body, null, 2)}`);
				res.json(data);
		})
		.catch(err => {
				logger.error(`[delete] detele user error => ${JSON.stringify(err.stack, null ,2)}`);
				next(err);
		});
});

router.put('/newuser' , (req , res , next) => {
    let params = {
        user_name: req.body.user_name,
        password: req.body.password,
        auth: req.body.auth
    };
		debug(`login session before => ${JSON.stringify(req.body, null, 2)}`);
    BossUser.newUser(params)
        .then(data => {
            debug(`[post] new user => ${JSON.stringify(res.body, null, 2)}`);
            res.json(data);
        })
        .catch(err => {
            logger.error(`[post] add user error => ${JSON.stringify(err.stack, null ,2)}`);
            next(err);
        });
});

router.delete('/deleteuser' , (req , res , next) => {
    let params = {
        user_name : req.query.user_name,
    };
		BossUser.deleteUser(params)
		.then(data => {
				debug(`[delete] delete user => ${JSON.stringify(res.body , null, 2)}`);
				res.json(data);
		})
		.catch(err => {
				logger.error(`[delete] detele user error => ${JSON.stringify(err.stack, null ,2)}`);
				next(err);
		});
});

module.exports = router;
