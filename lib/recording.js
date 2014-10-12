var
	fs = require('fs'),
	path = require('path'),
	express = require('express'),
	RRule = require('rrule').RRule,
	zap = require('./zap'),
	config = require('../config'),
	upcomingRecordings = [],
	lock = false
	isrunning = false;

loadAndPlanRecordings();

console.log('installing recordings change listener');
var fswatcher = fs.watch(config.recordingsFile, loadAndPlanRecordings);


function loadAndPlanRecordings() {
	if(lock) return;
	lock = true;

	if(fswatcher) {
		console.log('reinstalling recordings change listener');
		fswatcher.close();
		fswatcher = fs.watch(config.recordingsFile, loadAndPlanRecordings);
	}


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


	console.log('loading & planning upcoming recordings');
	fs.readFile(config.recordingsFile, {encoding: 'utf-8'}, function(err, filecontent) {
		if(err) {
			console.log('error reading recordings-file '+config.recordingsFile);
			return;
		}

		var
			now = new Date(),
			inputRecordings = JSON.parse(filecontent);


		console.log('loaded '+inputRecordings.length+' recording-tasks');
		inputRecordings.forEach(function(recording) {
			if(recording.date) {
				var dt = new Date(recording.date);
				console.log('single-date recording: '+recording.name);
				if(!dt || now > dt)
				{
					console.log(' --> in the past');
					return;
				}

				recording.next = dt;
			}
			else if(recording.dates) {
				recording.dates = RRule.fromString(recording.dates);
				console.log('reoccuring recording ['+recording.dates.toText()+']: '+recording.name);

				recording.next = recording.dates.after(now);
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

			var delta_t = recording.next.getTime() - now.getTime();
			console.log(' --> next occurence is '+recording.next);
			console.log(' --> setting timeout to '+delta_t+'ms');
			recording.timeout = setTimeout(function() {
				recordingCallback(recording);
			}, delta_t)

			upcomingRecordings.push(recording);
		})

		lock = false;
	});
}


function recordingCallback(recording) {
	console.log('recordingCallback for '+recording.name);
	if(isrunning)
		return console.log('another recording is still running! irgnoring overlapping recording attempt');

	console.log('starting recording for '+recording.duration+' minutes');
	isrunning = true;

	var recordingDir = path.join(config.recordingsDir, recording.name);
	fs.mkdir(recordingDir, function(err) {
		var recordingFile = path.join(recordingDir, (new Date()).toLocaleString()+'.ts');
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
			isrunning = false;

			if(zap.consumers.length == 0)
				zap.killProcesses();
		}, delta_t)

		zap.zapTo(recording.channel);
	});

	loadAndPlanRecordings();
}
