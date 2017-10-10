/**
 * Created by andy on 2015/9/11.
 */
var AWS = require('aws-sdk');
var uuid = require('node-uuid');

/* Auth Config */
AWS.config.update({
    aws_access_key_id: "andy-aws-account",
    aws_secret_access_key: "andy-aws-account",
    region: "eu-west-1"
})

dyn = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });

/* Create A Table*/
var params = {
    AttributeDefinitions: [ /* required */ {
            AttributeName: 'ID',
            /* required */
            AttributeType: 'S' /* required */
        },
        {
            AttributeName: 'NAME',
            /* required */
            AttributeType: 'S' /* required */
        }
        /* more items */
    ],
    TableName: 'DNMDB',
    /* required */
    KeySchema: [ /* required */ {
            AttributeName: 'ID',
            /* required */
            KeyType: 'HASH' /* required */
        },
        {
            AttributeName: "NAME",
            KeyType: "RANGE"
        }
        /* more items */
    ],
    LocalSecondaryIndexes: [{
            IndexName: 'Index1',
            /* required */
            KeySchema: [ /* required */ {
                    AttributeName: 'ID',
                    /* required */
                    KeyType: 'HASH' /* required */
                },
                {
                    AttributeName: 'NAME',
                    /* required */
                    KeyType: 'RANGE' /* required */
                }
                /* more items */
            ],
            Projection: { /* required */
                NonKeyAttributes: [
                    'ID'
                    /* more items */
                ],
                ProjectionType: 'INCLUDE'
            }
        }
        /* more items */
    ],
    StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: 'NEW_IMAGE'
    },
    ProvisionedThroughput: { /* required */
        ReadCapacityUnits: 1,
        /* required */
        WriteCapacityUnits: 1 /* required */
    },
    GlobalSecondaryIndexes: [{
            IndexName: 'GIND1',
            /* required */
            KeySchema: [ /* required */ {
                    AttributeName: 'ID',
                    /* required */
                    KeyType: 'HASH' /* required */
                },
                /* more items */
            ],
            Projection: { /* required */
                NonKeyAttributes: [
                    'NAME'
                    /* more items */
                ],
                ProjectionType: 'INCLUDE'
            },
            ProvisionedThroughput: { /* required */
                ReadCapacityUnits: 1,
                /* required */
                WriteCapacityUnits: 1 /* required */
            }
        }
        /* more items */
    ]
};
dyn.createTable(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data); // successful response
})

dyn.listTables(function(err, data) {
    console.log('listTables', err, data);
});