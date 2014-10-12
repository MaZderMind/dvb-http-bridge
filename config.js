module.exports = {
	port: 5885,

	dvrDevice: '/dev/dvb/adapter0/dvr0',
	channelFile: 'data/channels.conf',
	zapTimeout: 5000, //ms

	recordingsFile: 'data/recordings.json',
	recordingsDir: '/video/',
}
