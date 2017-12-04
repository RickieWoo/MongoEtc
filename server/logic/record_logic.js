/**
 * Created by Ruozi on 8/22/17.
 */

'use strict';

let recordDB = new (require('../models/record/operation_record_db'))();
let Joi = require('joi');
let InternalErrorSet = require('../conf/internal_error_set');


/**
 *
 * @param params must include following properties:
 *
 * user_name: S
 * timestamp: N
 * boss_record: S
 *
 * @returns {Promise}
 */
exports.recordOperation = function (params) {
    return new Promise((resolve, reject) => {
        _validateRecordParams(params)
            .then(value => {
                return recordDB.updateOperationRecord(value);
            })
            .then(updatedData => {
                resolve(updatedData.Attributes);
            })
            .catch(err => {
                reject(err);
            })
    });
};

function _validateRecordParams(recordParams) {
    return new Promise((resolve, reject) => {

        let schema = {
            user_name: Joi.string().required(),
            timestamp: Joi.number().required(),
            boss_record: Joi.string().required()
        };

        let options = {
            convert: false,
            allowUnknown: true,
        };

        Joi.validate(recordParams, schema, options, (err, value) => {
            if (err) {
                logger.error(`[Record Operation] Record params error, Params => ${JSON.stringify(recordParams)}, err => ${err.stack}`);
                reject(InternalErrorSet.createInternalError(InternalErrorSet.ErrorSet.INTERMEDIATE_PARAMETER_INVALID));
            } else {
                resolve(value);
            }
        });
    })
}
