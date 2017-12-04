let express = require('express');
let session = require('cookie-session');
let compression = require('compression');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let index = require('./routes/index');
let config = require('config');

let app = express();
app.use(compression());

// view engine setup
app.set('views', path.join('../web', 'dist'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join('../web', 'dist')));

app.use(session({
    secret: 'j0y4nnl1C2tEmRL1V96tkPnqpqSliyoiV3OAfwPyJVu30C94swJ4nhtqv9GH32oqm5L9TYr4Xm3rGqKoKETKWOp3P882bY8HdMVGeJDxsKWEnt51wF91yc6NWVsQCpfj',
    cookie: {maxAge: 7 * 24 * 60 * 60 * 1000},
    resave: false,
    saveUninitialized: false
}));

let inventory = require('./routes/orders/inventory');
let sku = require('./routes/orders/sku_property');
let bossuser = require('./routes/bossuser/bossuser');
let user = require('./routes/user/user');
let deliveryVIP = require('./routes/orders/delivery_vip');
let deliveryInApp = require('./routes/orders/delivery_in_app');
let mailgun = require('./routes/orders/mailgun_webhook');

app.use('/', index);
app.use('/bossuser', bossuser);
app.use('/user', user);
app.use('/inventory' , inventory);
app.use('/sku' , sku);
app.use('/delivery/vip' , deliveryVIP);
app.use('/delivery/in_app', deliveryInApp);
app.use('/mailgun', mailgun);

app.use('/all_health', (req, res, next) => {
    res.send('health');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.status = err.status || 500;
    res.locals.error = req.app.get('env') === 'production' ? {} : err;

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
