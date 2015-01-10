# DVB/HTTP Bridge
At home we have Satelite-TV (DVBS). The Base-Goal that lead to this Project was to be able to watch TV on iPhones and iPads and possibly to more later on.I'm sure there are some neat finished solutions for parts of this task but it was a nice learning process to do it all myself and it worked for close to a year now on a day-to-day usage.

# Hardware
I have a very lowlevel and old [VIA EPIA](http://de.wikipedia.org/wiki/EPIA) mainboard with a [PicoPSU](http://www.mini-box.com/s.nl/sc.8/category.13/.f) and a [P-ATA-Flash Module](http://de.transcend-info.com/Products/no-531). It was running for some Time as IPv6 Bridge here anyway and had a free PCI-Socket (yes, it's that old technology), so I added a [Technisat Skystar DVBS](http://www.amazon.de/Technisat-Skystar-DVBS-TV-Karte-Fernbedien-Set/dp/B0000E3IAF) card. I guess nowadays you would use a [BeagleBone Black](http://www.amazon.de/BeagleBone-Beagleboard-Black-Cortex-Speicher/dp/B00CO3MZCW) and a DVBS-USB adapter, although I can't find one at the moment. Anyway, as long as the DVBS-Adapter is recognized by your Linux-Kernel any device should work, because the application does not need any substantial amount of CPU powrer.

# Process/Dataflow
After copying [config.js.tpl](config.js.tpl) and starting [dvb-http-bridge.js](dvb-http-bridge.js) with node, the Application serves a list of Channel-Icons via HTTP, usually on port 5885. Which channels are diaplayed is configured by [public/favs.json](public/favs.json). Also there is a Script [public/images/channels/fetch.sh](public/images/channels/fetch.sh) which downloads the Channel-Logos from [www.lyngsat-logo.com](http://www.lyngsat-logo.com/).

It also exposes some API-Calls like http://fluxbox:5885/channels.

The Channel-Logos are Linked to URLs like http://hostname:5885/zap/274 where the number is a line-number into the /channels API-Call (alternatively you can also request /zap/ZDF but there may be multiple channels with the same name). The /zap/274 request invokes the szap utility from the [dvb-apps](http://www.linuxtv.org/wiki/index.php/LinuxTV_dvb-apps) package to tune the receiver-card onto the correct channel. The app then opens a ffmpeg-process which reads from the configures dvr-Device (for example /dev/dvb/adapter0/dvr0) and remuxes the mpeg-ts, remove PMT, PAT, Teletext and other things that can disturbed not so well behaved player software. It also removes FEC-Data and maybe applies it where neccessary. The ffmpeg-Process packs the MPEG2-Video and the MP2-Videos that survives this process into a new TS-Stream and delivers it to the still standing HTTP connection. As soon as the connection is closed, the app kills the ffmpeg-process and switches the Receiver-Card to idle.

This very simple setup allows one to test do lot of things in a very uncomplicated way, for example you can simply record that's currently running on SAT.1 by calling

    curl http://hostname:5885/zap/SAT-1 > SAT-1.ts

which will give you a perfectly fine TS-File from the current TV-Program. You can stop recording by simply Ctrl-C'ing the curl away which will also close the Receiver because of the now closed HTTP/TCP connection.

To watch TV on a linux box you can simply call

    ffplay http://hostname:5885/zap/ProSieben

or paste that URL into your VLC or whatever. Now special Control-Protocol required or involved.

# On the mobile Device
As $iDevices can't play MPEG2 or MP2 natively i used [GoodPlayer](https://itunes.apple.com/de/app/goodplayer/id416756729?mt=8) for iOS which does CPU-Decoding and can also Deinterlace the interlaced DVBS-Signal. It was testet to run smooth on an iPhone 4s, iPhone 5, iPhone 5s, iPad 3 and iPad Mini. There may be other Apps like [VLC for iOS](https://itunes.apple.com/us/app/vlc-videolan-media-player/id934665924?mt=8) that may work well for your, too.

Because all URLs look like regular http-URLs iOS would try to download them first, which is not what we want, so I addes a small hack into [public/js/app.js](public/js/app.js) hat prepands an 'goodplayer://'-Prefix to the URLs when the OS looks like an iOS. This way the correct Programm ist invoked when a channel logo is clicked.

# Recording
I implemented a simple recording Feature which just pumps the remuxed ts-stream through another ffmpeg which remuxes it into an program-stream mpeg-File which allows for better seeking -- although this is a point that needs further research. The recording is in its simplest form controlled by [data/recordings.json](data/recordings.json) which is monitored with a [fs.watch](http://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener), so that editing the file in a Texteditor will make the application recalculate the Recording-Timeouts.

The files are written to the folder specified in the config. The contents of the folder is then served under http://hostname:5885/recordings.
Currently the dvb-bridge sends a Mail when a recording starts or ends. The Mails are sent using the standard unix mail-system. I guess it connects to localhost:25 where a local MTA should listen.

# CalDAV-Server
For a more convenient setup I installed a [SabreDAV Server](http://sabre.io/). SabreDAV is a PHP Library that works great with Apache. I found that it works best in its on VHost listening on Port 6996, for example. [Download](https://github.com/fruux/sabre-dav/releases) and unzip it somewhere you're convenient with, copy the contents of [sabredav-server](sabredav-server) into the root folder and point your Apache-VHost there.

The Plugin in [plugins/json-export.php](plugins/json-export.php) adds a new call to your SabreDAV-Server (http://hostname:6996/recordings.json) which is called regularly from the dvb-bridge-app when you configure a ```recordingsUrl``` in your config. This way you can plan recordings via you iOS calendar app. I usually export them from the [OnAir TV-Guide](https://itunes.apple.com/de/app/on-air-tv-programm-fernsehzeitung/id336137568?mt=8) which conveniently places the Channel-Name into the Location-Field which is in turn interpreted by the dvb-bridge.
