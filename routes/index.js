
/*
 * GET home page.
 */

var channels = require('./channels');

exports.index = function(req, res){
	res.render('index', {
		text: 'aa<bb>cc',
		channels: channels.get()
	});
};