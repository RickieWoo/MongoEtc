/**
 * Created by feix on 2017/3/21.
 */

let AWS = require('aws-sdk');
let config = require('config');

if (process.env.NODE_ENV === 'local_dev') {
    AWS.config.loadFromPath('./config/' + config.AWSConfigFile);
} else {
    AWS.config.update({region:'us-east-1'});
}

module.exports = AWS;
