module.exports = {
	port: 5885,
	systemLink: 'http://hostname:5885',

	prebuffer: 30000, // ms

	mailSender: 'DVB-HTTP-Bridge <dvb@yourdomain.test>',
	mailReceiver: 'Your Name <yourname@yourdomain.test>',

	dvrDevice: '/dev/dvb/adapter0/dvr0',
	channelFile: 'data/channels.conf',
	zapTimeout: 5000, //ms

	// you can only have on of the two configured
	// file get's watched by a file-watch, url will be polled twice a minute
	recordingsFile: 'data/recordings.json',
	//recordingsUrl: 'http://data/recordings.json',
	//recordingsUrlAuth: ['admin', 'admin'],
	//recordingsUrlInterval: 30*1000,

	recordingsDir: '/video/',
}
