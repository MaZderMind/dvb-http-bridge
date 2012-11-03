
/*
 * GET channels listing.
 */

var
	fs = require('fs'),
	iconv = require('iconv-lite'),
	favs = [];


exports.load = function(cb){
	console.log('loading favs list');
	fs.readFile(app.path('data/favs.json'), function(err, data) {
		if (err) throw err;

		favs = JSON.parse(data);

		console.log('loaded', favs.length, 'favs')
		cb();
	});
};

exports.getList = function() {
	return favs;
};

exports.listReq = function(req, res){
	res.send(this.getList());
};
