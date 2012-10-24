#!/bin/sh

# Logo-Filenames
logos="ss/sat1.png pp/pro_sieben_de.png kk/kabel_eins.png aa/ard_das_erste.png zz/zdf_de.png rr/rtl_de.png vv/vox_de.png rr/rtl_nitro_de.png rr/rtl2_de.png aa/arte_de.png num/3sat.png zz/zdf_info.png zz/zdf_neo.png ss/sixx.png dd/das_vierte.png aa/anixe_hd.png ss/swr_fernsehen_rp.png ww/wdr_studio_bielefeld.png aa/ard_eins_plus.png"

# TODO: add retina
mkdir -p hires lores

# Downlaod and convert Logos
for logo in $logos; do
	# naked filename
	base=$(basename $logo)

	# download image
	wget -nv http://www.lyngsat-logo.com/hires/$logo -O hires/$base

	# generate lowres version
	gm convert hires/$base -resize 150x150 lores/$base
done
