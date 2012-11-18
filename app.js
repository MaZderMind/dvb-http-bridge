/**
 * Module dependencies.
 */

console.log('loading modules');
var path = require('path'),
	express = require('express'),
	expressHelpers = require('express-helpers')
	lessMiddleware = require('less-middleware'),
	http = require('http'),
	path = require('path'),
	async = require('async');

console.log('loading app');
var
	apppath = path.dirname(process.mainModule.filename),
	app = global.app = express();

app.path = function(part) {
	return path.join(apppath, part || '');
}

console.log('configuring app');
app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', app.path('views'));
	app.set('view engine', 'ejs');

	app.use(express.favicon(app.path('public/images/favicon.ico')));
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(lessMiddleware({ src: app.path('public') }));
	app.use(express.static(app.path('public')));

	expressHelpers(app);
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

console.log('loading routes');
var
	gui = require(app.path('routes/gui')),
	channels = require(app.path('routes/channels')),
	favs = require(app.path('routes/favs')),
	tuning = require(app.path('routes/tuning')),
	stream = require(app.path('routes/stream'));

app.get('/', gui.indexReq);
app.get('/channels', channels.listReq);
app.get('/favs', favs.listReq);
app.get('/tune/:channel', tuning.tuneToReq);
app.get('/stream/', stream.streamReq);

// run init tasks 
async.parallel([

	channels.load,
	favs.load,

], function(err) {
	if(err)
		return console.error('error during init phase:', err);

	console.log('listening');
	app.listen(app.get('port'));
})
