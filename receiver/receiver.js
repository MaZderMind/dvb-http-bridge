var
	http = require('http'),
	url = require('url'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	iconv = require('iconv-lite');


var
	dvrDevice = '/dev/dvb/adapter0/dvr0',
	channelFile = 'data/channels.conf';

http.ServerResponse.prototype.endPlaintextAndLog = function(code, msg) {
	console[msg == 200 ? 'info' : 'warn'](msg);

	msg += "\n";
	this.writeHead(code, {'Content-Length': Buffer.byteLength(msg, 'utf8'), 'Content-Type': 'text/plain; charset=utf-8' });
	this.end(msg, 'utf-8');
}

http.ServerResponse.prototype.endPlaintext = function(msg) {
	msg += "\n";
	this.writeHead(200, {'Content-Length': Buffer.byteLength(msg, 'utf8'), 'Content-Type': 'text/plain; charset=utf-8' });
	this.end(msg, 'utf-8');
}

console.log('loading channels list');
loadChannelsList(function(channels) {
	console.log('loaded', channels.length, 'channels')

	var activeConnection = null;
	var activeZap = null;

	console.log('opening dvb stream');
	var stream = fs.createReadStream(dvrDevice);

	stream.on('end', function() {
		console.log('dvb stream ended, TODO: Retry?');
	})

	stream.on('error', function(err) {
		console.error('dvb stream ended with error, TODO: Retry?', err);
	})

	stream.on('data', function(chunk) {
		if(activeConnection)
			activeConnection.response.write(chunk);
	})

	stream.resume();



	console.log('opening http server on port 5885')
	var socket = http.createServer(function(request, response) {
		var
			remoteAddress = request.socket.remoteAddress,
			remotePort = request.socket.remotePort,
			purl = url.parse(request.url);

		console.log('request for '+purl.pathname+' from '+remoteAddress+':'+remotePort)

		// handle / requests
		if(purl.pathname == '/')
		{
			return response.endPlaintext(
				"/channels -> returns a list of available channel names\n"+
				"/zap/<channel> -> tunes into the specified channel and returns its stream-data. <channel> can either be a channel name or its line-number"
			);
		}

		// handle /channels requests
		if(purl.pathname == '/channels')
		{
			return response.endPlaintext(channels.join("\n"));
		}

		// handle /zap/ZDF-like requests
		var match = purl.pathname.match(/^\/zap\/(.+)/);
		if(match)
		{
			var channel = match[1];

			if(activeConnection)
				return response.endPlaintextAndLog(400, 'another session is currently active by '+activeConnection.request.socket.remoteAddress+':'+activeConnection.request.socket.remotePort);

			console.log('tuning into '+channel+' and sending stream to '+remoteAddress+':'+remotePort);

			response.writeHead(200, {'Content-Type': 'video/M2TS' });
			activeConnection = {'request': request, 'response': response};

			request.on('close', function() {
				console.log(remoteAddress+':'+remotePort+' closed the connection');
				activeConnection = null;

				if(activeZap)
				{
					console.log("going to idle");
					activeZap.on('close', function() {
						activeZap = null;
						console.log("now idle");
					})
					activeZap.kill();
				}
			});

			var
				cmd = 'szap',
				args = ['-c', channelFile, channel.match(/^[0-9]*$/) ? '-rHn' : '-rH', channel];

			if(activeZap)
			{
				activeZap.on('close', function() {
					console.log("zap closed, restarting with new channel "+channel);
					activeZap = spawn(cmd, args);
				})
				activeZap.kill();
			}
			else
			{
				console.log("starting zap with new channel "+channel);
				activeZap = spawn(cmd, args);
			}

			return;
		}

		// handle other calls
		response.endPlaintextAndLog(400, "unhandled request")
	});
	socket.listen(5885);
})



function loadChannelsList(cb){
	var channels = [];
	fs.readFile(channelFile, function(err, data) {
		if (err) throw err;

		iconv.decode(data, 'ISO-8859-1').split("\n").forEach(function(line) {
			if(line.length == 0) return;

			line = line.split(':');
			channels.push(line[0]);
		});

		cb(channels);
	});
};
