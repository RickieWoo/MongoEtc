/**
 * Created by Ruozi on 11/21/17.
 */

'use strict';

let AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
let credentials = new AWS.SharedIniFileCredentials();
AWS.config.credentials = credentials;
let onlineTable = new AWS.DynamoDB.DocumentClient();

function deleteErrorOrderItem() {

    let params = {
        TableName: 'gift_order_record_dev',
        KeyConditionExpression: "#status = :status",
        FilterExpression: "#result = :result",
        ExpressionAttributeNames:{
            "#status": 'status',
            "#result": 'result'
        },
        ExpressionAttributeValues: {
            ":status": 'ongoing',
            ":result": 'ok'
        },
        IndexName: 'status-index',
        Limit: 500
    };

    onlineTable.query(params).promise()
        .then(data => {
            console.log(`Found ${data.Items.length} items to delete`);
            data.Items.forEach(item => {
                console.log(`Ready to delete item => ${JSON.stringify(item)}`)
                onlineTable.delete({
                    TableName: 'gift_order_record_dev',
                    Key: {
                        "user_id": item.user_id,
                        "timestamp": item.timestamp
                    }
                }).promise()
                    .then(data => {
                        console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                })
                    .catch(err => {
                        console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));

                    });
            })
        })
        .catch(err => {
            console.log(`query order dev table error => ${err.stack}`);
        });
}

deleteErrorOrderItem();
setInterval(deleteErrorOrderItem, 1000 * 60);


