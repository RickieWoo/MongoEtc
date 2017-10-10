'use strict'
var express = require('express');
var AWS = require("aws-sdk");
var bodyParser = require('body-parser');

// var dynamodb = new AWS.DynamoDB({
//     endpoint: 'http://localhost:8000',
//     region: 'us-east-2',
//     accessKeyId: 'AKIAJMKILRB6JVEBYMVQ',
//     secretAccessKey: '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'
// });

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});
var app = express();
var docClient = new AWS.DynamoDB.DocumentClient();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })) //将表单数据格式化

app.get('/Movies', function(req, res) {
    console.log('I get a req');
    var table = "Movies";
    var params = {
        TableName: table,
    };
    docClient.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("scanItem succeeded:", JSON.stringify(data.Items, null, 2));
            res.json(data.Items);
        }
    });
});
//post data
app.post('/Movies', function(req, res) {
    var table = "Movies";
    var year = req.body.year;
    year = Number(year);
    var title = req.body.title;
    var info = req.body.info;
    var params = {
        TableName: table,
        Item: {
            "year": year,
            "title": title,
            "info": info
        }
    };

    console.log("Adding a new item...");
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
            res.json(data);
        }
    });

});
//delete data 
app.delete('/Movies', function(req, res) {
    var table = "Movies";
    var title = "The Big New Movie";

    console.log(JSON.stringify(req.body.year, null, 2))
    var params = {
        TableName: table,
        Key: {
            "year": 123,
            "title": "s"
        }
    };
    console.log("Attempting a conditional delete...");
    docClient.delete(params, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
        }
    });
});

//update data
app.put('/Movies', function(req, res) {

    var table = "Movies";
    var year = req.body.year;
    year = Number(year);
    var title = req.body.title;
    // Update the item, unconditionally,

    var params = {
        TableName: table,
        Key: {
            "year": year,
            "title": title
        },
        UpdateExpression: "set info = :i",
        ExpressionAttributeValues: {
            ":i": req.body.info
        },
        ReturnValues: "UPDATED_NEW"

    };

    console.log("Updating the item...");
    docClient.update(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            res.json(data);
        }
    });
});
app.get('/Movies', function(req, res) {
    var params = {
        TableName: "Movies",
        KeyConditionExpression: "#yr = :yyyy",
        ExpressionAttributeNames: {
            "#yr": "year"
        },
        ExpressionAttributeValues: {
            ":yyyy": Number(req.body.year)
        }
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            data.Items.forEach(function(item) {
                console.log(" -", item.year + ": " + item.title);
            });
        }
    });
});
app.listen(3003);
console.log("app runs at port:3003 :)");