
/*
 * GET home page.
 */

var channels = require(app.path('routes/channels'));

exports.index = function(req, res){
	res.render('index', {
		text: 'aa<bb>cc',
		channels: channels.get()
	});
};