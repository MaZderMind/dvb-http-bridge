var
	fs = require('fs'),
	url = require('url'),
	http = require('http'),
	path = require('path'),
	dateFormat = require('dateformat'),
	spawn = require('child_process').spawn,
	express = require('express'),
	nodemailer = require('nodemailer'),
	mailtransport = nodemailer.createTransport(),
	RRule = require('rrule').RRule,
	digest = require('http-digest-client'),
	zap = require('./zap'),
	config = require('../config'),
	channels = require('./channels'),
	upcomingRecordings = [],
	inputRecordings = [],
	lock = false,
	isrunning = false;


function notify(title, text) {
	mailtransport.sendMail({
		from: config.mailSender,
		to: config.mailReceiver,
		subject: title,
		text: text
	});
}

exports.getSchedule = function(req, res) {
	return upcomingRecordings.map(function (recording) {
		return {
			'name': recording.name,
			'channel': recording.channel,
			'date': recording.date,
			'duration': recording.duration,
		}
	}).sort(function (a, b) {
		return a.date < b.date ? -1 : 1
	});
}

if(config.recordingsFile) {
	console.log('recordingsFile configured - installing fs.watch change listener');

	function loadRecordingsFile() {
		if(lock) return;
		lock = true;

		if(fswatcher) {
			console.log('reinstalling recordings change listener');
			fswatcher.close();
			fswatcher = fs.watch(config.recordingsFile, loadRecordingsFile);
		}

		fs.readFile(config.recordingsFile, {encoding: 'utf-8'}, function(err, filecontent) {
			if(err) {
				console.log('error reading recordings-file '+config.recordingsFile);
				return;
			}

			inputRecordings = JSON.parse(filecontent);
			planRecordings();
		});

		lock = false;
	}

	loadRecordingsFile();
	var fswatcher = fs.watch(config.recordingsFile, loadRecordingsFile);
}
else if(config.recordingsUrl) {
	console.log('recordingsUrl configured - installing http-fetch timer');

	var lastEtag = '';
	function loadRecordingsUrl() {
		if(lock) return;
		lock = true;

		var purl = url.parse(config.recordingsUrl);
		try {
			digest(config.recordingsUrlAuth[0], config.recordingsUrlAuth[1], purl.protocoll == 'https:')
				.request({
					headers: { "User-Agent": "dvb-http-bridge" },
					method: 'GET',
					host: purl.hostname,
					port: purl.port,
					path: purl.pathname,
				}, function (res) {
					res.on('error', function(e) {
						console.log('error reading recordings-url '+config.recordingsUrl+': '+e.message);
						return;
					})

					if(res.headers['etag'] == lastEtag) {
						// 'ETag did not change, not re-planning recordings
						return;
					}

					console.log("got response from recordings-url: "+res.statusCode+", ETag="+res.headers['etag']);

					lastEtag = res.headers['etag'];
					var body = '';

					res.setEncoding('utf8')
					res.on('data', function (chunk) {
						body += chunk;
					});

					res.on('end', function() {
						console.log("got "+body.length+" bytes from recordings-url");
						inputRecordings = JSON.parse(body);
						planRecordings();
					});
				});
		}
		catch(e) {
			console.log('exception during loading recordings-url: '+e);
		}

		setTimeout(loadRecordingsUrl, config.recordingsUrlInterval || 30*1000);
		lock = false;
	}

	loadRecordingsUrl();
}
else {
	console.log('no recordings list configured, not setting up a recording timer at all');
}





function planRecordings() {
	if(upcomingRecordings.length > 0)
	{
		console.log('un-planning old recordings');
		upcomingRecordings.forEach(function(recording) {
			if(recording.timeout) {
				clearTimeout(recording.timeout);
			}
		});

		upcomingRecordings = [];
	}


	console.log('planning upcoming recordings');
	var now = new Date();

	console.log('planning '+inputRecordings.length+' recording-tasks');
	inputRecordings.forEach(function(recording) {
		if(recording.date) {
			var dt = new Date(recording.date);
			console.log('single-date recording: %s at %s (%s)', recording.name, recording.channel, channels.match(recording.channel));
			if(!dt || now > dt)
			{
				console.log(' --> in the past');
				return;
			}

			recording.next = dt;
		}
		else if(recording.dates) {
			console.log(typeof recording.dates, recording.dates);
			var rrule = RRule.fromString(recording.dates);
			console.log('reoccuring recording ['+rrule.toText()+']: '+recording.name+' at '+recording.channel);

			recording.next = rrule.after(now);
		}
		else {
			console.log('recording without date: '+recording.name);
			return;
		}

		if(!recording.next.getTime())
		{
			console.log('recording with invalid date: '+recording.name);
			return;
		}

		var delta_t = recording.next.getTime() - now.getTime() - config.prebuffer;
		console.log(' --> next occurence is '+recording.next);
		console.log(' --> setting timeout to '+delta_t+'ms - '+config.prebuffer+'ms pre-buffer');
		recording.timeout = setTimeout(function() {
			recordingCallback(recording);
			planRecordings();
		}, delta_t)

		upcomingRecordings.push(recording);
	})

}


function recordingCallback(recording) {
	console.log('recordingCallback for '+recording.name);
	if(isrunning) {
		notify('Overlapping Recording', 'While trying to record '+recording.name+' I found another recording still running! Ignoring overlapping recording attempt.');
		return console.log('another recording is still running! ignoring overlapping recording attempt');
	}

	var channelidx = channels.match(recording.channel);
	if(!channelidx) {
		notify('Unknown/incorrect channel', 'ignoring unknown/incorrect channel-name in planned recording: '+recording.channel);
		return console.log('ignoring unknown/incorrect channel: '+recording.channel);
	}

	console.log('starting recording for '+recording.duration+' minutes');
	isrunning = true;

	notify(recording.name, 'recording for '+recording.name+' startet and running for '+recording.duration+' minutes now');

	var
		recordingDir = path.join(config.recordingsDir, recording.name),
		recordingFilename = dateFormat(new Date(), 'yyyy-mm-dd (dddd) HH:MM')+'.ts',
		recordingFile = path.join(recordingDir, recordingFilename);

	fs.mkdir(recordingDir, function(err) {
		var stream = fs.createWriteStream(recordingFile);

		console.log('tuning into '+recording.channel+' and adding file '+recordingFile+' to the consumers');

		zap.consumers.push(stream);
		console.log('now '+zap.consumers.length+' consumers');

		var delta_t = recording.duration * 60 * 1000;
		console.log(' --> setting end-timeout to '+delta_t+'ms');

		var endtimeout = setTimeout(function() {
			zap.consumers.splice(zap.consumers.indexOf(stream), 1);
			stream.end();
			console.log('recording ended, '+zap.consumers.length+' consumers left');

			notify(recording.name, 'recording for '+recording.name+' ended, '+
				'available at '+config.systemLink+'/recordings/'+encodeURIComponent(recording.name));

			isrunning = false;

			if(zap.consumers.length == 0)
				zap.killProcesses();
		}, delta_t)

		zap.zapTo(channelidx);
	});
}
