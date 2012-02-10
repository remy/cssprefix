var CSSLint = require("csslint").CSSLint,
    http = require('http'),
    URL = require('url'),
    parse = URL.parse,
    resolve = URL.resolve,
    events = require('events'),
    jsdom = require('jsdom'),
    uid = require('connect').utils.uid,
    request = require('request');

/**
 * TODO:
 * - listen for process messages (if not required?)
 * - get the url passed
 * - progress the DOM and pull all the CSS out
 * - run individual CSS files through CSSLint with 'compatible-vendor-prefixes'
 * - process all errors running each CSS rule through prefix library*
 * - create temp directory and save zip file of all updated files
 * - trigger event back to parent process to notify job is complete
 **/

function Prefix(url, complete) {
  var self = this,
      dirty = false;

  // inherit EventEmitter so that we can send events with progress
  events.EventEmitter.call(this);

  // re-using a lot of code from https://github.com/remy/inliner

  if (url.indexOf('http') === -1) {
    url = 'http://' + url;
  }

  request(url, function (error, response, body) {
    if (error || response.statusCode != 200) {
      // do something more than return!
      console.error(error);
      return;
    }

    var html = body.toString(),
        rawcss = '';

    // workaround for https://github.com/tmpvar/jsdom/issues/172
    // need to remove empty script tags as it casues jsdom to skip the env callback
    html = html.replace(/<\script(:? type=['"|].*?['"|])><\/script>/ig, '');


    // BIG ASS PROTECTIVE TRY/CATCH - mostly because of this: https://github.com/tmpvar/jsdom/issues/319
    try { 
      jsdom.env(html, '', [
        'http://code.jquery.com/jquery.min.js'
      ], function(errors, window) {
        var $  = window.$;
        var links = $('link[rel="stylesheet"]'),
            styles = $('style'),
            inlinestyles = $('[style^=""]');

        self.messages = [];
        self.todo = links.length + styles.length + inlinestyles.length + 1;
        self.done = function() {
          self.todo--;

          if (self.todo <= 0) {
            // console.log('all done');
            self.messages.forEach(function (message) {
              if (message.rule.id !== 'compatible-vendor-prefixes') {
                // console.log(message);
              }
            });
            process.emit('end');

            if (complete) {
              complete(rawcss);
            } else {
              console.log(rawcss);
            }
          }
        };
        self.lint = function (css) {
          // css = css.replace(/\r/g, '\n');
          var lint = CSSLint.verify(css, { 'compatible-vendor-prefixes': 1 }); //, 'gradients': 1 }); //, 'vendor-prefix': 1 });

          if (!dirty) {
            lint.messages.forEach(function (message) {
              if (message.rule.id == 'compatible-vendor-prefixes') {
                // this tells the parent process to show a fail or success whilst we continue with the processing
                process.emit('dirty');
                dirty = true;
              }
            });
          }

          self.messages = self.messages.concat(lint.messages);
          return lint;
        }

        styles.length && styles.each(function (i) {
          // process inner CSS
          var lint = self.lint(this.innerHTML);
          css = retrofit(this.innerHTML, lint);

          if (css) {
            rawcss += '/* style:' + i + ' */\n';
            rawcss += css + '\n\n';            
          }
          // then process @imports so we can capture individual filename
          // self.getImportCSS(url, style.innerHTML, function (css) {
            
          // });
          
          self.done();
        });

        links.length && links.each(function () {
          var href = this.href;
          request(resolve(url, this.href), function (error, response, css) {
            if (error || response.statusCode != 200) {
              console.error(error);
              return self.done();
            }

            var lint = self.lint(css);
            css = retrofit(css, lint);
            if (css) {
              rawcss += '/* link[href="' + href + '"] */\n';
              rawcss += css + '\n\n';              
            }

            self.done();
          });
          
        });

        inlinestyles.length && inlinestyles.each(function () {
          var style = this.getAttribute('style'),
              nodeName = this.nodeName, 
              css = nodeName + ' { ' + style + ' } ',
              lint = self.lint(css);

          css = retrofit(css, lint);
          if (css) {
            rawcss += '/* ' + nodeName + '[style="' + style + '"] */\n';
            rawcss += css + '\n\n';            
          }

          self.done();
        });

        self.done();
      });
    } catch (e) {
      console.log('failed');
    }
  });
     
}

// not ready yet
Prefix.prototype.getImportCSS = function (rooturl, css, callback) {
  // if (typeof css == 'function') {
  //   callback = css;
  //   rooturl = '';
  // }
  
  var position = css.indexOf('@import'),
      self = this;

  if (position !== -1) {
    var match = ( css.match(/@import\s*(.*)/) || [, ''] )[1];
    
    if (match) {
      self.todo++;
      var url = match.replace(/url/, '').replace(/['}"]/g, '').replace(/;/, '').trim().split(' '); // clean up
      // if url has a length > 1, then we have media types to target
      var resolvedURL = URL.resolve(rooturl, url[0]);
      request(resolvedURL, function (error, response, importedCSS) {
        if (error) {
          console.error(error);
          return;
        }

        if (url.length > 1) {
          url.shift();
          importedCSS = '@media ' + url.join(' ') + '{' + importedCSS + '}';
        }
        
        css = css.replace(match, importedCSS);
        self.getImportCSS(rooturl, css, callback);
      });          
    }
  } else {
    callback(css, rooturl);
  }
};

/*
{ type: 'warning',
  line: 77,
  col: 1,
  message: 'The property -ms-transition is compatible with -webkit-transition, -moz-transition, -o-transition and should be included as well.',
  evidence: '#footer { position: fixed; bottom: 0; left: 0; right: 0; height: 34px; background-color: #9E9E9E; color: #9E9F9E; color: rgba(158, 158, 158, 0.5); width: 100%; color: #fff;  text-shadow: 1px 1px 0 #000; line-height: 24px; border-top: 1px solid #CED1CE; -webkit-transition: background-color ease-out 100ms; -moz-transition: background-color ease-out 100ms; -o-transition: background-color ease-out 100ms; transition: background-color ease-out 100ms; }',
  rule: 
   { id: 'compatible-vendor-prefixes',
     name: 'Require compatible vendor prefixes',
     desc: 'Include all compatible vendor prefixes to reach a wider range of users.',
     browsers: 'All',
     init: [Function] } }
*/

function retrofit(css, lint) {

  var csslines = css.split('\n'),
      dirty = false;

  lint.messages.forEach(function (message) {
    if (message.rule.id == 'compatible-vendor-prefixes') {
      dirty = true;
      var props = { missing: '', found: '' };
      message.message.replace(/The property \-(.*?) is compatible with \-(.*?)\s/g, function (m, missing, found) {
        if (found.substr(-1) == ',') {
          found = found.substring(0, found.length -1);
        }
        props.missing = '-' + missing;
        props.found = '-' + found;
      });

      // start looking for the matching rule - we know it's in there
      for (var i = message.line-1; i < csslines.length; i++) {
        var cssPropRE = new RegExp(props.found + '\s*:\s*(.*?)\s*[;}]');
        if (cssPropRE.test(csslines[i])) {
          var css = csslines[i].replace(cssPropRE, function (all, cssvalue) {
            console.log('adding ' + props.missing + ' to ' + csslines[i]);
            return all + props.missing + ':' + cssvalue + ';';
          });
          csslines[i] = css;
          break;
        }        
      }
    }
  });

  return dirty ? csslines.join('\n') : null;
}

if (!module.parent) {
  new Prefix(process.argv[2] || 'http://remysharp.com');
} else {
  module.exports = Prefix;
}








