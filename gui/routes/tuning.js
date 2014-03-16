var
	channels = require(app.path('routes/channels')),
	spawn = require('child_process').spawn;

var isTuned = false,
	currentChannel = null,
	zap = null;

function tuneTo(channel, cb) {
	if(zap) {
		console.log('killing zap');
		zap.kill('SIGHUP');
	}

	console.log('spawning zap');
	zap = spawn('szap', ['-c', app.path('data/channels.conf'), '-rHn', channel]);

//	zap.stdout.on('data', function (data) {
//		console.log('zap stdout: ' + data);
//	});

	zap.stderr.on('data', function (data) {
		console.log('zap stderr: ' + data);
	});

	zap.on('exit', function (code) {
		console.log('zap exited with code ' + code);
	});

	currentChannel = channel;
	isTuned = true;
	cb(true);
};

function tuneOff() {
	if(zap) {
		console.log('killing zap');
		zap.kill('SIGHUP');
	}

	currentChannel = null;
	isTuned = false;
};

function tuneToReq(req, res) {
	var channel = parseInt(req.params.channel);
	var channelInfo = channels.getByIdx(channel);

	if(!channelInfo) {
		console.log('Not tuning to unknown channel', channel);
		tuneOff();
		res.send({
			success: false
		});
	}
	else {
		console.log('Tuning to channel', channel, channelInfo.name);
		tuneTo(channel, function(success) {
			if(success) {
				res.send({
					success: true,

					isTuned: true,
					idx: channelInfo.idx,
					name: channelInfo.name
				});
			}
			else {
				res.send({
					success: false
				});
			}
		});
	}
};

function getStatus() {
	if(isTuned) {
		var channelInfo = channels.getByIdx(currentChannel);

		if(channelInfo) {
			return {
				isTuned: true,
				idx: channelInfo.idx,
				name: channelInfo.name
			}
		}
	}
	
	return {
		isTuned: false
	}
};

function statusReq(req, res) {
	res.send(getStatus());
};

exports.tuneTo = tuneTo;
exports.tuneOff = tuneOff;
exports.getStatus = getStatus;

exports.tuneToReq = tuneToReq;
exports.statusReq = statusReq;
