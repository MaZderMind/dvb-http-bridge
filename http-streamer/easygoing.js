var
	http = require('http'),
	fs = require('fs');

var deadManSeconds = 15;
var stream = fs.createReadStream('/dev/dvb/adapter0/dvr0');

stream.on('end', function() {
	console.log('dvb stream ended');
})

stream.on('error', function(err) {
	console.error('dvb stream ended with error', err);
})

var n = 0;
http.createServer(function (req, res) {

	var
		cNum = ++n,
		full = false,
		disconnected = false,
		fullTimeout = null;

	console.log(cNum, 'client joined');

	var pipeFn = function(buf) {
		if(!res.write(buf)) {
			if(!full) {
				console.log(cNum, 'kernel-queue full (waiting '+deadManSeconds+' seconds for network to catch up)');

				fullTimeout = setTimeout(function() {
					console.log(cNum, 'network too slow, pausing stream until queue is empty again');
					disconnected = true;
					stream.removeListener('data', pipeFn);
				}, deadManSeconds*1000);
			}
			full = true;
		}
	}

	req.on('close', function() {
		console.log(cNum, 'client left');
		stream.removeListener('data', pipeFn);
		clearTimeout(fullTimeout);
	});

	res.on('drain', function() {

		if(full) {
			if(disconnected) {
				console.log(cNum, 'queue is finally empty, resuming stream');
				stream.addListener('data', pipeFn);
			} else {
				console.log(cNum, 'network catched up in time');
			}
		}

		if(fullTimeout)
			clearTimeout(fullTimeout);

		fullTimeout = null;
		disconnected = false;
		full = false;
	});

	res.writeHead(200, {'Content-Type': 'video/MP2T'});
	stream.addListener('data', pipeFn);

}).listen(8080, '0.0.0.0');
console.log('listening');
