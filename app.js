
/**
 * Module dependencies.
 */

var express = require('express'),
    md = require('node-markdown').Markdown,
    Prefix = require('./prefix'),
    fs = require('fs'),
    path = require('path'),
    cp = require('child_process');

path.exists(__dirname + '/jobs', function (exists) {
  if (!exists) {
    fs.mkdir(__dirname + '/jobs');
  }
});

path.exists(__dirname + '/public/jobs', function (exists) {
  if (!exists) {
    fs.mkdir(__dirname + '/public/jobs');
  }
});


var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function (req, res) {
  fs.readFile(__dirname + '/README.md', function (e, data) {
    res.render('index', { title: '-css-prefix', content: data.toString(), markdown: md });
  });
});

app.get(/favicon.ico|humans.txt/i, function (req, res) {
  res.end();
});

app.get('/check.json', function (req, res) {
  console.log(req.query);
  var prefix = cp.fork(__dirname + '/prefix.js');
  prefix.on('message', function(event) {
    console.log(event);
    if (event.type == 'dirty') {
      res.send({ pass: false, lint: event.lint });
    } else if (event.type == 'end') {
      res.send({ pass: true });
    }
  });

  prefix.send({ type: 'start', url: req.query.url, dirtyExit: true });
});

app.get(/\/(.*)?/, function (req, res) {
  console.log(req.headers);
  var prefix = cp.fork(__dirname + '/prefix.js');

  prefix.on('message', function(event) {
    console.log(event);
    if (event.type == 'end') {
      res.send('<a href="/jobs/' + event.job + '.zip">' + event.job + '.zip</a>');
    }
    // res.writeHead(200, { 'content-type': 'text/css' });
    // res.end('');    
  });

  prefix.send({ type: 'start', url: req.params[0] });
});

app.listen(process.env.PORT || 8000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
