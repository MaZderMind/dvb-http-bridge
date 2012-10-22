
/**
 * Module dependencies.
 */

console.log('loading modules');
var express = require('express'),
	expresshelpers = require('express-helpers');
	routes = require('./routes'),
	channels = require('./routes/channels'),
	http = require('http'),
	path = require('path'),
	async = require('async');

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(require('less-middleware')({ src: __dirname + '/public' }));
	app.use(express.static(path.join(__dirname, 'public')));

	expresshelpers(app);
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/channels', channels.list);

// run init tasks 
async.parallel([

	channels.load,

], function(err) {
	if(err)
		return console.error('error during init phase:', err);

	console.log('listening');
	app.listen(app.get('port'));
})
