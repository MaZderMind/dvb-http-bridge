
/*
 * GET channels listing.
 */

var
	fs = require('fs'),
	iconv = require('iconv-lite'),
	channels = [],
	channelNames = {};


function load(cb){
	console.log('loading channels list');
	fs.readFile(app.path('data/channels.conf'), function(err, data) {
		if (err) throw err;

		var n = 0;
		iconv.decode(data, 'ISO-8859-1').split("\n").forEach(function(line) {
			if(line.length == 0) return;

			line = line.split(':');
			channels.push({idx: ++n, name: line[0]});
		});

		var validRe = /^[a-z0-9]/i;
		channels = channels.filter(function(n) {
			return validRe.test(n.name);
		});

		channels.sort(function(a, b) {
			var
				an = a.name.toLowerCase();
				bn = b.name.toLowerCase();
			
			if(an < bn) return -1;
			else if(an > bn) return 1;
			else return 0;
		});

		console.log('loaded', channels.length, 'channels')
		cb();
	});
};

function getList() {
	return channels;
};

function getByIdx(idx) {
	for (var i = channels.length - 1; i >= 0; i--) {
		if(channels[i].idx == idx)
			return channels[i];
	};

	return false;
};

function listReq(req, res){
	res.send(getList());
};

exports.load = load;
exports.getList = getList;
exports.getByIdx = getByIdx;
exports.listReq = listReq;
