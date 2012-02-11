
/**
 * Module dependencies.
 */

var express = require('express'),
    md = require('node-markdown').Markdown,
    fs = require('fs'),
    path = require('path'),
    // cp = require('child_process'),
    zmq = require('zmq'),
    sock = zmq.socket('req');

sock.bindSync('tcp://127.0.0.1:3000');
console.log('Producer bound to port 3000');

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

function urlAsPath(url) {
  return url.toLowerCase().replace(/.*?:\/\//, '').replace(/\//g, '_');
}

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
  var url = Object.keys(req.query)[0];
  
  sock.once('message', function(event) {
    event = JSON.parse(event);
    console.log(event);
    if (event.type == 'dirty') {
      res.send({ pass: false, lint: event.lint });
    } else if (event.type == 'end') {
      res.send({ pass: true });
    }
  });

  sock.send(JSON.stringify({ type: 'start', url: url, dirtyExit: true }));
});

app.get('/check', function (req, res) {
  var url = Object.keys(req.query)[0];

  var job = urlAsPath(url);
  path.exists(__dirname + '/public/jobs/' + job + '.zip', function (exists) {
    var ready = function () {
      res.send('<a href="/jobs/' + job + '.zip">' + job + '.zip</a>');
    };

    if (true || !exists) {
      sock.send(JSON.stringify({ type: 'start', url: url }));
      sock.once('message', function (data) {
        console.log(JSON.parse(data));
        ready();
      });

      // var prefix = cp.fork(__dirname + '/prefix.js');

      // prefix.on('message', function(event) {
      //   // console.log(event);
      //   if (event.type == 'end') {
      //     ready();
      //   }
      //   // res.writeHead(200, { 'content-type': 'text/css' });
      //   // res.end('');    
      // });

      // prefix.send({ type: 'start', url: url });
    } else {
      ready();
    }
  });
});

app.listen(process.env.PORT || 8000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
