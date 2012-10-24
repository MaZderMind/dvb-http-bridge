
/*
 * GET channels listing.
 */

var
	fs = require('fs'),
	iconv = require('iconv-lite'),
	channels = [];


exports.load = function(cb){
	console.log('loading channels list');
	fs.readFile(app.path('data/channels.conf'), function(err, data) {
		if (err) throw err;

		var n = 0;
		iconv.decode(data, 'ISO-8859-1').split("\n").forEach(function(line) {
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
