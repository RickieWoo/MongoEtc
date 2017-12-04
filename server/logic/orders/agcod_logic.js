/**
 * Created by Ruozi on 8/27/17.
 */

'use strict';

let AGCOD_SET = require('../../conf/agcod_set');
let request = require('request');
let logger = require('winston').loggers.get('AGCODLogger');
let debug = require('debug')('AGCOD');
let crypto = require('crypto');
let IsEmpty = require('is-empty');

exports.createGiftCard = function (countryCode, amount, isSandbox) {
    return _executeOperation(AGCOD_SET.Operation.CreateGiftCard, null, countryCode, isSandbox, {amount: amount});
};

exports.cancelGiftCard = function (requestId, countryCode, isSandbox, gcId) {
    return _executeOperation(AGCOD_SET.Operation.CancelGiftCard, requestId, countryCode, isSandbox, {gcId: gcId});
};

exports.getAllGiftCardActivities = async function (countryCode, isSandbox, utcStartDate, utcEndDate) {
    let result = [];
    let count = 0;
    let pageIndex = 0;
    let data;
    do {
        await _sleep(60000);
        data = await _executeOperation(AGCOD_SET.Operation.GetGiftCardActivityPage, null, countryCode, isSandbox, {utcStartDate: utcStartDate, utcEndDate: utcEndDate, pageIndex: pageIndex});
        count += data.cardActivityList.length;
        result = result.concat(data.cardActivityList);
        pageIndex++;
    } while (count < data.totalNumberOfTransactionsInRequestedTimeFrame);
    return result;
};

function _executeOperation(operation, requestId, countryCode, isSandbox, operationParams) {
    return new Promise((resolve, reject) => {
        let dateTimeNow = _getFormmatedDateNow();
        let payload = _genPayload(operation, requestId, countryCode, operationParams);
        let canonicalRequest = _createCanonicalRequest(countryCode, operation, isSandbox, dateTimeNow, payload);
        let stringToSign = _createStringToSign(_hash(canonicalRequest), dateTimeNow, countryCode);
        let derivedKey = _calculateDerivedKey(isSandbox, dateTimeNow, countryCode);
        let signature = _hmacHex(derivedKey.binary, stringToSign);
        let auth = `AWS4-HMAC-SHA256 Credential=${isSandbox?AGCOD_SET.SandboxCredentials.accessKeyId : AGCOD_SET.ProductionCredentials.accessKeyId}/${dateTimeNow.substring(0,8)}/${AGCOD_SET.Region.US}/AGCODService/aws4_request, SignedHeaders=accept;content-type;host;x-amz-date;x-amz-target, Signature=${signature}`;

        debug('PAYLOAD:');
        debug(_stringify(payload));
        debug('');
        debug('HASHED PAYLOAD:');
        debug(_hash(_stringify(payload)));
        debug('');
        debug('CANONICAL REQUEST:');
        debug(canonicalRequest);
        debug('');
        debug('HASHED CANONICAL REQUEST:');
        debug(_hash(canonicalRequest));
        debug('');
        debug('STRING TO SIGN:');
        debug(stringToSign);
        debug('');
        debug('DERIVED SIGNING KEY:');
        debug(derivedKey.hex);
        debug('');
        debug('SIGNATURE:');
        debug(signature);
        debug('');
        debug('ENDPOINT:');
        debug(isSandbox? AGCOD_SET.SandboxHost[countryCode] : AGCOD_SET.ProductionHost[countryCode]);
        debug('');
        debug('SIGNED REQUEST');
        debug(`POST /${AGCOD_SET.OperationPath[operation]} HTTP/1.1`);
        debug('accept:application/json');
        debug('content-type:application/json');
        debug(`host:${isSandbox? AGCOD_SET.SandboxHost[countryCode] : AGCOD_SET.ProductionHost[countryCode]}`);
        debug(`x-amz-date:${dateTimeNow}`);
        debug(`x-amz-target:com.amazonaws.agcod.AGCODService.${AGCOD_SET.Operation[operation]}`);
        debug(`Authorization:${auth}`);
        debug(_stringify(payload));

        let options = {
            method: 'POST',
            url: `https://${isSandbox? AGCOD_SET.SandboxHost[countryCode] : AGCOD_SET.ProductionHost[countryCode]}/${AGCOD_SET.OperationPath[operation]}`,
            headers: {
                "accept": 'application/json',
                "content-type": 'application/json',
                "host": isSandbox? AGCOD_SET.SandboxHost[countryCode] : AGCOD_SET.ProductionHost[countryCode],
                "x-amz-date": dateTimeNow,
                "x-amz-target": `com.amazonaws.agcod.AGCODService.${AGCOD_SET.Operation[operation]}`,
                "Authorization": auth
            },
            body: _stringify(payload)
        };

        request(options, (err, res, body) => {
            if (err) {
                logger.error(`[${operation}][${countryCode}][isSandbox=${isSandbox}] operation params => ${JSON.stringify(operationParams)} error => ${err.stack}`);
                reject(err);
            } else {
                debug(`body => ${JSON.stringify(body, null, 2)}`);
                // logger.info(`[${operation}][${countryCode}][isSandbox=${isSandbox}] operation params => ${JSON.stringify(operationParams)} response => ${JSON.stringify(body)}`);
                resolve(JSON.parse(body));
            }
        });
    });
}

function _genPayload(operation, requestId, countryCode, operationParams) {

    let payload = {};

    requestId = requestId || `${AGCOD_SET.Defs.PARTNER_ID}${Date.now()}`;

    switch (operation) {
        case AGCOD_SET.Operation.ActivateGiftCard: {
            payload.activationRequestId = requestId;
            payload.cardNumber = operationParams.cardNumber;
            payload.partnerId = AGCOD_SET.Defs.PARTNER_ID;
            payload.value = {
                currencyCode: AGCOD_SET.CurrencyCode[countryCode],
                amount: operationParams.amount
            }
        }
            break;

        case AGCOD_SET.Operation.DeactivateGiftCard: {
            payload.activationRequestId = requestId;
            payload.cardNumber = operationParams.cardNumber;
            payload.partnerId = AGCOD_SET.Defs.PARTNER_ID;
        }
            break;

        case AGCOD_SET.Operation.ActivationStatusCheck: {
            payload.cardNumber = operationParams.cardNumber;
            payload.partnerId = AGCOD_SET.Defs.PARTNER_ID;
            payload.statusCheckRequestId = requestId;
        }
            break;

        case AGCOD_SET.Operation.CreateGiftCard: {
            payload.creationRequestId = requestId;
            payload.partnerId = AGCOD_SET.Defs.PARTNER_ID;
            payload.value = {
                currencyCode: AGCOD_SET.CurrencyCode[countryCode],
                amount: operationParams.amount
            }
        }
            break;

        case AGCOD_SET.Operation.CancelGiftCard: {
            payload.creationRequestId = requestId;
            payload.gcId = operationParams.gcId;
            payload.partnerId = AGCOD_SET.Defs.PARTNER_ID;
        }
            break;

        case AGCOD_SET.Operation.GetGiftCardActivityPage: {
            payload.pageIndex = operationParams.pageIndex || 0;
            payload.pageSize = operationParams.pageSize || 1000;
            payload.partnerId = AGCOD_SET.Defs.PARTNER_ID;
            payload.requestId = requestId;
            payload.showNoOps = operationParams.showNoOps || true;
            payload.utcStartDate = operationParams.utcStartDate;
            payload.utcEndDate = operationParams.utcEndDate;
        }
            break;

        default:
            logger.error(`Operation invalid. Operation => ${operation}`);
            break;
    }

    return payload;
}

function _createCanonicalRequest(countryCode, operation, isSandbox, dateTime, payload) {

    return 'POST\n'
        + `/${AGCOD_SET.OperationPath[operation]}\n`
        + `\n` // CanonicalQueryString is nil
        + `accept:application/json\n`
        + `content-type:application/json\n`
        + `host:${isSandbox? AGCOD_SET.SandboxHost[countryCode] : AGCOD_SET.ProductionHost[countryCode]}\n`
        + `x-amz-date:${dateTime}\n`
        + `x-amz-target:com.amazonaws.agcod.AGCODService.${operation}\n`
        + `\n`
        + `accept;content-type;host;x-amz-date;x-amz-target\n`
        + `${_hash(_stringify(payload))}`;
}

function _createStringToSign(hashedCanonicalRequest, dateTime, countryCode) {
    return `AWS4-HMAC-SHA256\n`
        + `${dateTime}\n`
        + `${dateTime.substring(0, 8)}/${AGCOD_SET.Region[countryCode]}/AGCODService/aws4_request\n`
        + `${hashedCanonicalRequest}`;
}

function _calculateDerivedKey(isSandBox, dateTime, countryCode) {
    let secretKey = isSandBox? AGCOD_SET.SandboxCredentials.secretAccessKey : AGCOD_SET.ProductionCredentials.secretAccessKey;
    let kDate = _hmacBinary(`AWS4${secretKey}`, dateTime.substring(0, 8));
    let kRegion = _hmacBinary(kDate, AGCOD_SET.Region[countryCode]);
    let kService = _hmacBinary(kRegion, 'AGCODService');
    return {
        hex: _hmacHex(kService, 'aws4_request'),
        binary: _hmacBinary(kService, 'aws4_request')
    };
}

function _stringify(json) {
    return JSON.stringify(json).replace(/,/g, ', ').replace(/:/g, ': ');
}

function _hash(sourceString) {
    return crypto.createHash('sha256').update(sourceString).digest('hex');
}

function _hmacBinary(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function _hmacHex(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function _getFormmatedDateNow() {
    return new Date().toISOString().replace(/\.[0-9]{3}/g, '').replace(/:/g, '').replace(/-/g, '');
}

function _sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time);
    })
}

/* =========================== Main Start ========================== */
if (typeof require !== 'undefined' && require.main === module) {
    // this.createGiftCard('US', 0.01, true)
    //     .then(createGiftCardResponse => {
    //         console.log('Create Response => ');
    //         console.log(JSON.stringify(createGiftCardResponse, null, 2));
    //         return this.cancelGiftCard(createGiftCardResponse.creationRequestId, 'US', true, createGiftCardResponse.gcId);
    //     })
    //     .then(cancelGiftCardResponse => {
    //         console.log('Cancel Response => ');
    //         console.log(JSON.stringify(cancelGiftCardResponse, null, 2));
    //     })
    //     .catch(err => {
    //         console.log(`error => ${err.stack}`);
    //     });

    // this.cancelGiftCard('Wztc11505382873428', 'US', false, 'A19F7N8NTBYBNR');
    let fs = require('fs');
    this.getAllGiftCardActivities('US', true, '2017-10-26T00:00:00Z', '2017-10-28T00:00:00Z')
        .then(result => {
            fs.writeFile('./getAllGiftCardActivities.json', JSON.stringify(result, null, 2), err => {
                if (err) {
                    console.error('write file error');
                } else {
                    console.log('write file success');
                }
            });
        })
        .catch(err => {
            console.error(`error => ${err.stack}`);
        })
}
/* =========================== Main End ========================== */

