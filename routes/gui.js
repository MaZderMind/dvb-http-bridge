
/*
 * GET home page.
 */

var
	ll = require(app.path('strings/de')),
	channels = require(app.path('routes/channels')),
	favs = require(app.path('routes/favs')),
	tuning = require(app.path('routes/tuning'));

function strtpl(template, parameter) {
	for(name in parameter)
		template = template.replace(new RegExp('{'+name+'}', 'g'), parameter[name]);

	return template;
}

ll.template = function(key, parameter) {
	return strtpl(ll[key], parameter);
}

exports.index = function(req, res) {
	res.render('index', {
		ll: ll,
		channels: channels.get(),
		favs: favs.get(),
		tuned: tuning.getStatus(),
	});
};
