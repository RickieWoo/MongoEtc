/**
 * Created by Ruozi on 11/21/17.
 */

'use strict';

let AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
let credentials = new AWS.SharedIniFileCredentials();
AWS.config.credentials = credentials;
let onlineTable = new AWS.DynamoDB.DocumentClient();

function queryOrdersByStatus() {

    let params = {
        TableName: 'gift_order_record_dev',
        KeyConditionExpression: "#type_status_filter = :type_status_filter",
        ExpressionAttributeNames:{
            "#type_status_filter": 'type_status_filter'
        },
        ExpressionAttributeValues: {
            ":type_status_filter": 'redeem_ongoing'
        },
        IndexName: 'type_status-index',
        ExclusiveStartKey: {
            "type_status_filter": "redeem_ongoing",
            "user_id": "BowHero_J8XTV4BnAr",
            "timestamp": 1511625385104
        },
        Limit: 5,
        Select: 'COUNT'
    };

    onlineTable.query(params).promise()
        .then(data => {
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`query order dev table error => ${err.stack}`);
        });
}

queryOrdersByStatus();


