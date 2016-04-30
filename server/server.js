'use strict';
var http = require('http');
var path = require('path');
var express = require('express');
var morgan = require('morgan')
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var mongoose = require('mongoose');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var passport = require('passport');
var TwitterStrategy = require("passport-twitter").Strategy;
var flash = require('connect-flash');
var ejs = require('ejs');

var app = express();


var isDeveloping = process.env.NODE_ENV !== 'production';
//console.log("env",process.env.NODE_ENV, isDeveloping);

if(isDeveloping){
  require('dotenv').config();

  var webpack = require('webpack');
  var webpackConfig =require('../webpack.config.js');
  //import webpack from 'webpack';  
  var webpackMiddleware =require('webpack-dev-middleware');
  var webpackHotMiddleware = require('webpack-hot-middleware');
  var compiler = webpack(webpackConfig);
  
  
  
  app.use(webpackMiddleware(compiler, {
      noInfo: true, 
      publicPath: webpackConfig.output.publicPath,
      stats: {
        colors: true,
      },
      hot: true,
  }));
  app.use(webpackHotMiddleware(compiler, {
    log: console.log,
    path: '/__webpack_hmr',
    heartbeat: 10 * 1000,
  }));
}// end isDeveloping



var config={
  mongo:{
    options:{
      db:{safe:true}
    },
    uri : process.env.MONGO_URI || 'mongodb://localhost/nightreact'
  },
  secret:'supers3cretpassw0rd.dont.tell,any1'
};

/// connect to db
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.connection.on('error', function(err){
  console.error("error connecting to the DB "+ err);
  process.exit(-1);
});

/////////////////
//var viewpath = path.resolve(path.join(__dirname,".."), 'client/view');
//console.log("viewpath",viewpath);
//app.set('views', viewpath);
//app.set('view engine', 'ejs');
//app.set('view engine', 'html');

// middlewares

app.use(flash());
app.use(express.static(path.resolve(path.join(__dirname,".."), 'public'))); // this above session/cookie middlewares prevent create for static files
app.use(favicon(__dirname+'/../public/favicon.ico'));



app.use(session({
  secret: config.secret,
  resave: true,
  saveUninitialized: true,
  store: new mongoStore({mongooseConnection: mongoose.connection, db: 'nightreact'})
}));



//form process
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(methodOverride());

// request logger
app.use(morgan('dev'));



/// passport
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK || "http://127.0.0.1/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, cb) {
      return cb(null, profile);
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());

// middleware to send user info/status
app.use(function(req, res, next) {
  //res.locals.user = req.user;
  res.locals = {
        user: req.user
  };
  res.locals.authenticated = req.isAuthenticated();
  next();
})

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', 
  { failureRedirect: '/',
    failureFlash : true }),
  function(req, res) {
    // Successful authentication, redirect home.
    
    res.redirect('/');
  });
  
app.get('/auth/logout', function(req, res) {
        req.logout();
        res.redirect('/successLogout'); // to let client know is loggedout.. and it should do cleanning
});
    
app.get('/auth/user', isLoggedIn, function(req,res){
  res.json(req.user);
})
////////////////************* end passport


///////////// routes

app.use('/api/bars', require('./api/yelp'));
app.use('/api/places', require('./api/places'));

/*
// all undefined asset or api routes should return 404 (from yeoman code)
app.route('/:url(api|auth|components)/*').get(function(req,res){
  console.log("herer url regex");
  return res.status(404).json({status:404});
});

*/

//all others resources should redirect to the index.html


app.route('*').get(function(req,res){
  res.sendFile(path.resolve(path.join(__dirname, '../public')+'/index.html'));
});


var server = http.createServer(app);

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("server listening at", addr.address + ":" + addr.port);
});




function isLoggedIn(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).send({ error: "Unauthorized, login first." });
/*
  res.status(401);
    return next(new Error("Unauthorized, login first."));
*/
};