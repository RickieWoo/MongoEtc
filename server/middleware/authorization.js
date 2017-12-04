/*
 * @Author: wizardfan
 * @Date:   2017-03-08 17:33:55
 * @Last Modified by:   wizardfan
 * @Last Modified time: 2017-03-16 02:03:33
 */

'use strict';

let ResponseErrorSet = require('../conf/response_error_set');
let AuthenticationSet = require('../conf/authentication_set');
let logger = require('winston').loggers.get('AuthorizationLogger');
let IsEmpty = require('is-empty');

function checkBossAuth(req, res, next) {
    if ('GET' === req.method) {
        next();
    } else if (AuthenticationSet.BASEURL_WHITELIST.includes(req.baseUrl)) {
        next();
    } else if (IsEmpty(req.session) || IsEmpty(req.session.user)) {
        logger.info(`Auth denied: ${req.route}`);
        next(ResponseErrorSet.createResponseError(ResponseErrorSet.BossUserErrorSet.USER_SESSION_MISSING));
    } else {
        next();
    }
}

module.exports = checkBossAuth;