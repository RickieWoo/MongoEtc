var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var AWS = require("aws-sdk");

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })) //将表单数据格式化
    // amazon dynamo db create table using nodejs 
var AWS = require("aws-sdk");
AWS.config.update({
    region: 'us-east-1',
    accessKeyId: 'A',
    secretAccessKey: 'B',
    endpoint: "http://localhost:3006" // 3306 is the port where we started our dynamo db 
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName: "Movies", // name of the table 
    KeySchema: [
        { AttributeName: "year", KeyType: "HASH" }, //Partition key
        { AttributeName: "title", KeyType: "RANGE" } //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "year", AttributeType: "N" }, // N stands for number
        { AttributeName: "title", AttributeType: "S" } // S is a string 
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};


dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. \nTable description JSON:", JSON.stringify(data, null, 2));
    }
});

var docClient = new AWS.DynamoDB.DocumentClient();



// var year = 2015;
// var title = "The Big New Movie";

// var params = {
//     TableName: table,
//     Item: {
//         "year": year,
//         "title": title,
//         "info": {
//             "plot": "Nothing happens at all.",
//             "rating": 0
//         }
//     }
// };
var params = {
    TableName: "Movies",
    Item: {
        "year": movie.year,
        "title": movie.title,
        "info": movie.info
    }
};
console.log("Adding a new item...");
docClient.put(params, function(err, data) {
    if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
    }
});

console.log("Attempting a conditional delete...");
docClient.delete(params, function(err, data) {
    if (err) {
        console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
    }
});

docClient.get(params, function(err, data) {
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
    }
});


console.log("Updating the item...");
docClient.update(params, function(err, data) {
    if (err) {
        console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
    }
});
app.listen(3007);