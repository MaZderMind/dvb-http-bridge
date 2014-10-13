module.exports = {
	port: 5885,
	systemLink: 'http://hostname:5885',

	mailSender: 'DVB-HTTP-Bridge <dvb@yourdomain.test>',
	mailReceiver: 'Your Name <yourname@yourdomain.test>',

	dvrDevice: '/dev/dvb/adapter0/dvr0',
	channelFile: 'data/channels.conf',
	zapTimeout: 5000, //ms

	recordingsFile: 'data/recordings.json',
	recordingsDir: '/video/',
}
