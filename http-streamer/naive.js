var
	http = require('http'),
	fs = require('fs');

var stream = fs.createReadStream('/dev/dvb/adapter0/dvr0', {
	
});

stream.on('end', function() {
	console.log('dvb stream ended');
})

stream.on('error', function(err) {
	console.error('dvb stream ended with error', err);
})

var n = 0;
http.createServer(function (req, res) {

	var cNum = ++n, state = 0;
	console.log(cNum, 'client joined');

	var pipeFn = function(buf) {
		if(!res.write(buf)) {
			if(state != 1) console.log(cNum, 'full');
			state = 1;
		}
	}

	req.on('close', function() {
		console.log(cNum, 'client left');
		stream.removeListener('data', pipeFn);
	});

	res.on('drain', function() {
		if(state != -1) console.log(cNum, 'drain');
		state = -1;
	});

	res.writeHead(200, {'Content-Type': 'video/MP2T'});
	stream.addListener('data', pipeFn);

}).listen(8080, '0.0.0.0');
console.log('listening');
