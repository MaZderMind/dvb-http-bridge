var channels = require(app.path('routes/channels'));

var isTuned = false,
	currentChannel;

function tuneTo(channel, cb) {
	setTimeout(function() {
		currentChannel = channel;
		isTuned = true;
		cb(true);
	}, 1000);
};

function tuneToReq(req, res) {
	var channel = parseInt(req.params.channel);
	var channelInfo = channels.getByIdx(channel);
	
	function sendResponse(success)
	{
		if(success) {
			res.send({
				success: true,

				isTuned: true,
				idx: channelInfo.idx,
				name: channelInfo.name
			});
		}
		else {
			if(isTuned) {
				var currentChannelInfo = channels.getByIdx(currentChannel);
				res.send({
					success: false,

					isTuned: true,
					idx: currentChannelInfo.idx,
					name: currentChannelInfo.name
				});
			}
			else {
				res.send({
					success: false,
					isTuned: false
				});
			}
		}
	}

	if(!channelInfo) {
		console.log('Not tuning to unknown channel', channel);
		sendResponse(false);
	}
	else {
		console.log('Tuning to channel', channel, channelInfo.name);
		tuneTo(channel, sendResponse);
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
exports.getStatus = getStatus;

exports.tuneToReq = tuneToReq;
exports.statusReq = statusReq;
