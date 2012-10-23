
/*
 * GET channels listing.
 */

var
	fs = require('fs'),
	Iconv = require('iconv').Iconv,
	nameConv = new Iconv('ISO-8859-1', 'UTF-8'),
	channels = [];


exports.load = function(cb){
	console.log('loading channels list');
	fs.readFile(app.path('data/channels.conf'), function(err, data) {
		if (err) throw err;

		var n = 0;
		nameConv.convert(data).toString().split("\n").forEach(function(line) {
			if(line.length == 0) return;

			line = line.split(':');
			channels.push({idx: ++n, name: line[0], fav: false});
		});

		console.log('loaded', channels.length, 'channels')
		cb();
	});
};

exports.get = function() {
	return channels;
};

exports.get = function() {
	return channels;
};

exports.list = function(req, res){
	res.send(channels);
};
