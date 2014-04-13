# DVB/HTTP Bridge
A really, really simple Node-App used to control the [dvb-apps](http://www.linuxtv.org/wiki/index.php/LinuxTV_dvb-apps) via HTTP.

# Idea
In Idle state, [the receiver](http://www.amazon.de/Technisat-Skystar-DVB-S-TV-Karte-Fernbedien-Set/dp/B0000E3IAF) is in powersafe-mode. A Visitor can get a list of Channels. By clicking on a Channel-Logo, the receiver tunes to that channel and the Node-App streams the MPEG2-Transport-Stream to a Player can play back the stream.
