
/*
 * GET home page.
 */

var
	ll = require(app.path('strings/de')),
	channels = require(app.path('routes/channels'));
	favs = require(app.path('routes/favs'));

exports.index = function(req, res){
	res.render('index', {
		ll: ll,
		channels: channels.get(),
		favs: favs.get(),
	});
};
