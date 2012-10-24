var
	http = require('http'),
	fs = require('fs');

var stream = fs.createReadStream('/dev/dvb/adapter0/dvr0');

stream.on('end', function() {
	console.log('dvb stream ended');
})

stream.on('error', function(err) {
	console.error('dvb stream ended with error', err);
})

var n = 0;
http.createServer(function (req, res) {

	var cNum = ++n;
	console.log(cNum, 'client joined');

	var pipeFn = function(buf) {
		if(!res.write(buf)) {
			console.log(cNum, 'slowing down');
		}
	}

	req.on('close', function() {
		console.log(cNum, 'client left');
		stream.removeListener('data', pipeFn);
	});

	req.on('drain', function() {
		console.log(cNum, 'speeding up down');
		stream.addListener('data', pipeFn);
	});

	res.writeHead(200, {'Content-Type': 'video/MP2T'});
	stream.addListener('data', pipeFn);

}).listen(8080, '0.0.0.0');
console.log('listening');
