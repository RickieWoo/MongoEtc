let AWS = require('aws-sdk');
let config = require('config');
AWS.config.loadFromPath('./config/aws_local.json');
let table = new AWS.DynamoDB.DocumentClient();

let utils = require('../../utils/utils');

let AWSWEB = require('aws-sdk');
AWSWEB.config.loadFromPath('./config/aws.json');
let webTable = new AWSWEB.DynamoDB.DocumentClient();

/* ================================= Operation Here ======================================*/

let testUserData = require('./test_user.json');
testUserData.auth = JSON.stringify(testUserData.auth);
updateDataToLocalDB('gift_boss_user', testUserData, 'user_name', null);
copyTableFromWebToLocal('gift_inventory_sku_property_dev', 'gift_inventory_sku_property', 'sku', null);
copyTableFromWebToLocal('gift_inventory_dev', 'gift_inventory', 'sku', 'serial');
copyTableFromWebToLocal('gift_boss_record_dev', 'gift_boss_record', 'user_name', 'timestamp');
copyTwoPageTableFromWebToLocal('gift_order_record_dev', 'gift_order_record', 'user_id', 'timestamp');

/* ================================ I'm Cutting Line =====================================*/

function updateDataToLocalDB(tableName, data, hashKey, rangeKey) {
    _updateTableData(tableName, data, hashKey, rangeKey)
        .then(updatedResult => {
            console.log(`Update local db with table [${tableName}] success!`);
        })
        .catch(err => {
            console.log(`Update local db failed => ${err.stack}`);
        })
}

function copyTableFromWebToLocal(webTableName, localTableName, hashKey, rangeKey) {
    webTable.scan({
        TableName: webTableName
    }).promise()
        .then(result => {
            console.info(`${JSON.stringify(result.Items, null, 2)}`);
            _onCopyTableFromWebToLocal(webTableName, localTableName, hashKey, rangeKey, result);
        })
        .catch(err => {
            console.log(`update error with table [${webTableName}]!  ${err.stack}`);
        });
}

function copyTwoPageTableFromWebToLocal(webTableName, localTableName, hashKey, rangeKey) {
    webTable.scan({
        TableName: webTableName
    }).promise()
        .then(result => {
            console.info(`${JSON.stringify(result.Items, null, 2)}`);
            result.Items.forEach(item => {
                _updateTableData(localTableName, item, hashKey, rangeKey)
                    .then(updatedResult => {
                        console.log(`Update local db with table [${webTableName}] success!`);
                    })
                    .catch(err => {
                        console.log(`Update local db with table [${webTableName}] failed => ${err.stack}`);
                    })
            });

            if (result.LastEvaluatedKey !== undefined) {
                webTable.scan({
                    TableName: webTableName,
                    ExclusiveStartKey: result.LastEvaluatedKey
                }).promise()
                    .then(result => {
                        result.Items.forEach(item => {
                            _updateTableData(localTableName, item, hashKey, rangeKey)
                                .then(updatedResult => {
                                    console.log(`Update local db with table [${webTableName}] success!`);
                                })
                                .catch(err => {
                                    console.log(`Update local db with table [${webTableName}] failed => ${err.stack}`);
                                })
                        });
                    })
                    .catch(err => {
                        console.log(`update error with table [${webTableName}]!  ${err.stack}`);
                    });
            }
        })
        .catch(err => {
            console.log(`update error with table [${webTableName}]!  ${err.stack}`);
        });
}

function _onCopyTableFromWebToLocal(webTableName, localTableName, hashKey, rangeKey, result) {
    result.Items.forEach(item => {
        _updateTableData(localTableName, item, hashKey, rangeKey)
            .then(updatedResult => {
                console.log(`Update local db with table [${webTableName}] success!`);
            })
            .catch(err => {
                console.log(`Update local db with table [${webTableName}] failed => ${err.stack}`);
            })
    });

    if (result.LastEvaluatedKey !== undefined) {
        webTable.scan({
            TableName: webTableName,
            ExclusiveStartKey: result.LastEvaluatedKey
        }).promise()
            .then(result => {
                _onCopyTableFromWebToLocal(webTableName, localTableName, hashKey, rangeKey, result);
            })
            .catch(err => {
                console.log(`update error with table [${webTableName}]!  ${err.stack}`);
            });
    }
}

function _updateTableData(tableName, data, hashKey, rangeKey) {

    let params = {
        TableName: tableName,
        Key: {
            [hashKey]: data[hashKey]
        }
    };

    if (!utils.checkEmpty(rangeKey)) {
        params.Key[rangeKey] = data[rangeKey];
    }

    utils.markTimestamp(data);

    let removeFieldList = [];
    for (let [key, value] of Object.entries(data)) {
        if (key !== hashKey && key !== rangeKey) {
            if (!utils.checkEmpty(value, false)) {
                if (!params.UpdateExpression) {
                    params.UpdateExpression = 'set ';
                }
                if (params.ExpressionAttributeNames === undefined) {
                    params.ExpressionAttributeNames = {};
                }
                if (params.ExpressionAttributeValues === undefined) {
                    params.ExpressionAttributeValues = {};
                }
                params.ExpressionAttributeNames[`#${key}`] = key;
                params.UpdateExpression += `#${key} = :${key}, `;
                params.ExpressionAttributeValues[`:${key}`] = value;
            }
            else {
                removeFieldList.push(key);
            }
        }
    }

    // remove空数据项
    if (removeFieldList.length !== 0) {
        if (!params.UpdateExpression) {
            params.UpdateExpression = 'remove ';
        }
        else {
            params.UpdateExpression = params.UpdateExpression.slice(0, -2);
            params.UpdateExpression += ' remove ';
        }

        for (let key of removeFieldList) {
            params.UpdateExpression += `${key}, `;
        }
    }

    // 去掉末尾的', '
    if (params.UpdateExpression) {
        params.UpdateExpression = params.UpdateExpression.slice(0, -2);
    }

    params.ReturnValues = 'ALL_NEW';

    return table.update(params).promise();
}
