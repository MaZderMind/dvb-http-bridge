var
	express = require('express'),
	async = require('async'),
	spawn = require('child_process').spawn,
	config = require('../config'),
	channels = require('./channels'),

	router = exports.router = express.Router(),
	consumers = exports.consumers = [],

	active = null;

router.use(/\/zap\/(.*)/, function(req, res, next) {
	var channelidx = channels.match(req.params[0]);
	if(!channelidx)
		return res.status(404).set('Content-Type', 'text/plain').send('channel '+req.params[0]+' is no valid channel name/number');

	if(active)
		return res.status(423).send('another session is currently active for '+channels.names[active.channel-1]+', you may access /co-watch to join that session');


	consumers.push(
		res.set('Content-Type', 'video/M2TS')
	)
	console.log('adding '+req.ip+' to the list of consumers, now '+consumers.length+' consumers');

	zapTo(channelidx)

	req.on('close', function() {
		consumers.splice(consumers.indexOf(res), 1);

		if(consumers.length == 0)
			killProcesses()
	})
})

router.use('/co-watch', function(req, res, next) {
	if(!active)
		return res.status(400).send('request for /co-watch without a running session');


	consumers.push(
		res.set('Content-Type', 'video/M2TS')
	)
	console.log('adding '+req.ip+' to the list of consumers, now '+consumers.length+' consumers');

	req.on('close', function() {
		consumers.splice(consumers.indexOf(res), 1);

		if(consumers.length == 0)
			killProcesses()
	})
})

router.use('/state', function(req, res, next) {
	res.json({
		state: active ? 'active' : 'idle',
		consumers: consumers.length,
		channel: active ? active.channel : null,
		channelname: active ? channels.names[active.channel-1] : null
	});
})



function zapTo(idx) {
	killProcesses(function() {
		console.log('remux & zap closed, restarting with new channel #'+idx)

		active = {}
		active.channel = idx;
		active.remux = spawn(
			'avconv',
			[
				'-probesize', 800000, 
				'-fpsprobesize', 800000, 
				'-analyzeduration', 10000000, 
				'-i', config.dvrDevice, 
				'-c', 'copy', 
				'-f', 'mpegts', 
				'-'
			], {
				stdio: ['ignore', 'pipe', process.stderr]
			}
		)

		active.zap = spawn(
			'szap',
			[
				'-c', config.channelFile,
				'-rHn', idx
			], {
				stdio: 'ignore'
			}
		)

		active.remux.stdout.on('data', function(chunk) {
			consumers.forEach(function(consumer) {
				consumer.write(chunk)
			})
		})
	})
}

function killProcesses(killedCb) {
	console.log('killing potentially running remux & zap processes');
	async.series([
		function(cb) {
			if(!active || !active.remux)
				return cb();

			console.log('closing remux');
			//activeRemux.on('close', function() {
			//	console.log('remux closed');
			//	activeRemux = null;
			//	cb();
			//})
			active.remux.kill('SIGKILL');
			active.remux = null;
			cb();
		},

		function(cb) {
			if(!active || !active.zap)
				return cb();

			console.log('closing zap');
			active.zap.on('close', function() {
				console.log('zap closed');
				active.zap = null;
				cb();
			})
			active.zap.kill();
		}
	], function() {
		console.log("remux & zap closed, now idle");
		active = null;

		if(killedCb) killedCb();
	});
}

exports.zapTo = zapTo;
exports.killProcesses = killProcesses;
