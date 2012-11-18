var
	fs = require('fs'),
	tuning = require(app.path('routes/tuning')),
	stream = fs.createReadStream('/dev/dvb/adapter0/dvr0'),

	deadManSeconds = 15,
	tuneOffSeconds = 30;

stream.on('end', function() {
	console.log('dvb stream ended');
})

stream.on('error', function(err) {
	console.error('dvb stream ended with error', err);
})

var
	clientCnt = 0,
	clientOnlineCnt = 0,
	tuneOffTimeout = null;

function streamReq(req, res) {
	var
		clientNum = ++clientCnt,
		full = false,
		disconnected = false,
		fullTimeout = null;

	console.log(clientNum, 'streaming client joined (now', ++clientOnlineCnt, ' clients online)');
	if(tuneOffTimeout) {
		clearTimeout(tuneOffTimeout);
		tuneOffTimeout = null;
	}

	var pipeFn = function(buf) {
		if(!res.write(buf)) {
			if(!full) {
				console.log(clientNum, 'kernel-queue full (waiting '+deadManSeconds+' seconds for network to catch up)');

				fullTimeout = setTimeout(function() {
					console.log(clientNum, 'network too slow, pausing stream until queue is empty again');
					disconnected = true;
					stream.removeListener('data', pipeFn);
				}, deadManSeconds*1000);
			}
			full = true;
		}
	}

	req.on('close', function() {
		console.log(clientNum, 'streaming client left (now', --clientOnlineCnt, ' clients online)');
		stream.removeListener('data', pipeFn);
		clearTimeout(fullTimeout);

		if(clientOnlineCnt == 0) {
			console.log('waiting', tuneOffSeconds, 'seconds for a new client before tuning off');
			tuneOffTimeout = setTimeout(function() {
				console.log('tuning off now');
				tuning.tuneOff();
				tuneOffTimeout = null;
			}, tuneOffSeconds*1000);
		}
	});

	res.on('drain', function() {

		if(full) {
			if(disconnected) {
				console.log(clientNum, 'queue is finally empty, resuming stream');
				stream.addListener('data', pipeFn);
			} else {
				console.log(clientNum, 'network catched up in time');
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
}

exports.streamReq = streamReq;
