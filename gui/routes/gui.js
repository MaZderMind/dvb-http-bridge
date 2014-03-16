/*
 * GET home page.
 */

var
	uaParser = require('ua-parser'),
	ll = require(app.path('strings/de')),
	channels = require(app.path('routes/channels')),
	favs = require(app.path('routes/favs')),
	tuning = require(app.path('routes/tuning'));

// TODO move to streaming route .. or somewhere else
var playerUrls = {
	'iOS 6.0': 'oplayer:http://fluxbox:3000/stream/',
	'default': 'http://fluxbox:3000/stream/',
}

exports.indexReq = function(req, res) {
	var ua = uaParser.parse(req.headers['user-agent']);

	res.render('index', {
		ll: ll,
		channels: channels.getList(),
		favs: favs.getList(),
		tuningStatus: tuning.getStatus(),
		playerUrl: (ua.os in playerUrls) ?
			playerUrls[ua.os] : playerUrls['default'],
	});
}
