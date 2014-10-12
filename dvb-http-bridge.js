var
	http = require('http'),
	url = require('url'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	path = require('path'),
	iconv = require('iconv-lite'),
	async = require('async'),
	RRule = require('rrule').RRule,
	upcomingRecordings = [],
	active = null,
	consumers = [],
	nodestatic = require('node-static'),
	fileserver = new nodestatic.Server('./public'),
	dvrDevice = '/dev/dvb/adapter0/dvr0',
	channelFile = 'data/channels.conf',
	recordingsFile = 'data/recordings.json',
	recordingsDir = '/video/',
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
	console.log('loaded '+channels.length+' channels')

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
				"/zap/<channel> -> tunes into the specified channel and returns its stream-data. <channel> can either be a channel name or its line-number\n"+
				"/schedule -> list upcoming recording-events by date\n"+
				"/recordings -> list all recordedings with at least one existing file\n"+
				"/recordings/<recording> -> list files for the specified recordeding"
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
				return response.endPlaintext(':'+channels[active.channel-1]);

			return response.endPlaintext('#IDLE');
		}

		// handle /channels requests
		if(purl.pathname == '/traffic')
		{
			return response.endPlaintext(Math.round(traffic/1024)+' MiB');
		}

		// handle /channels requests
		if(purl.pathname == '/schedule')
		{
			return response.endPlaintext(schedule.getUpcomingEvents(10).join("\n"));
		}

		// handle /channels requests
		if(purl.pathname == '/co-watch')
		{
			if(!active) return response.endPlaintextAndLog(400, 'request for /co-watch without a running session');

			request.on('close', function() {
				consumers.splice(consumers.indexOf(response), 1);
				console.log(remoteAddress+':'+remotePort+' closed the connection, '+consumers.length+' consumers left');

				if(consumers.length == 0) {
					console.log("going to idle");
					killProcesses(function() {
						console.log("remux & zap closed, now idle");
						active = null;
					});
				}
			});

			console.log('adding '+remoteAddress+':'+remotePort+' to the list of consumers');

			response.writeHead(200, {'Content-Type': 'video/M2TS' });
			consumers.push(response);

			console.log('now '+consumers.length+' consumers');

			return;
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
				return response.endPlaintextAndLog(423, 'another session is currently active for '+active.channel+', you may access /co-watch to join that session');

			request.on('close', function() {
				consumers.splice(consumers.indexOf(response), 1);
				console.log(remoteAddress+':'+remotePort+' closed the connection, '+consumers.length+' consumers left');

				if(consumers.length == 0) {
					console.log("going to idle");
					killProcesses(function() {
						console.log("remux & zap closed, now idle");
						active = null;
					});
				}
			});



			console.log('tuning into '+channel+' and adding '+remoteAddress+':'+remotePort+' to the list of consumers');
			zapTo(channel);

			response.writeHead(200, {'Content-Type': 'video/M2TS' });
			consumers.push(response);

			console.log('now '+consumers.length+' consumers');

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
}

loadAndPlanRecordings();
console.log('installing recordings change listener');
var fswatcher = fs.watch(recordingsFile, loadAndPlanRecordings);

var loadAndPlanRecordings__lock = false;
function loadAndPlanRecordings() {
	if(loadAndPlanRecordings__lock) return;
	loadAndPlanRecordings__lock = true;

	if(fswatcher) {
		console.log('reinstalling recordings change listener');
		fswatcher.close();
		fswatcher = fs.watch(recordingsFile, loadAndPlanRecordings);
	}

	if(upcomingRecordings.length > 0)
	{
		console.log('un-planning old recordings');
		upcomingRecordings.forEach(function(recording) {
			if(recording.timeout) {
				clearTimeout(recording.timeout);
			}
		});
		upcomingRecordings = [];
	}

	console.log('loading & planning upcoming recordings');
	fs.readFile(recordingsFile, {encoding: 'utf-8'}, function(err, filecontent) {
		if(err) {
			console.log('error reading recordings-file '+recordingsFile);
			return;
		}

		var now = new Date();

		var inputRecordings = JSON.parse(filecontent);
		console.log('loaded '+inputRecordings.length+' recording-tasks');
		inputRecordings.forEach(function(recording) {
			if(recording.date) {
				var dt = new Date(recording.date);
				console.log('single-date recording: '+recording.name);
				if(!dt || now > dt)
				{
					console.log(' --> in the past');
					return;
				}

				recording.next = dt;
			}
			else if(recording.dates) {
				recording.dates = RRule.fromString(recording.dates);
				console.log('reoccuring recording ['+recording.dates.toText()+']: '+recording.name);

				recording.next = recording.dates.after(now);
			}
			else {
				console.log('recording without date: '+recording.name);
				return;
			}

			if(!recording.next.getTime())
			{
				console.log('recording with invalid date: '+recording.name);
				return;
			}

			var delta_t = recording.next.getTime() - now.getTime();
			console.log(' --> next occurence is '+recording.next);
			console.log(' --> setting timeout to '+delta_t+'ms');
			recording.timeout = setTimeout(function() {
				recordingCallback(recording);
			}, delta_t)

			upcomingRecordings.push(recording);
		})

		loadAndPlanRecordings__lock = false;
	});
}

function recordingCallback(recording) {
	console.log('recordingCallback for '+recording.name);
	console.log('starting recording for '+recording.duration+' minutes');

	var recordingDir = path.join(recordingsDir, recording.name);
	fs.mkdir(recordingDir, function(err) {
		var recordingFile = path.join(recordingDir, (new Date()).toLocaleString()+'.ts');
		var stream = fs.createWriteStream(recordingFile);

		console.log('tuning into '+recording.channel+' and adding file '+recordingFile+' to the consumers');
		zapTo(recording.channel);

		consumers.push(stream);
		console.log('now '+consumers.length+' consumers');


		var delta_t = recording.duration * 60 * 1000;
		console.log(' --> setting end-timeout to '+delta_t+'ms');

		var endtimeout = setTimeout(function() {
			consumers.splice(consumers.indexOf(stream), 1);
			stream.end();
			console.log('recording ended, '+consumers.length+' consumers left');

			if(consumers.length == 0) {
				console.log("going to idle");
				killProcesses(function() {
					console.log("remux & zap closed, now idle");
					active = null;
				});
			}
		}, delta_t)
	});

	loadAndPlanRecordings();
}

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

function zapTo(channel) {
	active = {}

	active.channelidx = channel;

	killProcesses(function() {
		console.log("remux & zap closed, restarting with new channel "+channel);
		active.remux = spawn('avconv', ['-probesize', 800000, '-fpsprobesize', 800000, '-analyzeduration', 10000000, '-i', dvrDevice, '-c', 'copy', '-f', 'mpegts', '-'], {stdio: ['ignore', 'pipe', process.stderr]});
		active.zap = spawn('szap', ['-c', channelFile, '-rHn', channel], {stdio: 'ignore'});

		active.remux.stdout.on('data', function(chunk) {
			traffic += Math.round(chunk.length / 1024);
			consumers.forEach(function(consumer) {
				consumer.write(chunk);
			});
		});
	});
}