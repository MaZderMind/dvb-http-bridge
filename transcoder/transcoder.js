var
	http = require('http'),
	url = require('url'),
	fs = require('fs'),
	path = require('path'),
	spawn = require('child_process').spawn;

var
	receiverBaseUrl = 'http://fluxbox:5885',
	streamFolder = './stream/';

http.ServerResponse.prototype.endPlaintextAndLog = function(code, msg) {
	console[code == 200 ? 'info' : 'warn'](msg);

	msg += "\n";
	this.writeHead(code, {'Content-Length': Buffer.byteLength(msg, 'utf8'), 'Content-Type': 'text/plain; charset=utf-8' });
	this.end(msg, 'utf-8');
}

http.ServerResponse.prototype.endPlaintext = function(msg) {
	msg += "\n";
	this.writeHead(200, {'Content-Length': Buffer.byteLength(msg, 'utf8'), 'Content-Type': 'text/plain; charset=utf-8' });
	this.end(msg, 'utf-8');
}

var
	activeAvconv = null,
	activeRequest = null,
	cmd = 'avconv',
	args = ['-i', '-', '-filter:v', 'yadif', '-vcodec', 'h264', '-acodec', 'mp3', '-hls_time', '10', '-hls_wrap', 360, '-hls_list_size', 360, path.join(streamFolder, 'stream.m3u8')];

console.log('opening http server on port 6996')
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
			"/zap/<channel> -> tunes into the specified channel. <channel> can either be a channel name or its line-number. with this call the validity of the stream-url ends. the call returns, as soon as the stream-url is valid again\n"+
			"/zapoff -> turns the tuner off\n"+
			"/stream/stream.m3u8 -> a h264/mp3 hls stream for your iPhone/iPad"
		);
	}

	// handle /channels requests
	if(purl.pathname == '/channels')
	{
		console.log('forward '+purl.pathname+'-request to receiver')
		return http.get(receiverBaseUrl+'/channels', function(getresponse) {
			response.writeHead(getresponse.statusCode, getresponse.headers);
			getresponse.pipe(response);
		}).on('error', function(e) {
			response.endPlaintextAndLog("faild forwarding request: " + e.message);
		});
	}

	function killAvconv(cb)
	{
		if(activeRequest)
		{
			console.log('closing receiver connection');
			activeRequest.abort();
			activeRequest = null
		}

		if(activeAvconv)
		{
			activeAvconv.on('close', function() {
				console.log("avconv closed");
				if(cb) cb();
			})

			console.log('closing avconv');
			activeAvconv.kill();
			activeAvconv = null;
		}
		else if(cb) cb();
	}

	// handle /channels requests
	if(purl.pathname == '/zapoff')
	{
		return killAvconv(function() {
			response.endPlaintextAndLog(200, "stream offline");
		});
	}

	request.on('close', function() {
		killAvconv();
	});

	// handle /zap/ZDF-like requests
	var match = purl.pathname.match(/^\/zap\/(.+)/);
	if(match)
	{
		return killAvconv(function() {
			console.log('clearing stream')
			try {
				fs.mkdirSync(streamFolder);
			}
			catch(e) {}

			var files = fs.readdirSync(streamFolder);
			files.forEach(function(file) {
				if(file.match(/^stream/))
					fs.unlinkSync(path.join(streamFolder, file));
			});

			console.log('starting avconv')
			activeAvconv = spawn(cmd, args, {stdio: ['pipe', process.stdout, process.stderr]})

			console.log('forward '+purl.pathname+'-request to receiver')
			activeRequest = http.get(receiverBaseUrl+match[0], function(getresponse) {

				if(getresponse.statusCode != 200)
				{
					activeRequest = null;
					killAvconv();
					response.writeHead(getresponse.statusCode, {'Content-Type': 'text/plain; charset=utf-8' });
					return getresponse.pipe(response);
				}

				getresponse.pipe(activeAvconv.stdin);
				getresponse.on('error', function(e) {
					console.log('error in receiver-transmission: '+e)
					activeRequest = null
				});

				// now wait for the stream.m3u8-file to occur
				function checkForM3U8() {
					fs.stat(path.join(streamFolder, 'stream.m3u8'), function(err, stats) {
						if(err)
						{
							setTimeout(checkForM3U8, 500)
						}
						else
						{
							response.endPlaintextAndLog(200, 'stream ready');
						}
					});
				}
				setTimeout(checkForM3U8, 500)

			}).on('error', function(e) {
				response.endPlaintextAndLog("faild forwarding request: " + e.message);
				activeRequest = null
			});

			return;
		});
	}


	// handle other calls
	response.endPlaintextAndLog(400, "unhandled request")
});
socket.listen(6996);
