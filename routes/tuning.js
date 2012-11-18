var channels = require(app.path('routes/channels'));

var isTuned = false,
	currentChannel;

function tuneTo(channel) {
	var channelInfo = channels.getByIdx(channel);
	if(channelInfo) {
		console.log('Tuning to channel',
			channelInfo.idx, channelInfo.name);

		currentChannel = channel;
		isTuned = true;

		return true;
	}
	else {
		console.log('Unknown channel', channel);
		return false;
	}
};

function tuneToReq(req, res) {
	var channel = parseInt(req.params.channel);

	if(!tuneTo(channel)) {
		res.send({
			success: false
		});
	}
	else {
		res.send({
			success: true,
			playerurl: 'http://google.de/'
		});
	}
};

function getStatus() {
	if(isTuned) {
		var channelInfo = channels.getByIdx(currentChannel);

		if(channelInfo) {
			return {
				isTuned: true,
				name: channelInfo.name,
				idx: channelInfo.idx,
			}
		}
	}
	
	return {
		isTuned: false,
	}
};

function statusReq(req, res) {
	res.send(getStatus());
};

exports.tuneTo = tuneTo;
exports.getStatus = getStatus;

exports.tuneToReq = tuneToReq;
exports.statusReq = statusReq;
