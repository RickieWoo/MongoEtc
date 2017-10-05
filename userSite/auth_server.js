var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var mongoStore = require('connect-mongo')({ session: expressSession });
var mongoose = require('mongoose');

/**
 * Module dependencies.
 */



var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');

app.set('view engine', 'html'); // app.set('view engine', 'ejs');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.cookieSession({ secret: 'blog.fens.me' }));

app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    var err = req.session.error;
    delete req.session.error;
    res.locals.message = '';
    if (err) res.locals.message = '<div class="alert alert-error">' + err + '</div>';
    next();
});
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

//basic
app.get('/', routes.index);

app.all('/login', notAuthentication);
app.get('/login', routes.login);
app.post('/login', routes.doLogin);

app.get('/logout', authentication);
app.get('/logout', routes.logout);

app.get('/home', authentication);
app.get('/home', routes.home);


http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});


function authentication(req, res, next) {
    if (!req.session.user) {
        req.session.error = '请先登陆';
        return res.redirect('/login');
    }
    next();
}

function notAuthentication(req, res, next) {
    if (req.session.user) {
        req.session.error = '已登陆';
        return res.redirect('/');
    }
    next();
}
require('./models/users_model');
var conn = mongoose.connect('mongodb://localhost/myapp');
var app = express();
app.engine('.html', require('ejs').__express);
app.set('views', __dirname, './views');
app.set('view engine', 'html');
app.use(bodyParser());
app.use(cookieParser());
app.use(expressSession({
    secret: 'SECRET',
    cookie: { maxAge: 60 * 60 * 1000 },
    store: new mongoStore({
        db: mongoose.connection.db,
        collection: 'session'
    })
}));
require('./routes').app;
app.listen(80);