var
	fs = require('fs'),
	path = require('path'),
	iconv = require('iconv-lite'),

	config = require('../config'),
	channels = exports.names = [];

console.log('loading channels-file '+config.channelFile)
fs.readFile(config.channelFile, function(err, data) {
	if (err) throw err;

	iconv.decode(data, 'ISO-8859-1').split("\n").forEach(function(line) {
		if(line.length == 0) return;

		line = line.split(':');
		channels.push(line[0]);
	});

	console.log('loaded '+channels.length+' channels')
});

exports.match = function(channel) {
	if(!channel.match(/^[0-9]*$/))
		channel = channels.indexOf(unescape(channel))+1;

	// check that this is a valid channel index
	if(channel <= 0 || channel >= channels.length)
		return null;

	return channel;
}
