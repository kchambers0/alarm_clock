var express = require('express'),
	consolidate = require('consolidate'),
	mustache = require('hogan-express'),  // Using hogan-express in order to support partials.
    favicon = require('serve-favicon'),

	port = 2111,
	root = global.process.env.HOME + '/Node/',
	domain = 'alarm_clock';

// Start up the server instance.
var app = express();

// Set up mustache as the template engine.
app.engine('html', consolidate.mustache);

// Map html files to the app mustache engine (so it looks for '*.html' instead of '*.mustache')
app.set('view engine', 'html');

// Set the default templates folder.
app.set('views', __dirname + '/public/');

var App = {
    init: function(){
        app.use(favicon('../favicon.ico'));

        app.get('/', function(req, res){
            res.render('index');
        });

        app.get('/*.png', function(req, res){
            res.sendfile(__dirname + '/public' + req.url);
        });

        app.get('/:page', function(req, res){
            res.render(req.params.page.replace('.html', ''));
        });

        app.use(express.static(__dirname + '/public/')).listen(process.env.PORT || port);

        // Notify the user that the server is running.
        console.log(domain + ' running on port ' + port + ' at http://localhost:' + port + '/');
    }
};

App.init();
