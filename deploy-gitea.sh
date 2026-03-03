#!/bin/sh
CSS_DEST=/var/lib/gitea/custom/public/assets/css/theme-homepage.css
TMPL_DEST=/var/lib/gitea/custom/templates/base/head_navbar.tmpl

rsync -av static/other/gitea.css "root@bocken.org:$CSS_DEST"
rsync -av static/other/gitea_head_navbar.tmpl "root@bocken.org:$TMPL_DEST"
ssh root@bocken.org "chown gitea:gitea '$CSS_DEST' '$TMPL_DEST'"
