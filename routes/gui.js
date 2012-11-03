
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

exports.indexReq = function(req, res) {
	res.render('index', {
		ll: ll,
		channels: channels.getList(),
		favs: favs.getList(),
		tuningStatus: tuning.getStatus(),
	});
};
