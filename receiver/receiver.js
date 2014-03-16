var
	net = require('net'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	iconv = require('iconv-lite');


var
	dvrDevice = '/dev/dvb/adapter0/dvr0',
	channelFile = '../data/channels.conf';


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
			activeConnection.write(chunk);
	})



	console.log('opening tcp socket on port 5885')
	var socket = dgram.createServer(function(connection) {
		console.log('connection from '+connection.remoteAddress+':'+connection.remotePort)
		connection.setEncoding('utf8');

		// only accept a single connection
		if(currentConnection)
		{
			console.log('rejectiong connection from '+connection.remoteAddress+':'+connection.remotePort+' because of existing connection from '+activeConnection.remoteAddress+':'+activeConnection.remotePort);
			connection.end('rejectiong connection because of existing connection from '+activeConnection.remoteAddress+':'+activeConnection.remotePort);
			return;
		}

		currentConnection = connection;
		connection.on('end', function() {
			connection.end(connection.remoteAddress+':'+connection.remotePort+' closed the connection');
			currentConnection = null;
		});
		connection.on('data', function(data) {
			var
				parts = data.split(' ', 2),
				command = parts[0],
				arg = parts[1];

			switch(command)
			{
				case 'list':
					connection.write(channels.join("\n"));
					break;

				case 'close':
					if(activeZap)
					{
						connection.write("going to idle");
						activeZap.on('close', function() {
							activeZap = null;
							connection.write("now idle");
						})
						activeZap.kill();
					}
					else
					{
						connection.write("staying idle");
					}
					break;

				case 'zap':
					var cmd = 'szap -Hc '+channelFile+'"'+arg+'"';
					if(activeZap)
					{
						activeZap.on('close', function() {
							activeZap = spawn(cmd);
							connection.write("zap closed, restarting with new channel");
						})
						activeZap.kill();
					}
					else
					{
						connection.write("starting zap with new channel");
						activeZap = spawn(cmd);
					}
					break;
			}
		});
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

		var validRe = /^[a-z0-9]/i;
		channels = channels.filter(function(n) {
			return validRe.test(n);
		});

		channels = channels.slice(0, 20);
		channels.sort(function(a, b) {
			var
				an = a.toLowerCase();
				bn = b.toLowerCase();
			
			if(an < bn) return -1;
			else if(an > bn) return 1;
			else return 0;
		});

		cb(channels);
	});
};
