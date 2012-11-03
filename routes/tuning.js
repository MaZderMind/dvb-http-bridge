var channels = require(app.path('routes/channels'));

var isTuned = false,
	currentChannel;

function tuneTo(channel) {
	console.log('Tuning to channel', channel);
	currentChannel = channel;
	isTuned = true;

	return true;
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
