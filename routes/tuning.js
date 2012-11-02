var isTuned = false,
	currentChannel;

exports.tuneto = function(req, res) {
	if(isTuned)
		return res.send({success: false});

	var channel = parseInt(req.params.channel);

	console.log('Tuning to channel', channel);
	isTuned = true;

	res.send({
		success: true,
		playerurl: 'http://google.de/'
	});
};

exports.getStatus = function() {
	return isTuned ? {name: currentChannel, idx: currentChannel} : false;
};

exports.status = function(req, res) {
	
};
