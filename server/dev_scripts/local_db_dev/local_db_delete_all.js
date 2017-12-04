let AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws_local.json');
let dynamodb = new AWS.DynamoDB();

/* ================================= Operation Here ======================================*/

listAllTables()
    .then(tables => {
        tables.forEach(tableName => {
            deleteTable(tableName);
        });
    })
    .catch(err => {
        console.log(`list all tables error => ${err.stack}`);
    });

/* ================================ I'm Cutting Line =====================================*/

function listAllTables() {
    return new Promise((resolve, reject) => {
        dynamodb.listTables({}).promise()
            .then(tableData => {
                resolve(tableData.TableNames);
            })
            .catch(err => {
                reject(err);
            })
    });
}

function deleteTable(tableName) {
    let param = {
        TableName: tableName,
    };

    dynamodb.deleteTable(param).promise()
        .then(data => {
            console.log(`delete table [${tableName}] success !`);
        })
        .catch(err => {
            console.log(`delete table [${tableName}] error => ${err.stack}`);
        })
}
