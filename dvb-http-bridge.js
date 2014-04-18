var
	http = require('http'),
	url = require('url'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	iconv = require('iconv-lite'),
	async = require('async'),
	nodestatic = require('node-static'),
	fileserver = new nodestatic.Server('./public'),
	dvrDevice = '/dev/dvb/adapter0/dvr0',
	channelFile = 'data/channels.conf',
	traffic = 0;



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

	var active = null;

	function killProcesses(killedCb) {
		async.series([
			function(cb) {
				if(!active || !active.remux)
					return cb();

				console.log("closing remux");
				//activeRemux.on('close', function() {
				//	console.log("remux closed");
				//	activeRemux = null;
				//	cb();
				//})
				active.remux.kill('SIGKILL');
				active.remux = null;
				cb();
			},
			function(cb) {
				if(!active || !active.zap)
					return cb();

				console.log("closing zap");
				active.zap.on('close', function() {
					console.log("zap closed");
					active.zap = null;
					cb();
				})
				active.zap.kill();
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
		if(purl.pathname == '/help')
		{
			return response.endPlaintext(
				"/channels -> returns a list of available channel names\n"+
				"/status -> returns current system status. # indicates idle, : indicates tuned-in into channel\n"+
				"/zap/<channel> -> tunes into the specified channel and returns its stream-data. <channel> can either be a channel name or its line-number"
			);
		}

		// handle /channels requests
		if(purl.pathname == '/channels')
		{
			return response.endPlaintext(channels.join("\n"));
		}

		// handle /channels requests
		if(purl.pathname == '/status')
		{
			if(active)
				return response.endPlaintext(':'+active.channel);

			return response.endPlaintext('#IDLE');
		}

		// handle /channels requests
		if(purl.pathname == '/traffic')
		{
			return response.endPlaintext(Math.round(traffic/1024)+' MiB');
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

			if(active)
				return response.endPlaintextAndLog(400, 'another session is currently active by '+active.connection.request.socket.remoteAddress+':'+active.connection.request.socket.remotePort);

			active = {}

			active.channelidx = channel;
			active.channel = channels[channel-1];
			console.log('tuning into '+channel+' and sending stream to '+remoteAddress+':'+remotePort);

			response.writeHead(200, {'Content-Type': 'video/M2TS' });
			active.connection = {'request': request, 'response': response};

			request.on('close', function() {
				console.log(remoteAddress+':'+remotePort+' closed the connection');
				active.connection = null;

				console.log("going to idle");
				killProcesses(function() {
					console.log("remux & zap closed, now idle");
					active = null;
				});
			});

			killProcesses(function() {
				console.log("remux & zap closed, restarting with new channel "+channel);
				active.remux = spawn('avconv', ['-probesize', 800000, '-fpsprobesize', 800000, '-analyzeduration', 10000000, '-i', dvrDevice, '-c', 'copy', '-f', 'mpegts', '-'], {stdio: ['ignore', 'pipe', process.stderr]});
				active.zap = spawn('szap', ['-c', channelFile, '-rHn', channel], {stdio: 'ignore'});

				active.remux.stdout.on('data', function(chunk) {
					traffic += Math.round(chunk.length / 1024);
					if(active && active.connection)
						active.connection.response.write(chunk);
				});
			});

			return;
		}

		// handle other calls
		request.addListener('end', function () {
			fileserver.serve(request, response);
		}).resume();
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
