var
	net = require('net'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	iconv = require('iconv-lite');


var
	dvrDevice = '/dev/dvb/adapter0/dvr0',
	channelFile = 'data/channels.conf';


net.Socket.prototype.write_and_log = function(data)
{
	console.info(data);
	this.write(data+"\n");
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
			activeConnection.write(chunk);
	})

	stream.resume();



	console.log('opening tcp socket on port 5885')
	var socket = net.createServer(function(connection) {
		console.log('connection from '+connection.remoteAddress+':'+connection.remotePort)
		connection.setEncoding('utf8');

		// only accept a single connection
		if(activeConnection)
		{
			console.log('rejecting connection from '+connection.remoteAddress+':'+connection.remotePort+' because of existing connection from '+activeConnection.remoteAddress+':'+activeConnection.remotePort);
			connection.end('rejectiong connection because of existing connection from '+activeConnection.remoteAddress+':'+activeConnection.remotePort);
			return;
		}

		var
			remoteAddress = connection.remoteAddress,
			remotePort = connection.remotePort;
		activeConnection = connection;
		connection.on('close', function() {
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
		connection.on('data', function(data) {
			var
				parts = data.trim().split(' ', 2),
				command = parts[0],
				arg = parts[1];

			if(command == '') return;

			console.log('received command '+command);
			switch(command)
			{
				case 'list':
					connection.write(channels.join("\n")+"\n");
					break;

				case 'quit':
					connection.write_and_log("closing connecion on request");
					connection.end()
					break;


				case 'close':
					if(activeZap)
					{
						connection.write_and_log("going to idle");
						activeZap.on('close', function() {
							activeZap = null;
							connection.write_and_log("now idle");
						})
						activeZap.kill();
					}
					else
					{
						connection.write_and_log("staying idle");
					}
					break;

				case 'zap':
					var
						cmd = 'szap',
						args = ['-r', '-H', '-c', channelFile, arg];

					if(activeZap)
					{
						activeZap.on('close', function() {
							activeZap = spawn(cmd, args);
							connection.write_and_log("zap closed, restarting with new channel "+args);
						})
						activeZap.kill();
					}
					else
					{
						connection.write_and_log("starting zap with new channel "+args);
						activeZap = spawn(cmd, args);
					}
					break;

				default:
					console.warn('unknown command received: '+command);
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
