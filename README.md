# DVB/HTTP Bridge
A really, really simple Node-App used to control the [http://www.linuxtv.org/wiki/index.php/LinuxTV_dvb-apps dvb-apps] via HTTP.

# Idea
In Idle state, [http://www.amazon.de/Technisat-Skystar-DVB-S-TV-Karte-Fernbedien-Set/dp/B0000E3IAF the receiver] is in powersafe-mode. A Visitor can get a list of Channels. By selecting clicking on a link the receiver tunes to that channel and the Node-App streams the MPEG2-Transport-Stream to a URL where a Web-Player (<video>-Tag?) can play back the stream. Optionally some reencode could occur. Another visitor is able to join the Channel but the Channel remains the same as long a Visitor is watching it.
