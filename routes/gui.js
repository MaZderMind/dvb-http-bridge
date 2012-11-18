
/*
 * GET home page.
 */

var
	uaParser = require('ua-parser'),
	ll = require(app.path('strings/de')),
	channels = require(app.path('routes/channels')),
	favs = require(app.path('routes/favs')),
	tuning = require(app.path('routes/tuning'));

// TODO move to streaming route
var playerUrls = {
	'iOS 6.0': 'oplayer:http://fluxbox:8080/',

	'default': 'http://fluxbox:8080/',
}
/*
function strtpl(template, parameter) {
	for(name in parameter)
		template = template.replace(new RegExp('{'+name+'}', 'g'), parameter[name]);

	return template;
}

ll.template = function(key, parameter) {
	return strtpl(ll[key], parameter);
}
*/

exports.indexReq = function(req, res) {
	var ua = uaParser.parse(req.headers['user-agent']);
	console.log(ua);
	res.render('index', {
		ll: ll,
		channels: channels.getList(),
		favs: favs.getList(),
		tuningStatus: tuning.getStatus(),
		playerUrl: (ua.os in playerUrls) ? playerUrls[ua.os] : playerUrls['default'],
	});
};
