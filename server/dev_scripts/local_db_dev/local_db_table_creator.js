let AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws_local.json');
let dynamodb = new AWS.DynamoDB();

/* ================================= Operation Here ======================================*/

createHashKeyOnlyTableWithIndex('gift_inventory_sku_property', 'sku', 'S', 'category-index', 'category', 'S', 'ALL');
createNormalTableWithRangeIndex('gift_inventory', 'sku', 'S', 'serial', 'S', 'sku-status-index', 'status', 'S', 'ALL');
createHashKeyOnlyTable('gift_boss_user', 'user_name', 'S');
createNormalTableWithHashIndex('gift_boss_record', 'user_name', 'S', 'timestamp', 'N', 'boss_record-timestamp-index', 'boss_record', 'S', "ALL");
createNormalTable('gift_balance', 'user_id', 'S', 'timestamp', 'N');
createNormalTable('gift_statistics', 'event_name', 'S', 'dimension', 'S');
createNormalTableWithRangeIndex('gift_offer_history', 'user_id', 'S', 'timestamp', 'N', 'user_id-offer_id-index', 'offer_id', 'S', 'KEYS_ONLY');
createNormalTableWithRangeIndex('gift_user_friend', 'user_id', 'S', 'friend_user_id', 'S', 'user_id-timestamp-index', 'timestamp', 'N', 'ALL');
createGiftUserTable();
createOrderRecordTable();

/* ================================ I'm Cutting Line =====================================*/

function createNormalTable(tableName, hashKey, hashKeyAttribute, rangeKey, rangeKeyAttribute) {

    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: rangeKey,
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: rangeKey,
                AttributeType: rangeKeyAttribute, // (S | N | B) for string, number, binary
            }

            // ... more attributes ...
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        }
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] error => ${err.stack}`);
        });
}

function createNormalTableWithRangeIndex(tableName, hashKey, hashKeyAttribute, rangeKey, rangeKeyAttribute, indexName, indexRangeAttributeName, indexRangeAttributeType, projectionType) {
    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: rangeKey,
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: rangeKey,
                AttributeType: rangeKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexRangeAttributeName,
                AttributeType: indexRangeAttributeType, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: hashKey,
                        KeyType: 'HASH',
                    },
                    { // Optional RANGE key type for HASH + RANGE secondary indexes
                        AttributeName: indexRangeAttributeName,
                        KeyType: 'RANGE',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });
}

function createNormalTableWithHashIndex(tableName, hashKey, hashKeyAttribute, rangeKey, rangeKeyAttribute, indexName, indexHashAttributeName, indexHashAttributeType, projectionType) {
    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: rangeKey,
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: rangeKey,
                AttributeType: rangeKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexHashAttributeName,
                AttributeType: indexHashAttributeType, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: indexHashAttributeName,
                        KeyType: 'HASH',
                    },
                    { // Optional RANGE key type for HASH + RANGE secondary indexes
                        AttributeName: rangeKey,
                        KeyType: 'RANGE',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });
}


function createNormalTableWithHashKeyOnlyIndex(tableName, hashKey, hashKeyAttribute, rangeKey, rangeKeyAttribute, indexName, indexHashAttributeName, indexHashAttributeType, projectionType) {
    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: rangeKey,
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: rangeKey,
                AttributeType: rangeKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexHashAttributeName,
                AttributeType: indexHashAttributeType, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: indexHashAttributeName,
                        KeyType: 'HASH',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });
}

function createNormalTableWithNormalIndex(tableName, hashKey, hashKeyAttribute, rangeKey, rangeKeyAttribute, indexName, indexHashAttributeName, indexHashAttributeType, indexRangeAttributeName, indexRangeAttributeType, projectionType) {
    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: rangeKey,
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: rangeKey,
                AttributeType: rangeKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexHashAttributeName,
                AttributeType: indexHashAttributeType, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexRangeAttributeName,
                AttributeType: indexRangeAttributeType, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: indexHashAttributeName,
                        KeyType: 'HASH',
                    },
                    { // Optional RANGE key type for HASH + RANGE secondary indexes
                        AttributeName: indexRangeAttributeName,
                        KeyType: 'RANGE',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });
}

function createGiftUserTable() {

    let params = {
        TableName: 'gift_user',
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: 'user_id',
                KeyType: 'HASH',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: 'user_id',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'name',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'invite_code',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: 'name-index',
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: 'name',
                        KeyType: 'HASH',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: 'ALL', // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            },
            {
                IndexName: 'invite_code-index',
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: 'invite_code',
                        KeyType: 'HASH',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: 'KEYS_ONLY', // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [user] with index [unique_name-index] and [invite_code-index] success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [user] with index [unique_name-index] and [invite_code-index] error => ${err.stack}`);
        });
}

function createOrderRecordTable() {

    let params = {
        TableName: 'gift_order_record',
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: 'user_id',
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: 'timestamp',
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: 'user_id',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'timestamp',
                AttributeType: 'N', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'type_status_filter',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'mail_id',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: 'type_status-index',
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: 'type_status_filter',
                        KeyType: 'HASH',
                    },
                    { // Optional RANGE key type for HASH + RANGE secondary indexes
                        AttributeName: 'timestamp',
                        KeyType: 'RANGE',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: 'ALL', // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            },
            {
                IndexName: 'mail_id-index',
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: 'mail_id',
                        KeyType: 'HASH',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: 'ALL', // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [gift_order_record] success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [gift_order_record] error => ${err.stack}`);
        });
}

function createIAPRecordTable() {

    let params = {
        TableName: 'gift_iap_record',
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: 'user_id',
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: 'transaction_id',
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: 'user_id',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'transaction_id',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'client_name',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'timestamp',
                AttributeType: 'N', // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: 'client_name-timestamp-index',
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: 'client_name',
                        KeyType: 'HASH',
                    },
                    { // Optional RANGE key type for HASH + RANGE tables
                        AttributeName: 'timestamp',
                        KeyType: 'RANGE',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: 'ALL', // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [user] with index [unique_name-index] and [invite_code-index] success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [user] with index [unique_name-index] and [invite_code-index] error => ${err.stack}`);
        });
}

function createIfunUserTable() {

    let params = {
        TableName: 'ifun_users',
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: 'user_id',
                KeyType: 'HASH',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: 'user_id',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            },
            {
                AttributeName: 'name',
                AttributeType: 'S', // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: 'unique_name-index',
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: 'name',
                        KeyType: 'HASH',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: 'KEYS_ONLY', // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [ifun_users] with index [unique_name-index] success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [ifun_users] with index [unique_name-index] error => ${err.stack}`);
        });
}

function createHashKeyOnlyTable(tableName, hashKey, hashKeyAttribute) {

    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        }
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] error => ${err.stack}`);
        });
}

function createHashKeyOnlyTableWithIndex(tableName, hashKey, hashKeyAttribute, indexName, indexHashKey, indexHashKeyAttribute, projectionType) {

    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexHashKey,
                AttributeType: indexHashKeyAttribute, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: indexHashKey,
                        KeyType: 'HASH',
                    },
                    { // Optional RANGE key type for HASH + RANGE secondary indexes
                        AttributeName: hashKey,
                        KeyType: 'RANGE',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });

}

function createGiftSelfPromotionDeviceInfo(tableName, hashKey, hashKeyAttribute, indexName, indexHashKey, indexHashKeyAttribute, projectionType) {

    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexHashKey,
                AttributeType: indexHashKeyAttribute, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: indexHashKey,
                        KeyType: 'HASH',
                    },
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });

}

function createGiftSelfPromotion(tableName, hashKey, hashKeyAttribute, rangeKey, rangeKeyAttribute, indexName, indexRangeAttributeName, indexRangeAttributeType, projectionType) {
    let params = {
        TableName: tableName,
        KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
            { // Required HASH type attribute
                AttributeName: hashKey,
                KeyType: 'HASH',
            },
            { // Optional RANGE key type for HASH + RANGE tables
                AttributeName: rangeKey,
                KeyType: 'RANGE',
            }
        ],
        AttributeDefinitions: [ // The names and types of all primary and index key attributes only
            {
                AttributeName: hashKey,
                AttributeType: hashKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: rangeKey,
                AttributeType: rangeKeyAttribute, // (S | N | B) for string, number, binary
            },
            {
                AttributeName: indexRangeAttributeName,
                AttributeType: indexRangeAttributeType, // (S | N | B) for string, number, binary
            }
        ],
        ProvisionedThroughput: { // required provisioned throughput for the table
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
        GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
            {
                IndexName: indexName,
                KeySchema: [
                    { // Required HASH type attribute
                        AttributeName: indexRangeAttributeName,
                        KeyType: 'HASH',
                    }
                ],
                Projection: { // attributes to project into the index
                    ProjectionType: projectionType, // (ALL | KEYS_ONLY | INCLUDE)
                },
                ProvisionedThroughput: { // throughput to provision to the index
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            }
        ]
    };

    dynamodb.createTable(params).promise()
        .then(data => {
            console.log(`create table [${tableName}] with index [${indexName}]success!`);
            console.log(`data => ${JSON.stringify(data, null, 2)}`);
        })
        .catch(err => {
            console.log(`create table [${tableName}] with index [${indexName}] error => ${err.stack}`);
        });
}

