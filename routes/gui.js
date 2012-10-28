
/*
 * GET home page.
 */

var
	strings = require(app.path('strings/de')),
	channels = require(app.path('routes/channels'));
	favs = require(app.path('routes/favs'));

exports.index = function(req, res){
	res.render('index', {
		str: strings,
		channels: channels.get(),
		favs: favs.get(),
	});
};