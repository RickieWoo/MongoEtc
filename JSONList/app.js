var express = require('express');
var mongojs = require('mongojs');
var bodyParser = require('body-parser');
var app = express();
var db = mongojs('sourceList', ['sourceList']);

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })) //将表单数据格式化

app.get('/sourceList', function(req, res) {
    console.log('I get a req');
    // find everything
    db.sourceList.find(function(err, docs) {
        // docs is an array of all the documents in mycollection
        //console.log(docs);
        res.json(docs);
    });
});
//post data
app.post('/sourceList', function(req, res) {
    console.log(req.body + " eeeeeeeeeeeeeeee");
    db.sourceList.insert(req.body, function(err, docs) {
        res.json(docs);
    });
});
//delete data 
app.delete('/sourceList/:id', function(req, res) {
    var id = req.params.id;
    console.log(id + " app.delete");
    db.sourceList.remove({ _id: mongojs.ObjectId(id) }, function(err, docs) {
        res.json(docs);
    });
});
//edit data
app.get('/sourceList/:id', function(req, res) {
    var id = req.params.id;
    console.log(req.params);
    console.log(id + "--------ed--------------");
    db.sourceList.findOne({ _id: mongojs.ObjectId(id) }, function(err, docs) {
        res.json(docs);
    });
});
//update data
app.put('/sourceList/:id', function(req, res) {
    var id = req.params.id;
    console.log("_____________________---" + req.body.name + id);
    db.sourceList.findAndModify({
        query: { _id: mongojs.ObjectId(id) },
        update: {
            $set: {
                name: req.body.name,
                priority: req.body.priority,
                sourceId: req.body.sourceId,
                country: req.body.country
            }
        },
        new: true
    }, function(err, doc) {
        res.json(doc);
    });

});
app.listen(3000);
console.log("app runs at port:3000 :)");