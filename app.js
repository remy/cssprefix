
/**
 * Module dependencies.
 */

var express = require('express'),
    md = require('node-markdown').Markdown,
    Prefix = require('./prefix'),
    fs = require('fs');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
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

app.get('/:url', function (req, res) {
  console.log('doing the CSS thing');
  new Prefix(req.params.url, function (css) {
    res.writeHead(200, { 'content-type': 'text/css' });
    res.end(css);
  });  
});

app.listen(process.env.PORT || 8000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
