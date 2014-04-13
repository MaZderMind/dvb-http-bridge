var
	http = require('http'),
	url = require('url'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	iconv = require('iconv-lite'),
	async = require('async');


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
	var activeZap = null, activeRemux = null;

	function killProcesses(killedCb) {
		async.series([
			function(cb) {
				if(!activeRemux)
					return cb();

				console.log("closing remux");
				//activeRemux.on('close', function() {
				//	console.log("remux closed");
				//	activeRemux = null;
				//	cb();
				//})
				activeRemux.kill('SIGKILL');
				cb();
			},
			function(cb) {
				if(!activeZap)
					return cb();

				console.log("closing zap");
				activeZap.on('close', function() {
					console.log("zap closed");
					activeZap = null;
					cb();
				})
				activeZap.kill();
			}
		], killedCb);
	}

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

			// if channel is not a number, look its index up in the channel-list
			if(!channel.match(/^[0-9]*$/))
				channel = channels.indexOf(unescape(channel))+1;

			// check that this is a valid channel index
			if(channel <= 0 || channel >= channels.length)
				return response.endPlaintextAndLog(400, 'channel '+match[1]+' is no valid channel name/number');

			if(activeConnection)
				return response.endPlaintextAndLog(400, 'another session is currently active by '+activeConnection.request.socket.remoteAddress+':'+activeConnection.request.socket.remotePort);

			console.log('tuning into '+channel+' and sending stream to '+remoteAddress+':'+remotePort);

			response.writeHead(200, {'Content-Type': 'video/M2TS' });
			activeConnection = {'request': request, 'response': response};

			request.on('close', function() {
				console.log(remoteAddress+':'+remotePort+' closed the connection');
				activeConnection = null;

				console.log("going to idle");
				killProcesses(function() {
					console.log("remux & zap closed, now idle");
				});
			});

			killProcesses(function() {
				console.log("remux & zap closed, restarting with new channel "+channel);
				activeRemux = spawn('avconv', ['-probesize', 400000, '-fpsprobesize', 400000, '-analyzeduration', 5000000, '-i', dvrDevice, '-c', 'copy', '-f', 'mpegts', '-'], {stdio: ['ignore', 'pipe', process.stderr]});
				activeZap = spawn('szap', ['-c', channelFile, '-rHn', channel], {stdio: 'ignore'});

				activeRemux.stdout.on('data', function(chunk) {
					if(activeConnection) activeConnection.response.write(chunk);
				});
			});

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
