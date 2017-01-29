#!/bin/sh

# Logo-Filenames
logos="\
 ss/sat1.png\
 pp/pro_sieben_de.png\
 kk/kabel_eins_de.png\
 aa/ard_das_erste.png\
 zz/zdf_de.png\
 rr/rtl_de.png\
 vv/vox_de.png\
 rr/rtl_nitro_de.png\
 rr/rtl2_de.png\
 aa/arte_de.png\
 num/3sat.png\
 zz/zdf_info.png\
 zz/zdf_neo.png\
 ss/sixx.png\
 dd/disney_channel_de.png
 aa/anixe_hd.png\
 ss/swr_fernsehen_rp.png\
 ww/wdr_studio_wuppertal.png\
 aa/ard_eins_plus.png\
 bb/br_sud.png\
 mm/mdr_fernsehen_de.png\
 nn/ndr_fernsehen.png\
 aa/ard_eins_festival.png\
 hh/hr_fernsehen_de.png\
 nn/ntv_de.png\
 nn/n24_de.png\
 pp/phoenix_de.png\
 rr/rbb_berlin.png\
 ss/super_rtl_de.png\
 tt/tagesschau24.png\
 zz/zdf_kultur.png\
 tt/tele5_de.png\
"

# Downlaod and convert Logos
for logo in $logos; do
	# naked filename
	base=$(basename $logo)

	# download image
	#wget -nv http://www.lyngsat-logo.com/hires/$logo -O $base
	wget -nv --user-agent="Logo-Downloader for DVB-to-HTTP-Brige <https://github.com/MaZderMind/dvb-http-bridge>" --header 'Referer: https://www.lyngsat-logo.com/tv/' \
		https://www.lyngsat-logo.com/logo/tv/$logo -O $base
done
