var
	zap = require('./lib/zap'),
	recording = require('./lib/recording'),
	channels = require('./lib/channels'),
	config = require('./config'),
	morgan = require('morgan'),
	express = require('express'),

	serveStatic = require('serve-static'),
	serveIndex = require('serve-index'),
	app = express();


app.use(morgan('dev'))
app.use('/help', function(req, res, next) {
	res.set('Content-Type', 'text/plain').send([
		'/channels -> returns a list of available channel names',
		'/status -> returns current system status. # indicates idle, : indicates tuned-in into channel',
		'/zap/<channel> -> tunes into the specified channel and returns its stream-data. <channel> can either be a channel name or its line-number',
		//'/schedule -> list upcoming recording-events by date',
		'/recordings -> list all recordedings with at least one existing file',
		'/recordings/<recording> -> list files for the specified recordeding'
	].join("\n"))
})

app.use('/channels', function(req, res, next) {
	res.set('Content-Type', 'text/plain').send(channels.names.join("\n"))
})

app.use('/recordings', [
	serveStatic(config.recordingsDir),
	serveIndex(config.recordingsDir, {
		view: 'details',
		template: 'public/directory.html'
	})
])

app.use('/schedule.json', function(req, res, next) {
	res.set('Content-Type', 'application/json').send(recording.getSchedule())
})

app.use(zap.router)
//app.use(recording.router)

app.use(
	serveStatic('./public')
)

console.log('Listening to [::]:'+config.port)
app.listen(config.port, '::')
