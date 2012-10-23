
/*
 * GET home page.
 */

var channels = require(app.path('routes/channels'));

exports.index = function(req, res){
	res.render('index', {
		str: require(app.path('strings/de')),
		channels: channels.get()
	});
};